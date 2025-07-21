// src/TextParser.ts
import { AIManager } from './AIManager';
import { Project, Task } from './types';

export class TextParser {
    private aiManager: AIManager;

    constructor(aiManager: AIManager) {
        this.aiManager = aiManager;
    }

    async parseText(text: string): Promise<{ projects: Project[], tasks: Task[] }> {
        const prompt = `
You are an expert text parser specializing in converting unstructured, hierarchical text into a structured JSON format. Analyze the following text, which is formatted like a WorkFlowy or outline document.

Your primary goal is to return a clean JSON object with two keys: "projects" and "tasks".

**Rules for Parsing:**

1.  **Hierarchy:** The text is an outline. Indentation indicates a parent-child relationship. An indented item is a sub-item of the non-indented item above it.
2.  **Projects:** Top-level items (those with no indentation) are considered "projects". The project's "title" is the text of that line. All indented text below it, until the next top-level item, constitutes the project's "body" or contains its tasks.
3.  **Kanban Boards:**
    *   If an item within a project is named "Board", treat its sub-items ("Pending", "Doing", "Done", "Ready", etc.) as Kanban-style status lists.
    *   Any items indented under these status lists are "tasks".
    *   Assign the task's "status" based on the list it's under (e.g., items under "Pending" have status "To Do", items under "Doing" have status "In Progress", and items under "Done" have status "Done").
4.  **Tasks vs. Notes:**
    *   Items that appear to be actionable to-dos should be treated as "tasks".
    *   Descriptive text, journal entries (often marked with dates), or general notes should be considered part of the parent project's "body" and NOT converted into tasks.
5.  **Output Structure:**
    *   A "project" must have a "title" (string) and a "body" (string). The body should contain all non-task text associated with the project.
    *   A "task" must have a "title" (string), a "body" (string, which can be empty), and a "status" ('To Do', 'In Progress', or 'Done').
    *   Crucially, associate tasks with their parent project by adding a "projectName" property to the task object, matching the project's title exactly.

Here is the text to parse:
---
${text}
---
        `;

        const response = await this.aiManager.generateChatResponse(
            [{ role: 'user', content: prompt }],
            'gemini-2.5-flash'
        );
        if (response) {
            try {
                // Clean the response to ensure it's valid JSON
                const cleanedResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(cleanedResponse);
            } catch (error) {
                console.error('Error parsing AI response for text parsing:', error);
                return { projects: [], tasks: [] };
            }
        }
        return { projects: [], tasks: [] };
    }
}
