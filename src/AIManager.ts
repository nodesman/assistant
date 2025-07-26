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
            1.  **Infer Titles:** When creating events, you MUST infer a descriptive, concise title from the user's prompt. For example, if the user says 'schedule a run', the event title should be 'Run', not a generic 'Event'.
            2.  **Gather Information:** Use the \`list_calendars\` and \`get_calendar_events\` tools to understand the user's current state.
            3.  **Clarify Ambiguity:** If the user's request could apply to multiple calendars (e.g., "delete my meetings"), you MUST use the \`request_calendar_selection\` tool to ask the user for clarification. Do not guess.
            4.  **Propose a Plan:** Once you have all the necessary information (including a specific calendar ID), you MUST end the conversation by calling the \`propose_calendar_action_plan\` tool. This presents the final, concrete plan to the user for approval.
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
            // Convert 'system' role to 'user' for the API
            role: msg.role === 'system' ? 'user' : msg.role,
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

    async extractProjectsAndTasks(fileContent: string, userPrompt: string, log: (message: string) => void): Promise<void> {
        if (!this.isReady() || !this.googleAI) {
            log("AI client is not initialized. Please configure the API key in settings.");
            return;
        }
        
        const projectTools: FunctionDeclarationsTool[] = [{
            functionDeclarations: [
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
            ]
        }];

        const maxRetries = 3;
        log("Fetching existing projects from the database...");
        const existingProjects = await this.projectManager.getAllProjects();
        const existingTitles = new Set(existingProjects.map(p => p.title));
        log(`Found ${existingTitles.size} existing projects.`);
        log("Step 1: Identifying project titles from the document...");
        const getTitlesModel = this.googleAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            tools: [{ functionDeclarations: [projectTools[0].functionDeclarations.find(fd => fd.name === 'save_project_titles')] }],
        });
        const titlesPrompt = `You are an expert at parsing documents to extract project structures. A project is typically a heading or a title followed by a body of text and a list of tasks. Based on the following document, please identify all of the distinct project titles. ${userPrompt}\n---\n${fileContent}\n---`;
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
            tools: [{ functionDeclarations: [projectTools[0].functionDeclarations.find(fd => fd.name === 'save_project_details')] }],
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
}
