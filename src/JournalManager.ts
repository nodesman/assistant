// src/JournalManager.ts
import { FileManager } from './FileManager';
import { UserInterface } from './UserInterface';
import { EditorInteraction } from './EditorInteraction';
import { AIManager } from './AIManager';
import { JournalConfig, JournalEntry } from './types';
import moment from 'moment';

export class JournalManager {
    private fileManager: FileManager;
    private ui: UserInterface;
    private editor: EditorInteraction;
    private aiManager: AIManager;
    private config: JournalConfig;

    constructor(
        config: JournalConfig,
        fileManager: FileManager,
        ui: UserInterface,
        editor: EditorInteraction,
        aiManager: AIManager
    ) {
        this.config = config;
        this.fileManager = fileManager;
        this.ui = ui;
        this.editor = editor;
        this.aiManager = aiManager;
    }

    async startJournaling() {
        this.ui.displayMessage("Welcome to Journaling!");

        const topics = await this.fileManager.listTopics();
        let selectedTopic: string;

        const NEW_TOPIC_OPTION = "[Create New Topic]";
        if (topics.length > 0) {
            const choice = await this.ui.promptSelection("Select a journal topic or create a new one:", [...topics, NEW_TOPIC_OPTION]);
            if (choice === NEW_TOPIC_OPTION) {
                selectedTopic = await this.promptNewTopic();
            } else {
                selectedTopic = choice;
            }
        } else {
            this.ui.displayMessage("No existing topics found.");
            selectedTopic = await this.promptNewTopic();
        }

        this.ui.displayMessage(`\nSelected topic: ${selectedTopic}`);

        await this.writeAndReflect(selectedTopic);

        this.ui.displayMessage("\nJournaling session finished.");
    }

    private async promptNewTopic(): Promise<string> {
        let newTopic = '';
        while (!newTopic) {
            newTopic = await this.ui.promptInput("Enter the name for the new topic:");
            if (!newTopic) {
                this.ui.displayError("Topic name cannot be empty.");
            }
            // Add more validation if needed (e.g., check for invalid characters)
        }
        await this.fileManager.createTopic(newTopic); // Create the directory immediately
        return newTopic;
    }

    private async writeAndReflect(topic: string) {
        const entryFilePath = await this.fileManager.getOrCreateTodaysEntryPath(topic);
        let existingContent = '';
        try {
             existingContent = await this.fileManager.readJournalEntry(entryFilePath);
             this.ui.displayMessage(`Loaded existing entry for today: ${entryFilePath}`);
        } catch (error: any) {
             if (error.code === 'ENOENT') {
                 this.ui.displayMessage(`Creating new entry for today: ${entryFilePath}`);
             } else {
                 this.ui.displayError(`Error reading existing entry: ${error.message}`);
                 // Decide whether to proceed or exit
                 const proceed = await this.ui.promptConfirm("Could not read existing entry. Continue with a blank entry?", false);
                 if (!proceed) return;
             }
         }


        const userWrittenContent = await this.editor.CANCELLABLE_getUserInputViaEditor(
            `## Journal Entry: ${topic} - ${moment().format('YYYY-MM-DD')}\n\n(Write your thoughts below. Save and close the editor when finished.)\n---\n`,
            existingContent // Pass existing content to the editor
        );


        if (userWrittenContent === null) {
            this.ui.displayMessage("Journal entry cancelled or no input provided.");
            return; // Exit if user cancelled or provided no input
        }

        // Check if content actually changed compared to existing, ignoring whitespace differences perhaps
        if (userWrittenContent.trim() === existingContent.trim()) {
             this.ui.displayMessage("No changes made to the journal entry.");
             // Optionally ask if they want to reflect anyway?
             const reflectAnyway = await this.ui.promptConfirm("No changes detected. Do you still want to generate a reflection on the existing content?", false);
             if (!reflectAnyway) {
                 return;
             }
        }


        this.ui.displayMessage("Entry received. Generating AI reflection...");


        try {
            const reflection = await this.aiManager.generateReflection(userWrittenContent);
            this.ui.displayReflection(reflection);


            const saveWithReflection = await this.ui.promptConfirm(
                "Do you want to save this reflection appended to your journal entry?",
                 true
             );


             const entry: JournalEntry = {
                topic: topic,
                date: moment().format('YYYY-MM-DD'),
                content: userWrittenContent, // Save the latest content from the editor
                reflection: saveWithReflection ? reflection : undefined, // Store reflection if confirmed
                filePath: entryFilePath,
             };


             await this.fileManager.saveJournalEntry(entry, saveWithReflection);


         } catch (error: any) {
             this.ui.displayError("Failed to generate AI reflection or save entry.", error);
             // Ask user if they want to save the written content without reflection
             const saveAnyway = await this.ui.promptConfirm("An error occurred during reflection. Save your written entry without the reflection?", true);
             if (saveAnyway) {
                 const entry: JournalEntry = {
                    topic: topic,
                    date: moment().format('YYYY-MM-DD'),
                    content: userWrittenContent,
                    filePath: entryFilePath,
                 };
                 try {
                     await this.fileManager.saveJournalEntry(entry, false); // Save without reflection
                 } catch (saveError: any) {
                     this.ui.displayError("Failed to save the entry even without reflection.", saveError);
                 }
             }
         }
     }
}