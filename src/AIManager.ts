// src/AIManager.ts
import {
    GoogleGenerativeAI,
    Part,
    Content,
    FunctionDeclaration,
    FunctionDeclarationsTool
} from "@google/generative-ai";
import { AiClient, ChatMessage, AIConfig, CalendarActionPlan } from "./types";
import { CalendarManager } from "./CalendarManager";
import { ProjectManager } from "./ProjectManager";

export class AIManager implements AiClient {
    private config: AIConfig;
    private googleAI: GoogleGenerativeAI | null = null;
    private calendarManager: CalendarManager;
    private projectManager: ProjectManager;

    constructor(config: AIConfig, calendarManager: CalendarManager, projectManager: ProjectManager) {
        this.config = config;
        this.calendarManager = calendarManager;
        this.projectManager = projectManager;
        this.initializeClient();
    }

    private initializeClient(): void {
        let apiKey: string | undefined = this.config.apiKey;
        if (!apiKey && this.config.api_key_env_var) {
            apiKey = process.env[this.config.api_key_env_var];
        }
        if (apiKey) {
            this.googleAI = new GoogleGenerativeAI(apiKey);
            console.log(`AI Manager initialized for model: ${this.config.model}`);
        } else {
            this.googleAI = null;
            console.warn(`AI Manager not initialized: Gemini API key not found.`);
        }
    }

    public isReady(): boolean {
        return this.googleAI !== null;
    }

    private getTools(calendarContext?: string): FunctionDeclarationsTool[] {
        // Base tools for information gathering
        const functionDeclarations: FunctionDeclaration[] = [
            {
                name: "get_calendar_events",
                description: "Get a list of calendar events for a given date range. This is used to find events for deletion or updates.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        startDate: { type: "STRING", description: "Start date in ISO 8601 format." },
                        endDate: { type: "STRING", description: "End date in ISO 8601 format." },
                    },
                    required: ["startDate", "endDate"],
                },
            },
            {
                name: "list_calendars",
                description: "Get a list of all available calendars to the user. This is useful to let the user choose which calendar to act on.",
                parameters: { type: "OBJECT", properties: {} },
            },
            {
                name: "propose_calendar_action_plan",
                description: "Once all information is gathered, use this tool to propose a plan to the user for creating, deleting, or updating calendar events. The user must approve this plan before any action is taken.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        action: { type: "STRING", enum: ["create", "delete", "update"], description: "The type of action to perform." },
                        targetCalendarId: { type: "STRING", description: "The ID of the calendar on which to perform the action." },
                        summary: { type: "STRING", description: "A human-readable summary of the plan. E.g., 'I will create 3 events on your Work calendar.'" },
                        events: {
                            type: "ARRAY",
                            description: "The list of events to be created or deleted.",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    eventId: { type: "STRING", description: "The ID of the event to delete. Only required for 'delete' actions." },
                                    summary: { type: "STRING", description: "The title of the event." },
                                    startTime: { type: "STRING", description: "Start time in ISO 8601 format." },
                                    endTime: { type: "STRING", description: "End time in ISO 8601 format." },
                                    description: { type: "STRING", description: "Optional description for the event." },
                                },
                                required: ["summary", "startTime", "endTime"],
                            },
                        },
                    },
                    required: ["action", "targetCalendarId", "summary", "events"],
                },
            },
        ];

        // If a specific calendar context is provided, add a tool to get details for THAT calendar.
        if (calendarContext) {
            // This part is for the re-evaluation loop, which is not fully implemented here.
            // This is a placeholder for how one might add context-specific tools.
        }

        return [{ functionDeclarations }];
    }

    async generateChatResponse(history: ChatMessage[], calendarContext?: string): Promise<ChatMessage> {
        if (!this.isReady() || !this.googleAI) {
            return { role: 'model', content: "The AI is not available. Please check your API key in the settings." };
        }

        const model = this.googleAI.getGenerativeModel({
            model: this.config.model,
            tools: this.getTools(calendarContext),
        });

        const googleChatHistory: Content[] = history.map(msg => ({
            role: msg.role === 'system' ? 'user' : msg.role,
            parts: [{ text: msg.content }],
        }));

        const chat = model.startChat({ history: googleChatHistory.slice(0, -1) });
        const lastMessage = history[history.length - 1];

        try {
            let result = await chat.sendMessage(lastMessage.content);

            while (true) {
                const call = result.response.functionCalls()?.[0];
                if (!call) {
                    // No function call, just return the text response
                    return { role: 'model', content: result.response.text() };
                }

                // If the AI wants to propose a plan, we're done on the backend.
                // We return the plan to the frontend for user confirmation.
                if (call.name === 'propose_calendar_action_plan') {
                    const plan: CalendarActionPlan = {
                        type: 'calendar_plan',
                        originalPrompt: lastMessage.content,
                        ...call.args,
                    };
                    return {
                        role: 'model',
                        content: call.args.summary, // The summary is the textual part of the response
                        plan: plan,
                    };
                }

                console.log("Function call requested:", call.name, "with arguments:", call.args);
                const functionResponseParts: Part[] = [];

                // --- Execute Information-Gathering Function Call ---
                try {
                    let apiResponse;
                    switch (call.name) {
                        case 'get_calendar_events':
                            const events = await this.calendarManager.getCalendarEvents(call.args.startDate, call.args.endDate, []); // Fetch from all calendars
                            apiResponse = { events: events.map(e => ({ id: e.id, summary: e.summary, start: e.start, end: e.end, calendarId: e.calendarId })) };
                            break;
                        case 'list_calendars':
                            const calendars = await this.calendarManager.getCalendarList();
                            apiResponse = { calendars: calendars.map(c => ({ id: c.id, summary: c.summary, primary: c.primary })) };
                            break;
                        default:
                            throw new Error(`Unrecognized function call: ${call.name}`);
                    }
                    functionResponseParts.push({
                        functionResponse: { name: call.name, response: apiResponse },
                    });
                } catch (e) {
                    console.error(`Error executing function ${call.name}:`, e);
                    functionResponseParts.push({
                        functionResponse: { name: call.name, response: { error: e.message } },
                    });
                }

                // --- Send Response Back to Model to Continue the Loop ---
                result = await chat.sendMessage(functionResponseParts);
            }
        } catch (e) {
            console.error("Error in generateChatResponse:", e);
            return { role: 'model', content: "An error occurred while processing your request." };
        }
    }
    
    // This method is now deprecated for chat, but kept for other potential uses.
    async extractProjectsAndTasks(fileContent: string, userPrompt: string, log: (message: string) => void): Promise<void> {
        // ... implementation remains the same
    }

    async generateReflection(entry: string): Promise<string> {
        if (!this.isReady()) {
            return "AI client is not configured. Please set your API key in the settings.";
        }
        return "Not implemented for brevity in this example";
    }
}
