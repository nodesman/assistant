// src/types.ts

export interface Project {
    id: string;
    title: string;
    body: string;
    tasks: Task[];
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  body: string;
  status: 'To Do' | 'In Progress' | 'Done';
  duration?: number; // Duration in minutes
  minChunk?: number; // Minimum chunk size in minutes
  location?: string; // Geographic location
}

export interface GoogleAuthConfig {
    client_id?: string;
    client_secret?: string;
    redirect_uris?: string[];
    token_path?: string; // Path to store tokens
}

// New interface for Google OAuth tokens
export interface GoogleTokens {
    access_token: string;
    refresh_token?: string; // Refresh token might not always be present (e.g., for short-lived access tokens)
    scope: string;
    token_type: string;
    expiry_date: number; // Unix timestamp
}

export interface JournalConfig {
    journal_directory: string;
    ai: {
        provider?: 'google' | 'openai'; // Optional for now
        model: string;
        api_key_env_var: string;
        reflection_prompt: string;
        // Add other AI params like temperature if needed
    };
    editor_command: string; // Command to launch the editor
    google_auth?: GoogleAuthConfig; // Optional Google Auth configuration
}

// Represents a message in the chat history
export interface ChatMessage {
    role: 'user' | 'model' | 'system'; // Standard roles for chat models
    content: string;
}

// Represents the structure of the state.yaml file
export interface KanbanBoard {
    Pending: string[];
    Doing: string[];
    Done: string[];
}
export interface TopicState {
    status: 'active' | 'stable' | 'concluded';
    board: KanbanBoard;
}

export interface AiClient {
    generateReflection(entry: string): Promise<string>;
    generateChatResponse(history: ChatMessage[]): Promise<string | null>; // For conversational interaction
}

export interface JournalEntry {
    title: string;
    date: string; // YYYY-MM-DD
    content: string;
}

// GTD Horizons of Focus
export interface Purpose {
    purpose: string;
    principles: string[];
}

export interface Goal {
    title: string;
    description: string;
}

export interface Horizons {
    purpose: Purpose;
    goals: Goal[];
}
