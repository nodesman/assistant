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
  getCalendarList: () => ipcRenderer.invoke('get-calendar-list'),
  getCalendarEvents: (timeMin, timeMax, calendarIds) => ipcRenderer.invoke('get-calendar-events', timeMin, timeMax, calendarIds),
  createCalendarEvent: (eventBody, calendarId) => ipcRenderer.invoke('create-calendar-event', eventBody, calendarId),
  updateCalendarEvent: (eventId, eventBody, calendarId) => ipcRenderer.invoke('update-calendar-event', eventId, eventBody, calendarId),
  deleteCalendarEvent: (eventId, calendarId) => ipcRenderer.invoke('delete-calendar-event', eventId, calendarId),
  generateChatResponse: (history) => ipcRenderer.invoke('generate-chat-response', history),
  authorizeGoogleAccount: () => ipcRenderer.invoke('authorize-google-account'),
  getAuthorizedUser: () => ipcRenderer.invoke('get-authorized-user'),
  removeGoogleAccount: () => ipcRenderer.invoke('remove-google-account'),
  getOnboardingStatus: () => ipcRenderer.invoke('get-onboarding-status'),
  setOnboardingCompleted: () => ipcRenderer.invoke('set-onboarding-completed'),
  onReceiveMessage: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  parseTextForProjects: (text) => ipcRenderer.invoke('parse-text-for-projects', text),
  importParsedProjects: (data) => ipcRenderer.invoke('import-parsed-projects', data),
  extractProjectsAndTasks: (fileContent, prompt) => ipcRenderer.invoke('extract-projects-and-tasks', fileContent, prompt),
  commitProjects: (projects) => ipcRenderer.invoke('commit-projects', projects),
  getGoals: () => ipcRenderer.invoke('get-goals'),
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
