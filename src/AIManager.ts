// src/AIManager.ts
import {
    GoogleGenerativeAI,
    Part,
    Content,
    FunctionDeclaration,
    FunctionDeclarationsTool
} from "@google/generative-ai";
import { AiClient, ChatMessage, AIConfig, CalendarActionPlan, CalendarSelectionRequest, AnyPlan } from "./types";
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

    private getTools(): FunctionDeclarationsTool[] {
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
                description: "Get a list of all available calendars to the user.",
                parameters: { type: "OBJECT", properties: {} },
            },
            {
                name: "request_calendar_selection",
                description: "If the user's request is ambiguous about which calendar to use, call this function to ask the user to choose from a list of relevant calendars.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        summary: { type: "STRING", description: "The question to ask the user. E.g., 'Which calendar should I use for the new event?'" },
                        calendars: {
                            type: "ARRAY",
                            description: "An array of calendar objects for the user to choose from.",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    id: { type: "STRING", description: "The calendar ID." },
                                    summary: { type: "STRING", description: "The human-readable name of the calendar." },
                                },
                                required: ["id", "summary"],
                            },
                        },
                    },
                    required: ["summary", "calendars"],
                },
            },
            {
                name: "propose_calendar_action_plan",
                description: "Once all information is gathered and there is no ambiguity, use this tool to propose a final plan to the user. This is the last step.",
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
        return [{ functionDeclarations }];
    }

    async generateChatResponse(history: ChatMessage[], onUpdate: (update: any) => void, calendarContext?: string): Promise<ChatMessage> {
        if (!this.isReady() || !this.googleAI) {
            return { role: 'model', content: "The AI is not available. Please check your API key in the settings." };
        }

        const systemInstruction = `
            You are a helpful assistant for managing a user's calendar. Today's date is ${new Date().toISOString()}.
            Your workflow is as follows:
            1.  **Gather Information:** Use the \`list_calendars\` and \`get_calendar_events\` tools to understand the user's current state.
            2.  **Clarify Ambiguity:** If the user's request could apply to multiple calendars (e.g., "delete my meetings"), you MUST use the \`request_calendar_selection\` tool to ask the user for clarification. Do not guess.
            3.  **Propose a Plan:** Once you have all the necessary information (including a specific calendar ID), you MUST end the conversation by calling the \`propose_calendar_action_plan\` tool. This presents the final, concrete plan to the user for approval.
            Never ask the user for information you can acquire with your tools.
        `;

        const model = this.googleAI.getGenerativeModel({
            model: this.config.model,
            tools: this.getTools(),
            systemInstruction: systemInstruction,
        });

        const lastMessage = history.pop();
        if (!lastMessage) {
            return { role: 'model', content: "No message to respond to." };
        }

        // The 'history' for startChat should be everything *except* the last message.
        const chatHistoryForInit: Content[] = history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }],
        }));

        // The Google API requires the history array to start with a 'user' role.
        if (chatHistoryForInit.length > 0 && chatHistoryForInit[0].role !== 'user') {
            chatHistoryForInit[0].role = 'user';
        }

        const chat = model.startChat({ history: chatHistoryForInit });

        try {
            let result = await chat.sendMessage(lastMessage.content);

            while (true) {
                const call = result.response.functionCalls()?.[0];
                if (!call) {
                    const responseText = result.response.text();
                    onUpdate({ status: 'done', content: 'Finished generating response.' });
                    return { role: 'model', content: String(responseText) };
                }

                // --- Handle Plan-based Function Calls ---
                if (call.name === 'propose_calendar_action_plan' || call.name === 'request_calendar_selection') {
                    onUpdate({ status: 'plan_generated', content: 'Plan ready for review.' });
                    const plan: AnyPlan = {
                        type: call.name === 'propose_calendar_action_plan' ? 'calendar_plan' : 'calendar_selection_request',
                        originalPrompt: String(lastMessage.content),
                        ...JSON.parse(JSON.stringify(call.args)),
                    };
                    return {
                        role: 'model',
                        content: String(call.args.summary),
                        plan: plan,
                    };
                }

                // --- Handle Information-Gathering Function Calls ---
                onUpdate({ status: 'tool_call', name: call.name, args: call.args });
                const functionResponseParts: Part[] = [];
                try {
                    let apiResponse;
                    switch (call.name) {
                        case 'get_calendar_events':
                            const allCalendars = await this.calendarManager.getCalendarList();
                            const allCalendarIds = allCalendars.map(c => c.id);
                            const events = await this.calendarManager.getCalendarEvents(call.args.startDate, call.args.endDate, allCalendarIds);
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

                result = await chat.sendMessage(functionResponseParts);
            }
        } catch (e) {
            console.error("Error in generateChatResponse:", e);
            return { role: 'model', content: "An error occurred while processing your request." };
        }
    }
    
    async generateReflection(entry: string): Promise<string> {
        if (!this.isReady()) {
            return "AI client is not configured.";
        }
        return "Not implemented for brevity in this example";
    }
}
