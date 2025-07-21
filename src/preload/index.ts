import { contextBridge, ipcRenderer } from 'electron';

// --- Expose a secure API to the renderer process ---
contextBridge.exposeInMainWorld('api', {
  // ... (all your existing API methods)
  getProjects: () => ipcRenderer.invoke('get-projects'),
  createProject: (project) => ipcRenderer.invoke('create-project', project),
  updateProject: (project) => ipcRenderer.invoke('update-project', project),
  deleteProject: (projectId) => ipcRenderer.invoke('delete-project', projectId),
  addTask: (projectId, task) => ipcRenderer.invoke('add-task', projectId, task),
  updateTask: (taskId, task) => ipcRenderer.invoke('update-task', taskId, task),
  deleteTask: (taskId) => ipcRenderer.invoke('delete-task', taskId),
  getJournalEntries: () => ipcRenderer.invoke('get-journal-entries'),
  createJournalEntry: (entry) => ipcRenderer.invoke('create-journal-entry', entry),
  getGoals: () => ipcRenderer.invoke('get-goals'),
  getCalendarEvents: (timeMin, timeMax) => ipcRenderer.invoke('get-calendar-events', timeMin, timeMax),
  createCalendarEvent: (eventBody) => ipcRenderer.invoke('create-calendar-event', eventBody),
  updateCalendarEvent: (eventId, eventBody) => ipcRenderer.invoke('update-calendar-event', eventId, eventBody),
  deleteCalendarEvent: (eventId) => ipcRenderer.invoke('delete-calendar-event', eventId),
  generateChatResponse: (context, message) => ipcRenderer.invoke('generate-chat-response', context, message),
  authorizeGoogleAccount: () => ipcRenderer.invoke('authorize-google-account'),
  getAuthorizedUser: () => ipcRenderer.invoke('get-authorized-user'),
  removeGoogleAccount: () => ipcRenderer.invoke('remove-google-account'),
  onReceiveMessage: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  parseTextForProjects: (text) => ipcRenderer.invoke('parse-text-for-projects', text),
  importParsedProjects: (data) => ipcRenderer.invoke('import-parsed-projects', data),
});

// --- Forward Renderer Console Logs to Main Process ---
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

console.log = (...args) => {
  originalConsole.log(...args);
  ipcRenderer.send('console-log', args);
};

console.warn = (...args) => {
  originalConsole.warn(...args);
  ipcRenderer.send('console-warn', args);
};

console.error = (...args) => {
  originalConsole.error(...args);
  ipcRenderer.send('console-error', args);
};
