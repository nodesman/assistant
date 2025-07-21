// src/main/index.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { ProjectManager } from '../ProjectManager';
import { AIManager } from '../AIManager';
import { CalendarManager } from '../CalendarManager';
import { HorizonsManager } from '../HorizonsManager';
import { JournalManager } from '../JournalManager';
import { Config } from '../Config';
import { GoogleAuthService } from '../GoogleAuthService';
import { DatabaseManager } from '../DatabaseManager';
import { TextParser } from '../TextParser';

// Define the development server URL
const VITE_DEV_SERVER_URL = 'http://localhost:5173';

async function main() {
    // Instantiate managers
    const config = await Config.getInstance();
    const dbManager = new DatabaseManager(config);
    await dbManager.init();
    await dbManager.migrateFromYaml();

    const projectManager = new ProjectManager(dbManager);
    const calendarManager = new CalendarManager(config);
    const aiManager = new AIManager(config.get().ai, calendarManager, projectManager);
    const textParser = new TextParser(aiManager);
    const googleAuthService = new GoogleAuthService(config);
    const horizonsManager = new HorizonsManager(config);
    const journalManager = new JournalManager(config);

    function createWindow() {
        const mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                preload: path.join(__dirname, '../preload/index.js'),
                contextIsolation: true,
                nodeIntegration: false,
            },
        });

        if (!app.isPackaged) {
            mainWindow.loadURL(VITE_DEV_SERVER_URL);
            mainWindow.webContents.openDevTools();
        } else {
            mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
        }

        // First-run check
        mainWindow.webContents.on('did-finish-load', async () => {
            const user = await googleAuthService.getAuthorizedUser();
            if (!user) {
                mainWindow.webContents.send('change-tab', 'Settings');
            }
        });
    }

    app.whenReady().then(() => {
        createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    // IPC Handlers
    ipcMain.handle('get-projects', () => projectManager.getAllProjects());
    ipcMain.handle('get-goals', () => horizonsManager.getHorizons());
    ipcMain.handle('get-journal-entries', () => journalManager.getAllEntries());
    ipcMain.handle('get-calendar-list', () => calendarManager.getCalendarList());
    ipcMain.handle('get-calendar-events', (event, timeMin, timeMax, calendarIds) => calendarManager.getCalendarEvents(timeMin, timeMax, calendarIds));
    ipcMain.handle('create-calendar-event', (event, eventBody, calendarId) => calendarManager.createCalendarEvent(eventBody, calendarId));
    ipcMain.handle('update-calendar-event', (event, eventId, eventBody, calendarId) => calendarManager.updateCalendarEvent(eventId, eventBody, calendarId));
    ipcMain.handle('delete-calendar-event', (event, eventId, calendarId) => calendarManager.deleteCalendarEvent(eventId, calendarId));
    ipcMain.handle('generate-chat-response', (event, history) => aiManager.generateChatResponse(history));
    ipcMain.handle('authorize-google-account', () => googleAuthService.authorize());
    ipcMain.handle('get-authorized-user', () => googleAuthService.getAuthorizedUser());
    ipcMain.handle('remove-google-account', () => googleAuthService.removeGoogleAccount());

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
        // This is a simplified import. A more robust version would associate tasks with the newly created projects.
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

    // This is now handled by the extract-projects-and-tasks handler
    // ipcMain.handle('commit-projects', ...);

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
