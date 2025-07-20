#!/usr/bin/env node
import inquirer from 'inquirer';
import { ProjectManager } from './ProjectManager';
import { AIManager } from './AIManager';
import { Config } from './Config';
import { ChatMessage } from './types';
import { GoogleAuthService } from './GoogleAuthService';
import { CalendarManager } from './CalendarManager';
import { HorizonsManager } from './HorizonsManager';

import { WebServer } from './WebServer';
import open from 'open';

let projectManager: ProjectManager;
let aiManager: AIManager;
let googleAuthService: GoogleAuthService;
let calendarManager: CalendarManager;
let horizonsManager: HorizonsManager;
let webServer: WebServer;

async function knowledgeBaseMenu() {
    const projects = await projectManager.getAllProjects();
    if (projects.length === 0) {
        console.log('No projects found. Please create a project first.');
        return;
    }

    const projectChoices = projects.map(p => ({ name: p.title, value: p.title }));

    const { projectTitle } = await inquirer.prompt([
        {
            type: 'list',
            name: 'projectTitle',
            message: 'Select a project to open the knowledge base for',
            choices: [...projectChoices, new inquirer.Separator(), 'Back'],
        },
    ]);

    if (projectTitle === 'Back') {
        return;
    }

    await launchWebServer(projectTitle);
}

async function launchWebServer(projectName: string) {
    if (!webServer) {
        webServer = new WebServer(3001);
        webServer.start();
    }
    const safeProjectName = projectName.toLowerCase().replace(/\s+/g, '_');
    await open(`http://localhost:3001/projects/${safeProjectName}`);
}

async function calendarMenu() {
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Calendar Management',
            choices: [
                'Schedule Task',
                'View Free/Busy',
                new inquirer.Separator(),
                'Back to Main Menu',
            ],
        },
    ]);

    switch (action) {
        case 'Schedule Task':
            // Implement task scheduling logic
            console.log('Scheduling task...');
            break;
        case 'View Free/Busy':
            // Implement view free/busy logic
            console.log('Viewing free/busy...');
            break;
        case 'Back to Main Menu':
            return;
    }
}

async function googleAccountMenu() {
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Google Account Management',
            choices: [
                'Authorize Google Account',
                new inquirer.Separator(),
                'Back to Main Menu',
            ],
        },
    ]);

    switch (action) {
        case 'Authorize Google Account':
            await googleAuthService.authorize();
            break;
        case 'Back to Main Menu':
            return;
    }
}

async function projectMenu() {
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Project Management',
            choices: [
                'Create New Project',
                'Manage Existing Project',
                'Parse Text for Projects',
                'Chat with Projects',
                'Knowledge Base (Web GUI)',
                new inquirer.Separator(),
                'Back to Main Menu',
            ],
        },
    ]);

    switch (action) {
        case 'Create New Project':
            await projectManager.createProjectFromTemplate();
            break;
        case 'Manage Existing Project':
            await projectManager.manageExistingProject();
            break;
        case 'Parse Text for Projects':
            await parseTextForProjects();
            break;
        case 'Chat with Projects':
            await chatWithProjects();
            break;
        case 'Knowledge Base (Web GUI)':
            await knowledgeBaseMenu();
            break;
        case 'Back to Main Menu':
            return;
    }
}

async function parseTextForProjects() {
    console.log('Please paste the text you want to parse for projects. Press CTRL+D when you are done.');
    const textBlock = await new Promise<string>((resolve) => {
        let data = '';
        process.stdin.on('data', (chunk) => {
            data += chunk;
        });
        process.stdin.on('end', () => {
            resolve(data);
        });
    });

    if (textBlock) {
        await projectManager.createProjectsFromTextBlock(textBlock);
    } else {
        console.log('No text provided.');
    }
}

async function chatWithProjects() {
    const conversationHistory: ChatMessage[] = [];
    const initialContext = await projectManager.getProjectsAsContext();

    if (initialContext) {
        conversationHistory.push({ role: 'user', content: `Here is the current project backlog:\n\n${initialContext}` });
        conversationHistory.push({ role: 'model', content: "I have loaded the project backlog. How can I help you?" });
    }

    console.log("Welcome to the Project Chat! Type 'exit' to end the conversation.");

    while (true) {
        const { userInput } = await inquirer.prompt([
            {
                type: 'input',
                name: 'userInput',
                message: 'You:',
            },
        ]);

        if (userInput.toLowerCase() === 'exit') {
            break;
        }

        conversationHistory.push({ role: 'user', content: userInput });

        const response = await aiManager.generateChatResponse(conversationHistory);

        if (response) {
            console.log(`AI: ${response}`);
            conversationHistory.push({ role: 'model', content: response });
        } else {
            console.log('AI: I am sorry, I could not generate a response.');
        }
    }
}

async function mainMenu() {
    const config = Config.getInstance();
    await config.loadConfig(); // Load config at the start
    projectManager = new ProjectManager();
    aiManager = new AIManager(config.get().ai);
    googleAuthService = new GoogleAuthService();
    calendarManager = new CalendarManager();
    horizonsManager = new HorizonsManager();

    while (true) {
        const { choice } = await inquirer.prompt([
            {
                type: 'list',
                name: 'choice',
                message: 'What would you like to do?',
                choices: [
                    'Horizons of Focus (Goals & Purpose)',
                    'Project Management (10,000 ft)',
                    'Journaling',
                    'Google Account Management',
                    'Calendar Management',
                    new inquirer.Separator(),
                    'Exit',
                ],
            },
        ]);

        switch (choice) {
            case 'Horizons of Focus (Goals & Purpose)':
                await horizonsManager.manageHorizons();
                break;
            case 'Project Management (10,000 ft)':
                await projectMenu();
                break;
            case 'Journaling':
                // Implement journaling logic
                console.log('Journaling is not yet implemented.');
                break;
            case 'Google Account Management':
                await googleAccountMenu();
                break;
            case 'Calendar Management':
                await calendarMenu();
                break;
            case 'Exit':
                return;
        }
    }
}

mainMenu().catch(console.error);
