// src/AIManager.ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part, Content } from "@google/generative-ai";
import { AiClient, JournalConfig, ChatMessage, AIConfig } from "./types";
import { CalendarManager } from "./CalendarManager";
import moment from "moment";
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
    
    private tools = [
        {
            functionDeclarations: [
                // --- Project Management Tools ---
                {
                    name: "get_project_tasks",
                    description: "Get a list of all tasks for a given project title. Can also filter by status.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            projectTitle: { type: "STRING", description: "The title of the project to get tasks for." },
                            status: { type: "STRING", description: "Optional. The status to filter tasks by (e.g., 'To Do', 'In Progress')." }
                        },
                        required: ["projectTitle"],
                    },
                },
                // --- Calendar Management Tools ---
                {
                    name: "get_calendar_events",
                    description: "Get a list of calendar events for a given date range.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            startDate: { type: "STRING", description: "Start date in ISO 8601 format." },
                            endDate: { type: "STRING", description: "End date in ISO 8601 format." },
                        },
                        required: [],
                    },
                },
                {
                    name: "list_calendars",
                    description: "Get a list of all available calendars.",
                    parameters: { type: "OBJECT", properties: {} },
                },
                {
                    name: "create_multiple_calendar_events",
                    description: "Create multiple calendar events from a list of tasks.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            calendarId: { type: "STRING", description: "The ID of the calendar to create events in." },
                            events: {
                                type: "ARRAY",
                                description: "An array of event objects to create.",
                                items: {
                                    type: "OBJECT",
                                    properties: {
                                        summary: { type: "STRING", description: "The title of the event." },
                                        startTime: { type: "STRING", description: "Start time in ISO 8601 format." },
                                        endTime: { type: "STRING", description: "End time in ISO 8601 format." },
                                        description: { type: "STRING", description: "Optional description for the event." },
                                    },
                                    required: ["summary", "startTime", "endTime"],
                                },
                            },
                        },
                        required: ["calendarId", "events"],
                    },
                },
                // --- Import Tools (for file processing) ---
                {
                    name: "save_project_titles",
                    description: "Saves the list of project titles found in a document.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            project_titles: { type: "ARRAY", items: { type: "STRING" } },
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
                            title: { type: "STRING" },
                            body: { type: "STRING" },
                            tasks: {
                                type: "ARRAY",
                                items: {
                                    type: "OBJECT",
                                    properties: {
                                        title: { type: "STRING" },
                                        body: { type: "STRING" },
                                        status: { type: "STRING" },
                                    },
                                    required: ["title", "body", "status"],
                                },
                            },
                        },
                        required: ["title", "body", "tasks"],
                    },
                },
            ],
        },
    ];

    async extractProjectsAndTasks(fileContent: string, userPrompt: string, log: (message: string) => void): Promise<void> {
        if (!this.isReady() || !this.googleAI) {
            log("AI client is not initialized. Please configure the API key in settings.");
            return;
        }
        // This function remains unchanged as it uses a specific model with a subset of tools.
        const maxRetries = 3;
        log("Fetching existing projects from the database...");
        const existingProjects = await this.projectManager.getAllProjects();
        const existingTitles = new Set(existingProjects.map(p => p.title));
        log(`Found ${existingTitles.size} existing projects.`);
        log("Step 1: Identifying project titles from the document...");
        const getTitlesModel = this.googleAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            tools: [{ functionDeclarations: [this.tools[0].functionDeclarations.find(fd => fd.name === 'save_project_titles')] }],
        });
        const titlesPrompt = `Based on the following document, please identify all the project titles. ${userPrompt}\n---\n${fileContent}\n---`;
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
        const getDetailsModel = this.googleAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            tools: [{ functionDeclarations: [this.tools[0].functionDeclarations.find(fd => fd.name === 'save_project_details')] }],
        });
        for (const title of projectTitles) {
            if (existingTitles.has(title)) {
                log(`Skipping project "${title}" as it already exists.`);
                continue;
            }
            log(`Step 2: Extracting tasks for new project: "${title}"...`);
            const detailsPrompt = `From the document provided below, please extract the full details (body and all tasks) for the project titled "${title}".\n---\n${fileContent}\n---`;
            let success = false;
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const result = await getDetailsModel.generateContent(detailsPrompt);
                    const call = result.response.functionCalls()?.[0];
                    if (call && call.name === 'save_project_details' && call.args.title) {
                        const projectData = call.args;
                        log(`  - Successfully extracted details for "${title}". Saving to database...`);
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
                        break;
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
        if (!this.isReady()) {
            return "AI client is not configured. Please set your API key in the settings.";
        }
        return "Not implemented for brevity in this example";
    }

    async generateChatResponse(history: ChatMessage[], modelName?: string): Promise<string | null> {
        if (!this.isReady() || !this.googleAI) {
            return "The AI is not available. Please check your API key in the settings.";
        }
        
        const model = this.googleAI.getGenerativeModel({
            model: modelName || this.config.model,
            tools: this.tools,
        });

        const googleChatHistory: Content[] = history.map(msg => ({
            role: msg.role === 'system' ? 'user' : msg.role, // System messages are treated as user messages for history
            parts: [{ text: msg.content }],
        }));

        const chat = model.startChat({ history: googleChatHistory.slice(0, -1) });
        const lastMessage = history[history.length - 1].content;

        try {
            let result = await chat.sendMessage(lastMessage);

            while (true) {
                const call = result.response.functionCalls()?.[0];
                if (!call) {
                    return result.response.text(); // No function call, return the text response
                }

                console.log("Function call requested:", call.name, "with arguments:", call.args);
                const functionResponseParts: Part[] = [];

                // --- Execute Function Call ---
                try {
                    let apiResponse;
                    switch (call.name) {
                        case 'get_project_tasks':
                            const projects = await this.projectManager.getAllProjects();
                            const project = projects.find(p => p.title.toLowerCase() === call.args.projectTitle.toLowerCase());
                            if (!project) {
                                apiResponse = { error: `Project with title '${call.args.projectTitle}' not found.` };
                            } else {
                                let tasks = project.tasks;
                                if (call.args.status) {
                                    tasks = tasks.filter(t => t.status.toLowerCase() === call.args.status.toLowerCase());
                                }
                                apiResponse = { tasks };
                            }
                            break;

                        case 'list_calendars':
                            const calendars = await this.calendarManager.getCalendarList();
                            apiResponse = { calendars: calendars.map(c => ({ id: c.id, summary: c.summary, primary: c.primary })) };
                            break;

                        case 'create_multiple_calendar_events':
                            const createdEvents = [];
                            for (const event of call.args.events) {
                                try {
                                    const newEvent = await this.calendarManager.createCalendarEvent({
                                        summary: event.summary,
                                        start: { dateTime: event.startTime },
                                        end: { dateTime: event.endTime },
                                        description: event.description,
                                    }, call.args.calendarId);
                                    createdEvents.push({ success: true, event: newEvent });
                                } catch (e) {
                                    createdEvents.push({ success: false, error: e.message, eventSummary: event.summary });
                                }
                            }
                            apiResponse = { results: createdEvents };
                            break;
                        
                        // Add other calendar cases here if needed in chat

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

                // --- Send Response Back to Model ---
                result = await chat.sendMessage(functionResponseParts);
            }
        } catch (e) {
            console.error("Error in generateChatResponse:", e);
            return "An error occurred while processing your request.";
        }
    }
}
