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
    defaultCalendarId?: string; // Optional: ID of the user's default calendar
}

// New interface for Google OAuth tokens
export interface GoogleTokens {
    access_token: string;
    refresh_token?: string; // Refresh token might not always be present (e.g., for short-lived access tokens)
    scope: string;
    token_type: string;
    expiry_date: number; // Unix timestamp
}

export interface AIConfig {
    provider?: 'google' | 'openai';
    model: string;
    api_key_env_var?: string; // Optional: for backward compatibility or dev environments
    apiKey?: string;          // Optional: the actual key, stored in user's config
    reflection_prompt: string;
    temperature?: number;
}

export interface JournalConfig {
    journal_directory: string;
    ai: AIConfig;
    editor_command: string; // Command to launch the editor
    google_auth?: GoogleAuthConfig; // Optional Google Auth configuration
}

// Represents a message in the chat history
export interface ChatMessage {
    role: 'user' | 'model' | 'system'; // Standard roles for chat models
    content: string;
    // A plan or request from the AI, to be rendered as an interactive card
    plan?: AnyPlan; 
}

// A union type for any kind of plan the AI can propose
export type AnyPlan = CalendarActionPlan | CalendarSelectionRequest;

// Defines a request for the user to select a calendar
export interface CalendarSelectionRequest {
    type: 'calendar_selection_request';
    // The question for the user, e.g., "Which calendar should I use?"
    summary: string;
    // The list of possible calendars for the user to choose from
    calendars: { id: string; summary: string }[];
    // The original user prompt that triggered this request
    originalPrompt: string;
}

// Defines a proposed event to be created, deleted, or edited
export interface EventProposal {
    eventId?: string; // Only present for 'delete' or 'update' actions
    summary: string;
    startTime: string; // ISO 8601 format
    endTime: string;   // ISO 8601 format
    description?: string;
}

// Specific proposal types for better type safety
export type CreateEventProposal = Omit<EventProposal, 'eventId'>;
export type UpdateEventProposal = Required<EventProposal>;
export type DeleteEventProposal = Required<Pick<EventProposal, 'eventId' | 'summary' | 'startTime' | 'endTime'>>;


// Defines a complete plan of action for the AI to propose to the user
export interface CalendarActionPlan {
    type: 'calendar_plan'; // To distinguish this from other potential plans
    action: 'create' | 'delete' | 'update';
    targetCalendarId: string;
    // A summary of the plan, e.g., "I will create 3 events on your 'Work' calendar."
    summary: string; 
    // The list of events involved in the plan
    events: (CreateEventProposal | UpdateEventProposal | DeleteEventProposal)[];
    // The original user prompt that generated this plan
    originalPrompt: string; 
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
