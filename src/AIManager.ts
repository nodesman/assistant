// src/AIManager.ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part, Content } from "@google/generative-ai";
import { AiClient, JournalConfig, ChatMessage } from "./types";
import { CalendarManager } from "./CalendarManager";
import moment from "moment";

export class AIManager implements AiClient {
    private config: JournalConfig['ai'];
    private googleAI: GoogleGenerativeAI;
    private calendarManager: CalendarManager;

    constructor(config: JournalConfig['ai'], calendarManager: CalendarManager) {
        this.config = config;
        this.calendarManager = calendarManager;
        const apiKey = process.env[this.config.api_key_env_var];

        if (!apiKey) {
            throw new Error(`API key environment variable '${this.config.api_key_env_var}' not set.`);
        }
        this.googleAI = new GoogleGenerativeAI(apiKey);
        console.log(`AI Manager initialized for model: ${this.config.model}`);
    }

    private tools = [
        {
            functionDeclarations: [
                {
                    name: "get_calendar_events",
                    description: "Get a list of calendar events for a given date range. The user can specify a date or use terms like 'today' or 'tomorrow'.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            startDate: { type: "STRING", description: "The start date in ISO 8601 format. Defaults to the beginning of the current day if not specified." },
                            endDate: { type: "STRING", description: "The end date in ISO 8601 format. Defaults to the end of the current day if not specified." },
                        },
                        required: [],
                    },
                },
                {
                    name: "list_calendars",
                    description: "Get a list of all available calendars for the user.",
                    parameters: {
                        type: "OBJECT",
                        properties: {},
                        required: [],
                    },
                },
                {
                    name: "create_calendar_event",
                    description: "Create a new calendar event. The user must provide a title, start time, and end time.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            calendarId: { type: "STRING", description: "The ID of the calendar to create the event in. The user should specify which calendar to use." },
                            summary: { type: "STRING", description: "The title or summary of the event." },
                            startTime: { type: "STRING", description: "The start time of the event in ISO 8601 format." },
                            endTime: { type: "STRING", description: "The end time of the event in ISO 8601 format." },
                            description: { type: "STRING", description: "A longer description for the event." },
                            location: { type: "STRING", description: "The location of the event." },
                        },
                        required: ["calendarId", "summary", "startTime", "endTime"],
                    },
                },
                {
                    name: "delete_calendar_event",
                    description: "Delete a calendar event. The user must provide the event ID and the calendar ID.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            eventId: { type: "STRING", description: "The ID of the event to delete." },
                            calendarId: { type: "STRING", description: "The ID of the calendar the event belongs to." },
                        },
                        required: ["eventId", "calendarId"],
                    },
                },
                {
                    name: "create_multiple_calendar_events",
                    description: "Create multiple calendar events from a list of tasks or a block of text. The user must provide the calendar ID and a list of event details.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            calendarId: { type: "STRING", description: "The ID of the calendar to create the events in." },
                            events: {
                                type: "ARRAY",
                                description: "An array of event objects to create.",
                                items: {
                                    type: "OBJECT",
                                    properties: {
                                        summary: { type: "STRING", description: "The title or summary of the event." },
                                        startTime: { type: "STRING", description: "The start time of the event in ISO 8601 format." },
                                        endTime: { type: "STRING", description: "The end time of the event in ISO 8601 format." },
                                    },
                                    required: ["summary", "startTime", "endTime"],
                                },
                            },
                        },
                        required: ["calendarId", "events"],
                    },
                },
            ],
        },
    ];

    async generateReflection(entry: string): Promise<string> {
        // ... (existing implementation)
        return "Not implemented for brevity in this example";
    }

    async generateChatResponse(history: ChatMessage[], modelName?: string): Promise<string | null> {
        const modelToUse = modelName || this.config.model;
        const model = this.googleAI.getGenerativeModel({
            model: modelToUse,
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                // ... other safety settings
            ],
            tools: this.tools,
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
                    return result.response.text();
                }

                console.log("Function call requested:", call.name);
                console.log("Arguments:", call.args);

                if (call.name === 'get_calendar_events') {
                    const { startDate: startDateStr, endDate: endDateStr } = call.args;

                    const startDate = startDateStr ? moment(startDateStr).startOf('day') : moment().startOf('day');
                    const endDate = endDateStr ? moment(endDateStr).endOf('day') : moment(startDate).clone().endOf('day');

                    try {
                        const calendars = await this.calendarManager.getCalendarList();
                        const allEvents: any[] = [];
                        for (const calendar of calendars) {
                            const events = await this.calendarManager.getCalendarEvents(startDate.format(), endDate.format(), [calendar.id]);
                            const eventsWithCalendar = events.map(e => ({
                                ...e,
                                calendar: { id: calendar.id, summary: calendar.summary }
                            }));
                            allEvents.push(...eventsWithCalendar);
                        }

                        const eventSummaries = allEvents.map(e => ({
                            summary: e.summary,
                            startTime: e.start.dateTime || e.start.date,
                            endTime: e.end.dateTime || e.end.date,
                            location: e.location,
                            calendar: e.calendar,
                        }));

                        const functionResponsePart: Part = {
                            functionResponse: {
                                name: 'get_calendar_events',
                                response: { events: eventSummaries },
                            },
                        };
                        result = await chat.sendMessage([functionResponsePart]);

                    } catch (e) {
                        console.error("Error getting calendar events:", e);
                        const functionResponsePart: Part = {
                            functionResponse: {
                                name: 'get_calendar_events',
                                response: { error: "Failed to retrieve calendar events." },
                            },
                        };
                        result = await chat.sendMessage([functionResponsePart]);
                    }
                } else if (call.name === 'list_calendars') {
                    try {
                        const calendars = await this.calendarManager.getCalendarList();
                        const calendarInfo = calendars.map(c => ({ id: c.id, summary: c.summary, primary: c.primary }));

                        const functionResponsePart: Part = {
                            functionResponse: {
                                name: 'list_calendars',
                                response: { calendars: calendarInfo },
                            },
                        };
                        result = await chat.sendMessage([functionResponsePart]);
                    } catch (e) {
                        console.error("Error listing calendars:", e);
                        const functionResponsePart: Part = {
                            functionResponse: {
                                name: 'list_calendars',
                                response: { error: "Failed to retrieve calendar list." },
                            },
                        };
                        result = await chat.sendMessage([functionResponsePart]);
                    }
                } else if (call.name === 'create_calendar_event') {
                    const { calendarId, summary, startTime, endTime, description, location } = call.args;
                    const event = { summary, start: { dateTime: startTime }, end: { dateTime: endTime }, description, location };
                    try {
                        const newEvent = await this.calendarManager.createCalendarEvent(event, calendarId);
                        const functionResponsePart: Part = {
                            functionResponse: { name: 'create_calendar_event', response: { event: newEvent } },
                        };
                        result = await chat.sendMessage([functionResponsePart]);
                    } catch (e) {
                        console.error("Error creating calendar event:", e);
                        const functionResponsePart: Part = {
                            functionResponse: { name: 'create_calendar_event', response: { error: "Failed to create calendar event." } },
                        };
                        result = await chat.sendMessage([functionResponsePart]);
                    }
                } else if (call.name === 'delete_calendar_event') {
                    const { eventId, calendarId } = call.args;
                    try {
                        await this.calendarManager.deleteCalendarEvent(eventId, calendarId);
                        const functionResponsePart: Part = {
                            functionResponse: { name: 'delete_calendar_event', response: { success: true } },
                        };
                        result = await chat.sendMessage([functionResponsePart]);
                    } catch (e) {
                        console.error("Error deleting calendar event:", e);
                        const functionResponsePart: Part = {
                            functionResponse: { name: 'delete_calendar_event', response: { error: "Failed to delete calendar event." } },
                        };
                        result = await chat.sendMessage([functionResponsePart]);
                    }
                } else if (call.name === 'create_multiple_calendar_events') {
                    const { calendarId, events } = call.args;
                    const results: any[] = [];
                    for (const ev of events) {
                        try {
                            const newEv = await this.calendarManager.createCalendarEvent({ summary: ev.summary, start: { dateTime: ev.startTime }, end: { dateTime: ev.endTime } }, calendarId);
                            results.push({ success: true, event: newEv });
                        } catch (e) {
                            results.push({ success: false, error: ev });
                        }
                    }
                    const functionResponsePart: Part = {
                        functionResponse: { name: 'create_multiple_calendar_events', response: { results } },
                    };
                    result = await chat.sendMessage([functionResponsePart]);
                } else {
                    console.warn(`Unrecognized function call: ${call.name}`);
                    return result.response.text();
                }
            }
        } catch (e) {
            console.error("Error in generateChatResponse:", e);
            return null;
        }
    }
}
