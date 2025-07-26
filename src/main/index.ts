// src/main/index.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { ProjectManager } from '../ProjectManager';
import { AIManager } from '../AIManager';
import { CalendarManager } from '../CalendarManager';
import { HorizonsManager } from '../HorizonsManager';
import { JournalManager } from '../JournalManager';
import { Config } from '../Config';
import { AuthManager } from '../AuthManager';
import { DatabaseManager } from '../DatabaseManager';
import { TextParser } from '../TextParser';
import { UserState } from '../UserState';
import { ChatManager } from '../ChatManager';

// Define the development server URL
const VITE_DEV_SERVER_URL = process.env['ELECTRON_VITE_URL'];

async function main() {
    // Wait for app to be ready to access userData path
    await app.whenReady();

    // Instantiate managers
    const config = await Config.getInstance();
    const userState = await UserState.getInstance();
    const chatManager = ChatManager.getInstance();
    const dbManager = new DatabaseManager(config);
    await dbManager.init();
    await dbManager.migrateFromYaml();

    const projectManager = new ProjectManager(dbManager);
    const calendarManager = new CalendarManager(config);
    const authManager = new AuthManager(config);
    const aiManager = new AIManager(config.get().ai, calendarManager, projectManager);
    const textParser = new TextParser(aiManager);
    const horizonsManager = new HorizonsManager(config);
    const journalManager = new JournalManager(config);

    function createWindow() {
        const mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                preload: path.join(__dirname, '..', 'preload', 'index.js'),
                contextIsolation: true,
                nodeIntegration: false,
            },
        });

        if (VITE_DEV_SERVER_URL) {
            mainWindow.loadURL(VITE_DEV_SERVER_URL);
            mainWindow.webContents.openDevTools();
        } else {
            mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
        }
    }

    app.on('ready', createWindow);

    // Handle geolocation permission requests
    const partition = require('electron').session.defaultSession;
    partition.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'geolocation') {
            callback(true);
        } else {
            callback(false);
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    // IPC Handlers
    ipcMain.handle('get-projects', () => projectManager.getAllProjects());
    ipcMain.handle('create-project', (event, project) => projectManager.createProject(project));
    ipcMain.handle('get-goals', () => horizonsManager.getHorizons());
    ipcMain.handle('get-journal-entries', () => journalManager.getAllEntries());
    ipcMain.handle('get-calendar-list', () => calendarManager.getCalendarList());
    ipcMain.handle('get-calendar-events', (event, timeMin, timeMax, calendarIds) => calendarManager.getCalendarEvents(timeMin, timeMax, calendarIds));
    ipcMain.handle('create-calendar-event', (event, eventBody, calendarId) => calendarManager.createCalendarEvent(eventBody, calendarId));
    ipcMain.handle('update-calendar-event', (event, eventId, eventBody, calendarId) => calendarManager.updateCalendarEvent(eventId, eventBody, calendarId));
    ipcMain.handle('delete-calendar-event', (event, eventId, calendarId) => calendarManager.deleteCalendarEvent(eventId, calendarId));
    
    ipcMain.handle('generate-chat-response', (event, history, calendarContext) => {
        const onUpdate = (update: any) => {
            event.sender.send('ai-thinking-update', update);
        };
        return aiManager.generateChatResponse(history, onUpdate, calendarContext);
    });

    ipcMain.handle('execute-calendar-plan', async (event, plan) => {
        try {
            if (plan.action === 'create') {
                for (const ev of plan.events) {
                    await calendarManager.createCalendarEvent({
                        summary: ev.summary,
                        description: ev.description || '',
                        start: { dateTime: ev.startTime },
                        end: { dateTime: ev.endTime },
                    }, plan.targetCalendarId);
                }
                return { success: true, message: `Successfully created ${plan.events.length} event(s).` };
            } else if (plan.action === 'delete') {
                for (const ev of plan.events) {
                    await calendarManager.deleteCalendarEvent(ev.eventId, plan.targetCalendarId);
                }
                return { success: true, message: `Successfully deleted ${plan.events.length} event(s).` };
            }
            // 'update' action can be added here later
            return { success: false, error: 'Unsupported action type.' };
        } catch (error) {
            console.error("Error executing calendar plan:", error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('is-ai-ready', () => aiManager.isReady());
    ipcMain.handle('authorize-google-account', (event) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (window) {
            return authManager.authorize(window);
        }
    });
    ipcMain.handle('get-authorized-user', () => authManager.getAuthorizedUser());
    ipcMain.handle('remove-google-account', () => authManager.removeGoogleAccount());
    ipcMain.handle('reload-window', (event) => {
        BrowserWindow.fromWebContents(event.sender)?.reload();
    });

    // Chat History IPC Handlers
    ipcMain.handle('get-chat-history', () => chatManager.getHistory());
    ipcMain.handle('add-chat-message', (event, message) => {
        chatManager.addMessage(message);
        return chatManager.getHistory();
    });
    ipcMain.handle('replace-last-chat-message', (event, message) => {
        chatManager.replaceLastMessage(message);
        return chatManager.getHistory();
    });
    ipcMain.handle('clear-chat-history', () => {
        chatManager.clearHistory();
        return chatManager.getHistory();
    });

    // Config IPC Handlers
    ipcMain.handle('get-config', async () => {
        const config = await Config.getInstance();
        return config.get();
    });

    ipcMain.handle('update-config', async (event, newConfig) => {
        try {
            const config = await Config.getInstance();
            await config.updateConfig(newConfig);
            // Reload config to ensure all managers get the updated version
            await Config.reloadInstance();
            // You might need to re-initialize managers that depend on the config
            // For now, we'll assume a restart is the simplest way to handle this.
            // A more advanced implementation could re-initialize them live.
            return { success: true };
        } catch (error) {
            console.error("Failed to update config:", error);
            return { success: false, error: error.message };
        }
    });

    // Onboarding IPC Handlers
    ipcMain.handle('get-onboarding-status', () => userState.getOnboardingStatus());
    ipcMain.handle('set-onboarding-completed', () => userState.setOnboardingCompleted(true));

    // Task IPC Handlers
    ipcMain.handle('add-task', (event, projectId, task) => projectManager.addTask(projectId, task));
    ipcMain.handle('update-task', (event, taskId, task) => projectManager.updateTask(taskId, task));
    ipcMain.handle('delete-task', (event, taskId) => projectManager.deleteTask(taskId));

    // Text Parsing IPC Handlers
    ipcMain.handle('parse-text-for-projects', (event, text) => textParser.parseText(text));
    ipcMain.handle('import-parsed-projects', async (event, data) => {
        for (const projectData of data.projects) {
            await projectManager.createProject(projectData);
        }
        for (const taskData of data.tasks) {
            const projects = await projectManager.getAllProjects();
            const project = projects.find(p => p.title === taskData.projectName);
            if (project) {
                await projectManager.addTask(project.id, taskData);
            }
        }
    });

    ipcMain.handle('extract-projects-and-tasks', async (event, fileContent, prompt) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (!window) return;

        const log = (message: string) => {
            console.log(message);
            window.webContents.send('import-log', message);
        };

        try {
            await aiManager.extractProjectsAndTasks(fileContent, prompt, log);
        } catch (e) {
            log(`An unexpected error occurred: ${e.message}`);
        }
    });

    // Console forwarding IPC handlers
    ipcMain.on('console-log', (event, ...args) => {
        console.log('[Renderer]', ...args);
    });
    ipcMain.on('console-warn', (event, ...args) => {
        console.warn('[Renderer]', ...args);
    });
    ipcMain.on('console-error', (event, ...args) => {
        console.error('[Renderer]', ...args);
    });

    process.on('uncaughtException', (error) => {
        console.error('Uncaught Exception:', error);
    });
}

main();
