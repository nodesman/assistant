
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AIManager } from './src/AIManager';
import { Config } from './src/Config';
import { Project, Task } from './src/types';

const execPromise = promisify(exec);

// --- CONFIGURATION ---
const TEMP_FILE_PATH = path.join(__dirname, 'temp_project_dump.txt');
const OUTPUT_FILE_PATH = path.join(__dirname, 'imported_projects.json');
const SUBLIME_PATH = 'subl -w'; // Assumes 'subl' is in your system's PATH

/**
 * The prompt sent to Gemini to parse a single project chunk.
 * @param textChunk - A string containing a single project and its notes/tasks.
 */
const createPromptForChunk = (textChunk: string): string => `
You are an expert text parser. Your task is to analyze the following text chunk, which represents a single project from a larger document, and convert it into a structured JSON object.

**Rules for Parsing:**

1.  **Project Identification:** The first line of the text is the project's "title".
2.  **Body Content:** All subsequent lines that are not identifiable as tasks should be aggregated into the project's "body".
3.  **Task Identification:** Lines that represent actionable items should be converted into task objects.
    *   A task must have a "title".
    *   The task's "status" should be set to "To Do" by default unless otherwise specified.
    *   The task's "body" can be empty.
4.  **Output Format:** You MUST return ONLY a single, clean JSON object with the following structure: { "project": Project, "tasks": Task[] }. Do not wrap it in markdown or add any explanatory text.

**Example Input:**
\`\`\`
My Big Project
  - Some notes about the project.
  - This is the first task.
  - This is another task with some details.
\`\`\`

**Example JSON Output:**
\`\`\`json
{
  "project": {
    "title": "My Big Project",
    "body": "- Some notes about the project."
  },
  "tasks": [
    {
      "title": "This is the first task.",
      "body": "",
      "status": "To Do"
    },
    {
      "title": "This is another task with some details.",
      "body": "",
      "status": "To Do"
    }
  ]
}
\`\`\`

**Text to Parse:**
---
${textChunk}
---
`;

/**
 * Splits the full text dump into chunks, where each chunk is a project.
 * Assumes that any line with 0 indentation is the start of a new project.
 * @param fullText - The complete string from the temp file.
 */
function splitTextIntoChunks(fullText: string): string[] {
    const lines = fullText.split('\n');
    const chunks: string[] = [];
    let currentChunk: string[] = [];

    for (const line of lines) {
        const isTopLevel = line.trim().length > 0 && !line.startsWith(' ') && !line.startsWith('\t');

        if (isTopLevel && currentChunk.length > 0) {
            chunks.push(currentChunk.join('\n'));
            currentChunk = [line];
        } else if (line.trim().length > 0) {
            currentChunk.push(line);
        }
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'));
    }

    return chunks;
}

/**
 * Main function to orchestrate the import process.
 */
async function runBulkImport() {
    console.log('Initializing AI Manager...');
    const config = await Config.getInstance();
    const aiManager = new AIManager(config.get().ai);

    console.log(`A temporary file will be created at: ${TEMP_FILE_PATH}`);
    await fs.writeFile(TEMP_FILE_PATH, '# Paste your entire text dump here.\n# Save and close this file to continue the import process.\n');

    console.log('Opening file in Sublime Text. Please paste your content, save, and close the file.');
    try {
        await execPromise(`${SUBLIME_PATH} "${TEMP_FILE_PATH}"`);
    } catch (error) {
        console.error(`Error opening Sublime Text. Please ensure '${SUBLIME_PATH}' is a valid command.`);
        console.error('If Sublime Text is not in your PATH, you may need to provide the full path to the executable.');
        await fs.unlink(TEMP_FILE_PATH); // Clean up temp file
        return;
    }

    console.log('File closed. Reading content...');
    const fileContent = await fs.readFile(TEMP_FILE_PATH, 'utf-8');
    await fs.unlink(TEMP_FILE_PATH); // Clean up temp file immediately

    const chunks = splitTextIntoChunks(fileContent);
    console.log(`Identified ${chunks.length} potential project chunks.`);

    const allProjects: Project[] = [];
    const allTasks: Task[] = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const projectTitle = chunk.split('\n')[0].trim();
        console.log(`[${i + 1}/${chunks.length}] Processing project: "${projectTitle}"...`);

        const prompt = createPromptForChunk(chunk);
        const response = await aiManager.generateChatResponse(
            [{ role: 'user', content: prompt }],
            'gemini-2.5-pro-preview-03-25' // Using Gemini 2.5 Pro as requested
        );

        if (response) {
            try {
                const cleanedResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(cleanedResponse) as { project: Project, tasks: Task[] };

                if (parsed.project && parsed.project.title) {
                    const newProject: Project = {
                        id: '', // Will be populated by the database
                        title: parsed.project.title,
                        body: parsed.project.body || '',
                        tasks: []
                    };

                    if (parsed.tasks && Array.isArray(parsed.tasks)) {
                        newProject.tasks = parsed.tasks.map(t => ({
                            id: '', // Will be populated by the database
                            title: t.title,
                            body: t.body || '',
                            status: t.status || 'To Do'
                        }));
                    }
                    
                    allProjects.push(newProject);
                    console.log(`  -> Successfully extracted project and ${newProject.tasks.length} tasks.`);
                } else {
                    console.warn(`  -> WARNING: Could not parse a valid project from chunk starting with "${projectTitle}"`);
                }
            } catch (e) {
                console.error(`  -> ERROR: Failed to parse JSON response for chunk "${projectTitle}".`, e);
                console.error('  -> Raw Response:', response);
            }
        } else {
            console.error(`  -> ERROR: No response from AI for chunk "${projectTitle}".`);
        }
    }

    await fs.writeFile(OUTPUT_FILE_PATH, JSON.stringify(allProjects, null, 2));
    console.log(`\n✅ Success! All data has been extracted and saved to: ${OUTPUT_FILE_PATH}`);
}

runBulkImport().catch(console.error);
