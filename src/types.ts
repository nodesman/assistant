// src/types.ts

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
}

// Represents a message in the chat history
export interface ChatMessage {
    role: 'user' | 'model'; // Standard roles for chat models
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

// Note: This original JournalEntry structure based on daily files is less relevant
// in the new directory-per-topic model, but kept for potential reference or future adaptation.
export interface JournalEntry {
    topic: string;
    date: string; // YYYY-MM-DD
    content: string;
    reflection?: string; // Optional reflection text
    filePath: string;
}