import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Project, Task, ChatMessage } from './types';
import { spawn } from 'child_process';
import { Config } from './Config';
import inquirer from 'inquirer';
import { AIManager } from './AIManager';
import { v4 as uuidv4 } from 'uuid';

export class ProjectManager {
    private projectsDir: string;
    private config: Config;
    private aiManager: AIManager;

    constructor(config: Config, projectsDir: string = 'projects') {
        this.projectsDir = path.resolve(process.cwd(), projectsDir);
        this.config = config;
        this.aiManager = new AIManager(this.config.get().ai);
    }

    async createProjectsFromTextBlock(textBlock: string): Promise<void> {
        console.log('Asking the AI to parse the text for projects...');
        const prompt = `Please parse the following text and extract a list of projects. Each project should have a "title" and a "body". Return the output as a JSON array of objects in the format: [{"title": "Project 1", "body": "Description of project 1"}, {"title": "Project 2", "body": "Description of project 2"}].

Here is the text to parse:
---
${textBlock}
---`;

        const conversationHistory: ChatMessage[] = [{ role: 'user', content: prompt }];
        const response = await this.aiManager.generateChatResponse(conversationHistory);

        if (response) {
            try {
                const projects = JSON.parse(response) as { title: string; body: string }[];
                for (const projectData of projects) {
                    const project: Project = {
                        title: projectData.title,
                        body: projectData.body,
                        tasks: [],
                    };
                    const fileName = `${project.title.toLowerCase().replace(/\s+/g, '_')}.yml`;
                    const filePath = path.join(this.projectsDir, fileName);
                    await fs.writeFile(filePath, yaml.dump(project), 'utf8');
                    console.log(`Project "${project.title}" created successfully at ${filePath}`);
                }
            } catch (error) {
                console.error('Error parsing the AI response:', error);
                console.log('Raw AI response:', response);
            }
        } else {
            console.log('The AI did not return a response.');
        }
    }
    private async ensureProjectsDirExists(): Promise<void> {
        try {
            await fs.mkdir(this.projectsDir, { recursive: true });
        } catch (error) {
            console.error(`Error creating projects directory at ${this.projectsDir}:`, error);
            throw error;
        }
    }

    async createProjectFromTemplate(): Promise<void> {
        await this.ensureProjectsDirExists();
        const template = `# --- Create a new Project ---
# Please fill in the details for your new project below.
# Lines starting with '#' will be ignored.
# Save and close this file when you are done.

title: 
# Type the project title above

body: |-
# Type the project body/description above (you can use multiple lines)
`;
        const tempFilePath = path.join(this.projectsDir, '.new_project.tmp');
        await fs.writeFile(tempFilePath, template, 'utf8');

        try {
            await this.openInEditor(tempFilePath);
            const content = await fs.readFile(tempFilePath, 'utf8');
            const parsed = this.parseTemplate(content);

            if (parsed.title) {
                const project: Project = {
                    title: parsed.title,
                    body: parsed.body,
                    tasks: [],
                };
                const fileName = `${parsed.title.toLowerCase().replace(/\s+/g, '_')}.yml`;
                const filePath = path.join(this.projectsDir, fileName);
                await fs.writeFile(filePath, yaml.dump(project), 'utf8');
                console.log(`Project "${parsed.title}" created successfully at ${filePath}`);
            } else {
                console.log('Project creation cancelled: Title was not provided.');
            }
        } catch (error) {
            console.error('Error during project creation:', error);
        } finally {
            await fs.unlink(tempFilePath);
        }
    }

    private parseTemplate(content: string): { title: string; body: string } {
        const lines = content.split('\n');
        let title = '';
        let body = '';
        let isBody = false;

        for (const line of lines) {
            if (line.startsWith('title:')) {
                isBody = false;
                title = line.substring('title:'.length).trim();
            } else if (line.startsWith('body: |-')) {
                isBody = true;
            } else if (isBody && !line.startsWith('#')) {
                body += line + '\n';
            }
        }
        return { title, body: body.trim() };
    }

    async manageExistingProject(): Promise<void> {
        const projects = await this.getAllProjects();
        if (projects.length === 0) {
            console.log('No projects found. Please create a project first.');
            return;
        }

        const projectChoices = projects.map(p => ({ name: p.title, value: p.title }));

        const { projectTitle } = await inquirer.prompt([
            {
                type: 'list',
                name: 'projectTitle',
                message: 'Select a project to manage',
                choices: [...projectChoices, new inquirer.Separator(), 'Back'],
            },
        ]);

        if (projectTitle === 'Back') {
            return;
        }

        const project = projects.find(p => p.title === projectTitle);
        if (project) {
            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: `What would you like to do with "${project.title}"?`,
                    choices: ['Edit Project Details', 'Add a Task', 'Manage Tasks (Kanban)', new inquirer.Separator(), 'Back'],
                },
            ]);

            switch (action) {
                case 'Edit Project Details':
                    await this.editProjectDetails(project);
                    break;
                case 'Add a Task':
                    await this.addTaskToProject(project);
                    break;
                case 'Manage Tasks (Kanban)':
                    await this.manageTasks(project);
                    break;
                case 'Back':
                    return;
            }
        }
    }

    async editProjectDetails(project: Project): Promise<void> {
        const fileName = `${project.title.toLowerCase().replace(/\s+/g, '_')}.yml`;
        const filePath = path.join(this.projectsDir, fileName);
        try {
            await this.openInEditor(filePath);
            console.log(`Finished editing "${project.title}".`);
        } catch (error) {
            console.error(`Error opening editor for ${project.title}:`, error);
        }
    }

    async addTaskToProject(project: Project): Promise<void> {
        const { title, body } = await inquirer.prompt([
            { type: 'input', name: 'title', message: 'Task title:' },
            { type: 'input', name: 'body', message: 'Task body:' },
        ]);

        if (!title) {
            console.log('Task creation cancelled: Title was not provided.');
            return;
        }

        const newTask: Task = { title, body, status: 'To Do' };
        if (!project.tasks) {
            project.tasks = [];
        }
        project.tasks.push(newTask);

        const fileName = `${project.title.toLowerCase().replace(/\s+/g, '_')}.yml`;
        const filePath = path.join(this.projectsDir, fileName);
        await fs.writeFile(filePath, yaml.dump(project), 'utf8');
        console.log(`Task "${title}" added to project "${project.title}"`);
    }

    async manageTasks(project: Project): Promise<void> {
        let needsSave = false;
        while (true) {
            this.displayKanbanBoard(project);
            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: 'Kanban Actions',
                    choices: ['Move Task', 'Add Task', new inquirer.Separator(), 'Save and Exit', 'Exit without Saving'],
                },
            ]);

            switch (action) {
                case 'Move Task':
                    await this.moveTask(project);
                    needsSave = true;
                    break;
                case 'Add Task':
                    await this.addTaskToProject(project);
                    needsSave = true;
                    break;
                case 'Save and Exit':
                    const fileName = `${project.title.toLowerCase().replace(/\s+/g, '_')}.yml`;
                    const filePath = path.join(this.projectsDir, fileName);
                    await fs.writeFile(filePath, yaml.dump(project), 'utf8');
                    console.log('Project saved.');
                    return;
                case 'Exit without Saving':
                    if (needsSave) {
                        const { confirm } = await inquirer.prompt([{
                            type: 'confirm',
                            name: 'confirm',
                            message: 'You have unsaved changes. Are you sure you want to exit?',
                            default: false
                        }]);
                        if (!confirm) continue;
                    }
                    return;
            }
        }
    }

    private displayKanbanBoard(project: Project): void {
        console.log(`\n--- Kanban Board: ${project.title} ---`);
        const columns: { [key: string]: Task[] } = {
            'To Do': [],
            'In Progress': [],
            'Done': [],
        };

        (project.tasks || []).forEach(task => {
            if (columns[task.status]) {
                columns[task.status].push(task);
            }
        });

        for (const status in columns) {
            console.log(`\n--- ${status} ---`);
            if (columns[status].length === 0) {
                console.log('(empty)');
            } else {
                columns[status].forEach(task => console.log(`- ${task.title}`));
            }
        }
        console.log('\n---------------------------------\n');
    }

    private async moveTask(project: Project): Promise<void> {
        if (!project.tasks || project.tasks.length === 0) {
            console.log('No tasks to move.');
            return;
        }

        const { taskTitle } = await inquirer.prompt([
            {
                type: 'list',
                name: 'taskTitle',
                message: 'Select a task to move',
                choices: project.tasks.map(t => t.title),
            },
        ]);

        const task = project.tasks.find(t => t.title === taskTitle);
        if (!task) return;

        const { newStatus } = await inquirer.prompt([
            {
                type: 'list',
                name: 'newStatus',
                message: `Move "${task.title}" to which status?`,
                choices: ['To Do', 'In Progress', 'Done'],
                default: task.status,
            },
        ]);

        task.status = newStatus;
        console.log(`Task "${task.title}" moved to ${newStatus}.`);
    }

    async getAllProjects(): Promise<Project[]> {
        await this.ensureProjectsDirExists();
        const projectFiles = await fs.readdir(this.projectsDir);
        const projects: Project[] = [];

        for (const projectFile of projectFiles) {
            if (path.extname(projectFile).match(/\.ya?ml$/)) {
                const filePath = path.join(this.projectsDir, projectFile);
                try {
                    const fileContent = await fs.readFile(filePath, 'utf8');
                    const projectData = yaml.load(fileContent) as Project;
                    if (projectData && projectData.title) {
                        projects.push(projectData);
                    }
                } catch (error) {
                    console.error(`Error reading or parsing project file ${projectFile}:`, error);
                }
            }
        }
        return projects;
    }

    async getProjectsAsContext(): Promise<string> {
        const projects = await this.getAllProjects();
        if (projects.length === 0) {
            return 'No projects found.';
        }

        let context = 'Here are the current projects and their tasks:\n\n';
        for (const project of projects) {
            context += `Project: ${project.title}\n`;
            context += `Description: ${project.body || 'N/A'}\n`;

            if (project.tasks && project.tasks.length > 0) {
                context += 'Tasks:\n';
                for (const task of project.tasks) {
                    context += `  - Task: ${task.title}
`;
                    context += `    Description: ${task.body || 'N/A'}
`;
                    if (task.estimated_duration_minutes) context += `    Estimated Duration: ${task.estimated_duration_minutes} minutes
`;
                    if (task.min_block_minutes) context += `    Min Block: ${task.min_block_minutes} minutes
`;
                    if (task.max_block_minutes) context += `    Max Block: ${task.max_block_minutes} minutes
`;
                    if (task.due_date) context += `    Due Date: ${task.due_date}
`;
                    if (task.status) context += `    Status: ${task.status}
`;
                    if (task.priority) context += `    Priority: ${task.priority}
`;
                }
            }
            context += '\n---\n\n';
        }
        return context;
    }

    private openInEditor(filePath: string): Promise<void> {
        const editor = this.config.get().editor_command;
        return new Promise((resolve, reject) => {
            const editorProcess = spawn(editor, [filePath], {
                stdio: 'inherit',
                shell: true
            });

            editorProcess.on('exit', (code: number | null) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Editor closed with non-zero exit code: ${code}`));
                }
            });

            editorProcess.on('error', (err: Error) => {
                reject(err);
            });
        });
    }

    async addTask(projectId: string, taskData: Partial<Task>): Promise<void> {
        const projects = await this.getAllProjects();
        const project = projects.find(p => p.id === projectId);
        if (project) {
            const newTask: Task = {
                id: uuidv4(),
                ...taskData,
            } as Task;
            project.tasks.push(newTask);
            await this.saveProject(project);
        }
    }

    async updateTask(taskId: string, taskData: Partial<Task>): Promise<void> {
        const projects = await this.getAllProjects();
        for (const project of projects) {
            const taskIndex = project.tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                project.tasks[taskIndex] = { ...project.tasks[taskIndex], ...taskData };
                await this.saveProject(project);
                return;
            }
        }
    }

    async deleteTask(taskId: string): Promise<void> {
        const projects = await this.getAllProjects();
        for (const project of projects) {
            const taskIndex = project.tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                project.tasks.splice(taskIndex, 1);
                await this.saveProject(project);
                return;
            }
        }
    }

    private async saveProject(project: Project): Promise<void> {
        const fileName = `${project.title.toLowerCase().replace(/\s+/g, '_')}.yml`;
        const filePath = path.join(this.projectsDir, fileName);
        await fs.writeFile(filePath, yaml.dump(project), 'utf8');
    }
}