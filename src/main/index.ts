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

// Define the development server URL
const VITE_DEV_SERVER_URL = 'http://localhost:5173';

async function main() {
    // Instantiate managers
    const config = await Config.getInstance();
    const projectManager = new ProjectManager(config);
    const aiManager = new AIManager(config.get().ai);
    const googleAuthService = new GoogleAuthService(config);
    const calendarManager = new CalendarManager(config);
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
    ipcMain.handle('get-calendar-events', () => calendarManager.getCalendarEvents());
    ipcMain.handle('generate-chat-response', (event, context, message) => aiManager.generateChatResponse([{role: 'user', content: `${context}\n\n${message}`}]));
    ipcMain.handle('authorize-google-account', () => googleAuthService.authorize());
    ipcMain.handle('get-authorized-user', () => googleAuthService.getAuthorizedUser());
    ipcMain.handle('remove-google-account', () => googleAuthService.removeGoogleAccount());

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
}

main();
