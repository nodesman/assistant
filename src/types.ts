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

export interface AiClient {
    generateReflection(entry: string): Promise<string>;
}

export interface JournalEntry {
    topic: string;
    date: string; // YYYY-MM-DD
    content: string;
    reflection?: string; // Optional reflection text
    filePath: string;
}