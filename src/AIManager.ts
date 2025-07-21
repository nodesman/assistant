// src/AIManager.ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part, Content } from "@google/generative-ai";
import { AiClient, JournalConfig, ChatMessage } from "./types";
import { CalendarManager } from "./CalendarManager";
import moment from "moment";

import { ProjectManager } from "./ProjectManager";

export class AIManager implements AiClient {
    private config: JournalConfig['ai'];
    private googleAI: GoogleGenerativeAI;
    private calendarManager: CalendarManager;
    private projectManager: ProjectManager;

    constructor(config: JournalConfig['ai'], calendarManager: CalendarManager, projectManager: ProjectManager) {
        this.config = config;
        this.calendarManager = calendarManager;
        this.projectManager = projectManager;
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
                    name: "save_project_titles",
                    description: "Saves the list of project titles found in the document.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            project_titles: {
                                type: "ARRAY",
                                description: "An array of project titles.",
                                items: { type: "STRING" },
                            },
                        },
                        required: ["project_titles"],
                    },
                },
                {
                    name: "save_project_details",
                    description: "Saves the details of a single project, including its tasks.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            title: { type: "STRING", description: "The title of the project." },
                            body: { type: "STRING", description: "A detailed description of the project." },
                            tasks: {
                                type: "ARRAY",
                                description: "An array of task objects for the project.",
                                items: {
                                    type: "OBJECT",
                                    properties: {
                                        title: { type: "STRING", description: "The title of the task." },
                                        body: { type: "STRING", description: "A detailed description of the task." },
                                        status: { type: "STRING", description: "The status of the task, e.g., 'To Do', 'In Progress', 'Done'." },
                                    },
                                    required: ["title", "body", "status"],
                                },
                            },
                        },
                        required: ["title", "body", "tasks"],
                    },
                },
                // ... other tools like get_calendar_events etc.
            ],
        },
    ];

    async extractProjectsAndTasks(fileContent: string, userPrompt: string, log: (message: string) => void): Promise<void> {
        const maxRetries = 3;

        // --- Step 1: Get Existing Project Titles ---
        log("Fetching existing projects from the database...");
        const existingProjects = await this.projectManager.getAllProjects();
        const existingTitles = new Set(existingProjects.map(p => p.title));
        log(`Found ${existingTitles.size} existing projects.`);

        // --- Step 2: Get Project Titles from Document ---
        log("Step 1: Identifying project titles from the document...");
        const getTitlesModel = this.googleAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            tools: [{ functionDeclarations: [this.tools[0].functionDeclarations.find(fd => fd.name === 'save_project_titles')] }],
        });

        const titlesPrompt = `Based on the following document, please identify all the project titles.
            ${userPrompt}
            ---
            ${fileContent}
            ---
        `;

        let projectTitles = [];
        try {
            const result = await getTitlesModel.generateContent(titlesPrompt);
            const call = result.response.functionCalls()?.[0];
            if (call && call.name === 'save_project_titles' && call.args.project_titles) {
                projectTitles = call.args.project_titles;
                log(`Found ${projectTitles.length} projects in the document: ${projectTitles.join(', ')}`);
            } else {
                log("Error: Could not identify project titles from the document.");
                return;
            }
        } catch (e) {
            log(`Error during project title extraction: ${e.message}`);
            return;
        }

        // --- Step 3: Get Tasks for Each NEW Project and Save ---
        const getDetailsModel = this.googleAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            tools: [{ functionDeclarations: [this.tools[0].functionDeclarations.find(fd => fd.name === 'save_project_details')] }],
        });

        for (const title of projectTitles) {
            if (existingTitles.has(title)) {
                log(`Skipping project "${title}" as it already exists.`);
                continue;
            }

            log(`Step 2: Extracting tasks for new project: "${title}"...`);
            const detailsPrompt = `From the document provided below, please extract the full details (body and all tasks) for the project titled "${title}".
                ---
                ${fileContent}
                ---
            `;

            let success = false;
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const result = await getDetailsModel.generateContent(detailsPrompt);
                    const call = result.response.functionCalls()?.[0];

                    if (call && call.name === 'save_project_details' && call.args.title) {
                        const projectData = call.args;
                        log(`  - Successfully extracted details for "${title}". Saving to database...`);

                        // Save the project and its tasks
                        const newProject = await this.projectManager.createProject({ title: projectData.title, body: projectData.body });
                        if (newProject) {
                            for (const task of projectData.tasks) {
                                await this.projectManager.addTask(newProject.id, task);
                            }
                            log(`  - Successfully saved project "${title}" and its ${projectData.tasks.length} tasks.`);
                        } else {
                            log(`  - ERROR: Failed to create project "${title}" in the database.`);
                        }
                        success = true;
                        break; // Exit retry loop on success
                    }
                } catch (e) {
                    log(`  - Error on attempt ${attempt} for project "${title}": ${e.message}`);
                }
                if (attempt < maxRetries) {
                   log(`  - Retry attempt ${attempt + 1} for project "${title}"...`);
                }
            }
            if (!success) {
                log(`  - FAILED to extract details for project "${title}" after ${maxRetries} attempts.`);
            }
        }

        log("Import process complete.");
    }
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
