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
    private getCalendarManager: () => CalendarManager;
    private projectManager: ProjectManager;

    constructor(config: AIConfig, getCalendarManager: () => CalendarManager, projectManager: ProjectManager) {
        this.config = config;
        this.getCalendarManager = getCalendarManager;
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

    public reinitialize(newConfig: AIConfig): void {
        this.config = newConfig;
        this.initializeClient();
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
            {
                name: "get_projects_and_tasks",
                description: "Get a list of all projects and their associated tasks to understand the user's work.",
                parameters: { type: "OBJECT", properties: {} },
            },
            {
                name: "create_project",
                description: "Create a new project with a given title.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        title: { type: "STRING", description: "The title for the new project." },
                    },
                    required: ["title"],
                },
            },
            {
                name: "add_task_to_project",
                description: "Add a new task to a specified project.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        projectTitle: { type: "STRING", description: "The exact title of the project to add the task to." },
                        taskTitle: { type: "STRING", description: "The title of the new task." },
                        taskBody: { type: "STRING", description: "Optional description for the new task." },
                    },
                    required: ["projectTitle", "taskTitle"],
                },
            },
            {
                name: "update_task_status",
                description: "Update the status of an existing task. To get the task's details first, use `get_projects_and_tasks`.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        taskTitle: { type: "STRING", description: "The exact title of the task to update." },
                        newStatus: { type: "STRING", enum: ["To Do", "In Progress", "Done"], description: "The new status for the task." },
                    },
                    required: ["taskTitle", "newStatus"],
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

        const chatHistoryForInit: Content[] = history.map(msg => ({
            role: msg.role === 'system' ? 'user' : msg.role,
            parts: [{ text: msg.content }],
        }));

        if (chatHistoryForInit.length > 0 && chatHistoryForInit[0].role !== 'user') {
            chatHistoryForInit[0].role = 'user';
        }

        const chat = model.startChat({ history: chatHistoryForInit });
        const result = await chat.sendMessage(lastMessage.content);
        return this.processModelResponse(result, lastMessage.content, chat, onUpdate);
    }

    async continueChat(history: ChatMessage[], plan: AnyPlan, userResponse: string, onUpdate: (update: any) => void): Promise<ChatMessage> {
        if (!this.isReady() || !this.googleAI) {
            return { role: 'model', content: "The AI is not available." };
        }

        const model = this.googleAI.getGenerativeModel({ model: this.config.model, tools: this.getTools() });
        
        // We need to reconstruct the history for the model, including the original prompt that led to the plan.
        const chatHistory: Content[] = history.map(msg => ({
            role: msg.role === 'system' ? 'user' : msg.role,
            parts: [{ text: msg.content }],
        }));

        // The original user message that started this whole flow
        const originalUserMessage = history.find(m => m.role === 'user');
        if (!originalUserMessage) {
            return { role: 'model', content: "Error: Could not find the original user message in history." };
        }

        // Reconstruct the function call that led to the calendar selection request
        const functionCallPart: Part = {
            functionCall: {
                name: 'request_calendar_selection',
                args: (plan as CalendarSelectionRequest).calendars ? { calendars: (plan as CalendarSelectionRequest).calendars } : {},
            },
        };
        chatHistory.push({ role: 'model', parts: [functionCallPart] });

        // Construct the function response from the user's selection
        const functionResponsePart: Part = {
            functionResponse: {
                name: 'request_calendar_selection',
                response: { selectedCalendarId: userResponse },
            },
        };
        
        // Start a new chat with the reconstructed history
        const chat = model.startChat({ history: chatHistory });
        
        // Send the user's selection back to the model.
        // The model should now have enough context (original prompt + selected calendar)
        // to call `propose_calendar_action_plan`.
        const result = await chat.sendMessage([functionResponsePart]);
        
        // Process the response, which should hopefully be the final action plan.
        return this.processModelResponse(result, originalUserMessage.content, chat, onUpdate);
    }

    private async processModelResponse(
        result: any,
        originalPrompt: string,
        chat: any,
        onUpdate: (update: any) => void
    ): Promise<ChatMessage> {
        while (true) {
            const call = result.response.functionCalls()?.[0];
            if (!call) {
                const responseText = result.response.text();
                onUpdate({ status: 'done', content: 'Finished generating response.' });
                return { role: 'model', content: String(responseText) };
            }

            if (call.name === 'propose_calendar_action_plan' || call.name === 'request_calendar_selection') {
                onUpdate({ status: 'plan_generated', content: 'Plan ready for review.' });
                const plan: AnyPlan = {
                    type: call.name === 'propose_calendar_action_plan' ? 'calendar_plan' : 'calendar_selection_request',
                    originalPrompt: originalPrompt,
                    ...JSON.parse(JSON.stringify(call.args)),
                };
                return {
                    role: 'model',
                    content: String(call.args.summary),
                    plan: plan,
                };
            }

            onUpdate({ status: 'tool_call', name: call.name, args: call.args });
            const functionResponseParts: Part[] = [];
            try {
                let apiResponse;
                switch (call.name) {
                    case 'get_calendar_events':
                        const allCalendars = await this.getCalendarManager().getCalendarList();
                        const allCalendarIds = allCalendars.map(c => c.id);
                        apiResponse = { events: (await this.getCalendarManager().getCalendarEvents(call.args.startDate, call.args.endDate, allCalendarIds)).map(e => ({ id: e.id, summary: e.summary, start: e.start, end: e.end, calendarId: e.calendarId })) };
                        break;
                    case 'list_calendars':
                        const calendars = await this.getCalendarManager().getCalendarList();
                        apiResponse = { calendars: calendars.map(c => ({ id: c.id, summary: c.summary, primary: c.primary })) };
                        break;
                    case 'get_projects_and_tasks':
                        const projects = await this.projectManager.getAllProjects();
                        apiResponse = { projects: projects.map(p => ({ title: p.title, tasks: p.tasks.map(t => ({ title: t.title, status: t.status })) })) };
                        break;
                    case 'create_project':
                        await this.projectManager.createProject({ title: call.args.title });
                        apiResponse = { success: true, message: `Project '${call.args.title}' created.` };
                        break;
                    case 'add_task_to_project':
                        const allProjectsForAdd = await this.projectManager.getAllProjects();
                        const targetProject = allProjectsForAdd.find(p => p.title === call.args.projectTitle);
                        if (targetProject) {
                            await this.projectManager.addTask(targetProject.id, { title: call.args.taskTitle, body: call.args.taskBody || '', status: 'To Do' });
                            apiResponse = { success: true, message: `Task '${call.args.taskTitle}' added to project '${call.args.projectTitle}'.` };
                        } else {
                            apiResponse = { success: false, error: `Project '${call.args.projectTitle}' not found.` };
                        }
                        break;
                    case 'update_task_status':
                        const allProjectsForUpdate = await this.projectManager.getAllProjects();
                        let taskFound = false;
                        for (const project of allProjectsForUpdate) {
                            const targetTask = project.tasks.find(t => t.title === call.args.taskTitle);
                            if (targetTask) {
                                await this.projectManager.updateTask(targetTask.id, { status: call.args.newStatus });
                                apiResponse = { success: true, message: `Task '${call.args.taskTitle}' status updated to '${call.args.newStatus}'.` };
                                taskFound = true;
                                break;
                            }
                        }
                        if (!taskFound) {
                            apiResponse = { success: false, error: `Task '${call.args.taskTitle}' not found.` };
                        }
                        break;
                    default:
                        throw new Error(`Unrecognized function call: ${call.name}`);
                }
                functionResponseParts.push({ functionResponse: { name: call.name, response: apiResponse } });
            } catch (e) {
                console.error(`Error executing function ${call.name}:`, e);
                functionResponseParts.push({ functionResponse: { name: call.name, response: { error: e.message } } });
            }

            result = await chat.sendMessage(functionResponseParts);
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
            model: 'gemini-2.5-pro',
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
            model: 'gemini-2.5-pro',
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
