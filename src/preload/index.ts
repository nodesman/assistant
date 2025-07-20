import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // ProjectManager functions
  getProjects: () => ipcRenderer.invoke('get-projects'),
  createProject: (project) => ipcRenderer.invoke('create-project', project),
  updateProject: (project) => ipcRenderer.invoke('update-project', project),
  deleteProject: (projectId) => ipcRenderer.invoke('delete-project', projectId),

  // Task functions
  addTask: (projectId, task) => ipcRenderer.invoke('add-task', projectId, task),
  updateTask: (taskId, task) => ipcRenderer.invoke('update-task', taskId, task),
  deleteTask: (taskId) => ipcRenderer.invoke('delete-task', taskId),

  // JournalManager functions
  getJournalEntries: () => ipcRenderer.invoke('get-journal-entries'),
  createJournalEntry: (entry) => ipcRenderer.invoke('create-journal-entry', entry),

  // HorizonsManager functions
  getGoals: () => ipcRenderer.invoke('get-goals'),

  // CalendarManager functions
  getCalendarEvents: () => ipcRenderer.invoke('get-calendar-events'),

  // AIManager functions
  generateChatResponse: (context, message) => ipcRenderer.invoke('generate-chat-response', context, message),

  // GoogleAuthService functions
  authorizeGoogleAccount: () => ipcRenderer.invoke('authorize-google-account'),
  getAuthorizedUser: () => ipcRenderer.invoke('get-authorized-user'),
  removeGoogleAccount: () => ipcRenderer.invoke('remove-google-account'),
  onReceiveMessage: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
});
