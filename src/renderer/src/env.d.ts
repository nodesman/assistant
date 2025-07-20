/// <reference types="vite/client" />

interface Window {
  api: {
    getProjects: () => Promise<any[]>;
    getGoals: () => Promise<any>;
    getJournalEntries: () => Promise<any[]>;
    getCalendarEvents: () => Promise<any[]>;
    generateChatResponse: (context: string, message: string) => Promise<string>;
    authorizeGoogleAccount: () => Promise<string>;
    getAuthorizedUser: () => Promise<any>;
    removeGoogleAccount: () => Promise<void>;
    onReceiveMessage: (channel: string, func: (...args: any[]) => void) => void;
    // Add other methods as needed
  };
}
