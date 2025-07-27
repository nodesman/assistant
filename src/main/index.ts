// src/main/index.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
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

    const userDataPath = app.getPath('userData');

    // Instantiate managers
    const config = await Config.getInstance(userDataPath);
    const userState = await UserState.getInstance();
    const chatManager = ChatManager.getInstance();
    const dbManager = new DatabaseManager(config);
    await dbManager.init();
    await dbManager.migrateFromYaml();

    const projectManager = new ProjectManager(dbManager);
    let authManager: AuthManager | null = null;
    let calendarManager: CalendarManager | null = null;
    let mainWindow: BrowserWindow | null = null;

    const getAuthManager = (): AuthManager => {
        if (!authManager) {
            authManager = new AuthManager(config);
        }
        return authManager;
    }

    const getCalendarManager = (): CalendarManager => {
        if (!calendarManager) {
            if (!mainWindow) {
                throw new Error("Main window is not initialized yet!");
            }
            calendarManager = new CalendarManager(config, mainWindow);
        }
        return calendarManager;
    }

    const aiManager = new AIManager(config.get().ai, getCalendarManager, projectManager);
    const textParser = new TextParser(aiManager);
    const horizonsManager = new HorizonsManager(config);
    const journalManager = new JournalManager(config);

    // Register all IPC handlers before creating the window
    ipcMain.handle('get-all-projects', () => projectManager.getAllProjects());
    ipcMain.handle('create-project', (event, project) => projectManager.createProject(project));
    ipcMain.handle('get-goals', () => horizonsManager.getHorizons());
    ipcMain.handle('get-journal-entries', () => journalManager.getAllEntries());
    
    // Calendar IPC Handlers
    ipcMain.handle('get-cached-calendar-list', () => getCalendarManager().getCachedCalendarList());
    ipcMain.handle('get-cached-calendar-events', () => getCalendarManager().getCachedEvents());
    ipcMain.handle('force-calendar-refresh', () => getCalendarManager().forceRefresh());
    ipcMain.handle('create-calendar-event', (event, eventBody, calendarId) => getCalendarManager().createCalendarEvent(eventBody, calendarId));
    ipcMain.handle('update-calendar-event', (event, eventId, eventBody, calendarId) => getCalendarManager().updateCalendarEvent(eventId, eventBody, calendarId));
    ipcMain.handle('delete-calendar-event', (event, eventId, calendarId) => getCalendarManager().deleteCalendarEvent(eventId, calendarId));
    ipcMain.handle('schedule-recurring-event', (event, eventDetails) => getCalendarManager().scheduleRecurringEvent(eventDetails));
    
    // AI Chat & Planning
    ipcMain.handle('generate-chat-response', (event, history, calendarContext) => {
        const onUpdate = (update: any) => {
            event.sender.send('ai-thinking-update', update);
        };
        return aiManager.generateChatResponse(history, onUpdate, calendarContext);
    });
    ipcMain.handle('continue-chat', (event, history, plan, userResponse) => {
        const onUpdate = (update: any) => {
            event.sender.send('ai-thinking-update', update);
        };
        return aiManager.continueChat(history, plan, userResponse, onUpdate);
    });
    ipcMain.handle('execute-calendar-plan', async (event, plan) => {
        try {
            const calManager = getCalendarManager();
            if (plan.action === 'create') {
                for (const ev of plan.events) {
                    await calManager.createCalendarEvent({
                        summary: ev.summary,
                        description: ev.description || '',
                        start: { dateTime: ev.startTime },
                        end: { dateTime: ev.endTime },
                    }, plan.targetCalendarId);
                }
                return { success: true, message: `Successfully created ${plan.events.length} event(s).` };
            } else if (plan.action === 'delete') {
                for (const ev of plan.events) {
                    await calManager.deleteCalendarEvent(ev.eventId, plan.targetCalendarId);
                }
                return { success: true, message: `Successfully deleted ${plan.events.length} event(s).` };
            } else if (plan.action === 'update') {
                for (const ev of plan.events) {
                    const eventBody = {
                        summary: ev.summary,
                        description: ev.description || '',
                        start: { dateTime: ev.startTime },
                        end: { dateTime: ev.endTime },
                    };
                    await calManager.updateCalendarEvent(ev.eventId, eventBody, plan.targetCalendarId);
                }
                return { success: true, message: `Successfully updated ${plan.events.length} event(s).` };
            }
            return { success: false, error: 'Unsupported action type.' };
        } catch (error) {
            console.error("Error executing calendar plan:", error);
            return { success: false, error: error.message };
        }
    });

    // AI and Auth
    ipcMain.handle('is-ai-ready', () => aiManager.isReady());
    ipcMain.handle('reload-ai-manager', () => {
        const newConfig = config.get();
        aiManager.reinitialize(newConfig.ai);
    });
    ipcMain.handle('are-google-credentials-configured', () => {
        const clientId = import.meta.env.GOOGLE_CLIENT_ID;
        const clientSecret = import.meta.env.GOOGLE_CLIENT_SECRET;
        const configured = !!(clientId && clientSecret);
        return configured;
    });
    ipcMain.handle('is-google-auth-configured', () => {
        return !!(import.meta.env.GOOGLE_CLIENT_ID && import.meta.env.GOOGLE_CLIENT_SECRET);
    });
    ipcMain.handle('authorize-google-account', async (event) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (window) {
            const result = await getAuthManager().authorize(window);
            if (result) {
                // getCalendarManager().startPolling(); // This method doesn't exist
            }
            return result;
        }
    });
    ipcMain.handle('get-authorized-user', () => getAuthManager().getAuthorizedUser());
    ipcMain.handle('remove-google-account', () => {
        getCalendarManager().stopPolling();
        return getAuthManager().removeGoogleAccount()
    });
    ipcMain.handle('reload-window', (event) => {
        BrowserWindow.fromWebContents(event.sender)?.reload();
    });

    // Chat History
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

    // Config
    ipcMain.handle('get-config', async () => config.get());
    ipcMain.handle('update-config', async (event, newConfig) => {
        try {
            await config.updateConfig(newConfig);
            await Config.reloadInstance();
            return { success: true };
        } catch (error) {
            console.error("Failed to update config:", error);
            return { success: false, error: error.message };
        }
    });

    // Onboarding
    ipcMain.handle('get-onboarding-status', () => userState.getOnboardingStatus());
    ipcMain.handle('set-onboarding-completed', () => userState.setOnboardingCompleted(true));

    // Tasks
    ipcMain.handle('add-task', (event, projectId, task) => projectManager.addTask(projectId, task));
    ipcMain.handle('update-task', (event, taskId, task) => projectManager.updateTask(taskId, task));
    ipcMain.handle('delete-task', (event, taskId) => projectManager.deleteTask(taskId));

    // Text Parsing
    ipcMain.handle('extract-projects-and-tasks', async (event, fileContent, prompt) => {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (!window) return;
        const log = (message: string) => window.webContents.send('import-log', message);
        try {
            await aiManager.extractProjectsAndTasks(fileContent, prompt, log);
        } catch (e) {
            log(`An unexpected error occurred: ${e.message}`);
        }
    });

    function createWindow() {
        mainWindow = new BrowserWindow({
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
        
        getAuthManager().getAuthorizedUser().then(user => {
            if (user) {
                // getCalendarManager().startPolling(); // This method doesn't exist
            }
        });

        mainWindow.on('closed', () => {
            if (calendarManager) {
                // calendarManager.stopPolling(); // This method doesn't exist
            }
            mainWindow = null;
        });
    }

    // App lifecycle events can now safely create the window
    app.on('ready', () => {
        createWindow();
        autoUpdater.checkForUpdatesAndNotify();
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
}

main().catch(console.error);
