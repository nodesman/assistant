import { contextBridge, ipcRenderer } from 'electron';

// --- Expose a secure API to the renderer process ---
contextBridge.exposeInMainWorld('api', {
  // Project Management
  getProjects: () => ipcRenderer.invoke('get-all-projects'),
  createProject: (project) => ipcRenderer.invoke('create-project', project),
  updateProject: (project) => ipcRenderer.invoke('update-project', project),
  deleteProject: (projectId) => ipcRenderer.invoke('delete-project', projectId),
  
  // Task Management
  addTask: (projectId, task) => ipcRenderer.invoke('add-task', projectId, task),
  updateTask: (taskId, task) => ipcRenderer.invoke('update-task', taskId, task),
  deleteTask: (taskId) => ipcRenderer.invoke('delete-task', taskId),
  
  // Journaling
  getJournalEntries: () => ipcRenderer.invoke('get-journal-entries'),
  createJournalEntry: (entry) => ipcRenderer.invoke('create-journal-entry', entry),
  
  // Google Calendar
  getCalendarList: () => ipcRenderer.invoke('get-calendar-list'),
  getCalendarEvents: (timeMin, timeMax, calendarIds) => ipcRenderer.invoke('get-calendar-events', timeMin, timeMax, calendarIds),
  createCalendarEvent: (eventBody, calendarId) => ipcRenderer.invoke('create-calendar-event', eventBody, calendarId),
  updateCalendarEvent: (eventId, eventBody, calendarId) => ipcRenderer.invoke('update-calendar-event', eventId, eventBody, calendarId),
  deleteCalendarEvent: (eventId, calendarId) => ipcRenderer.invoke('delete-calendar-event', eventId, calendarId),
  
  // AI Chat & Planning
  generateChatResponse: (history, calendarContext) => ipcRenderer.invoke('generate-chat-response', history, calendarContext),
  executeCalendarPlan: (plan) => ipcRenderer.invoke('execute-calendar-plan', plan),
  isAiReady: () => ipcRenderer.invoke('is-ai-ready'),
  onAIUpdate: (callback) => ipcRenderer.on('ai-thinking-update', (_event, value) => callback(value)),
  
  // Google Authentication
  authorizeGoogleAccount: () => ipcRenderer.invoke('authorize-google-account'),
  getAuthorizedUser: () => ipcRenderer.invoke('get-authorized-user'),
  removeGoogleAccount: () => ipcRenderer.invoke('remove-google-account'),
  reloadWindow: () => ipcRenderer.invoke('reload-window'),
  
  // Chat History
  getChatHistory: () => ipcRenderer.invoke('get-chat-history'),
  addChatMessage: (message) => ipcRenderer.invoke('add-chat-message', message),
  replaceLastChatMessage: (message) => ipcRenderer.invoke('replace-last-chat-message', message),
  clearChatHistory: () => ipcRenderer.invoke('clear-chat-history'),
  
  // App Config & State
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (config) => ipcRenderer.invoke('update-config', config),
  getOnboardingStatus: () => ipcRenderer.invoke('get-onboarding-status'),
  setOnboardingCompleted: () => ipcRenderer.invoke('set-onboarding-completed'),
  
  // Other Utilities
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