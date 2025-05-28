// src/FileManager.ts
import fs from 'fs/promises';
import { Dirent } from 'fs'; // Import Dirent from the base 'fs' module
import path from 'path';
import os from 'os';
import { JournalEntry } from './types';
// import moment from 'moment'; // No longer needed for daily files
import YAML from 'js-yaml'; // To parse/dump state file
import { TopicState } from './types'; // Import the new state type

// Default filenames within a topic directory
const NOTES_FILENAME = 'notes.md';
const STATE_FILENAME = 'state.yaml';
const CHATLOG_FILENAME = 'chat_log.md';

export class FileManager {
    private journalBaseDir: string;

    constructor(journalBaseDir: string) {
        this.journalBaseDir = this.expandTilde(journalBaseDir);
    }

    private expandTilde(filePath: string): string {
        if (filePath.startsWith('~')) {
            return path.join(os.homedir(), filePath.slice(1));
        }
        return filePath;
    }

    async ensureDirExists(dirPath: string): Promise<void> {
        try {
            await fs.access(dirPath);
        } catch (error) {
            // Directory does not exist, create it
            await fs.mkdir(dirPath, { recursive: true });
            console.log(`Created directory: ${dirPath}`);
        }
    }

    async ensureBaseDirExists(): Promise<void> {
        await this.ensureDirExists(this.journalBaseDir);
    }

    // --- Path Helpers ---
    getTopicDir(topic: string): string {
        // Sanitize topic name to be filesystem-friendly if needed
        const sanitizedTopic = topic.replace(/[^a-zA-Z0-9-_.]/g, '_'); // Allow dots
        return path.join(this.journalBaseDir, sanitizedTopic);
    }
    getNotesPath(topic: string): string {
        return path.join(this.getTopicDir(topic), NOTES_FILENAME);
    }
    getStatePath(topic: string): string {
        return path.join(this.getTopicDir(topic), STATE_FILENAME);
    }
    getChatLogPath(topic: string): string {
        return path.join(this.getTopicDir(topic), CHATLOG_FILENAME);
    }
    // --- End Path Helpers ---

    async listTopics(): Promise<string[]> {
        try {
            await this.ensureBaseDirExists();
            const entries = await fs.readdir(this.journalBaseDir, { withFileTypes: true });
            return entries
                .filter((dirent: Dirent) => dirent.isDirectory()) // Use imported Dirent type
                .map((dirent: Dirent) => dirent.name); // Use imported Dirent type
        } catch (error) {
            console.error("Error listing journal topics:", error);
            return [];
        }
    }

    async createTopic(topic: string): Promise<void> {
        const topicDir = this.getTopicDir(topic);
        await this.ensureDirExists(topicDir);
        console.log(`Created topic directory: ${topicDir}`);

        // Initialize standard files
        const notesPath = this.getNotesPath(topic);
        const statePath = this.getStatePath(topic);

        // Create empty notes file if it doesn't exist
        try {
            await fs.access(notesPath);
        } catch {
            await fs.writeFile(notesPath, `# ${topic}\n\n## Log\n\n## Board\n\n## Nodes\n`, 'utf-8');
            console.log(`Initialized ${NOTES_FILENAME}`);
        }

        // Create default state file if it doesn't exist
        try {
            await fs.access(statePath);
        } catch {
            const defaultState: TopicState = { status: 'active', board: { Pending: [], Doing: [], Done: [] } };
            await this.writeTopicState(topic, defaultState);
            console.log(`Initialized ${STATE_FILENAME}`);
        }
    }

    // Renamed to reflect reading the main notes file
    async readNotesFile(topic: string): Promise<string> {
        const notesPath = this.getNotesPath(topic);
        try {
            const content = await fs.readFile(notesPath, 'utf-8');
            return content;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                // If notes file doesn't exist (should be created by createTopic normally)
                return '';
            }
            console.error(`Error reading notes file ${notesPath}:`, error);
            throw error; // Re-throw other errors
        }
    }

    /* // This method is replaced by more specific save logic in JournalManager
        async saveJournalEntry(entry: JournalEntry, includeReflection: boolean = false): Promise<void> {
        const topicDir = this.getTopicDir(entry.topic);
        await this.ensureDirExists(topicDir); // Ensure topic dir exists

        let contentToSave = entry.content;
        if (includeReflection && entry.reflection) {
            contentToSave += `\n\n---\n\n**Reflection (${moment().format('YYYY-MM-DD HH:mm')})**\n\n${entry.reflection}`;
        }

        try {
            await fs.writeFile(entry.filePath, contentToSave, 'utf-8');
            console.log(`Journal entry saved to: ${entry.filePath}`);
        } catch (error) {
            console.error(`Error saving journal entry ${entry.filePath}:`, error);
            throw error;
        } */

    async writeNotesFile(topic: string, content: string): Promise<void> {
        const notesPath = this.getNotesPath(topic);
        await this.ensureDirExists(this.getTopicDir(topic)); // Ensure dir exists
        await fs.writeFile(notesPath, content, 'utf-8');
        console.log(`Notes saved to: ${notesPath}`);
    }

    async readTopicState(topic: string): Promise<TopicState> {
        const statePath = this.getStatePath(topic);
        try {
            const content = await fs.readFile(statePath, 'utf-8');
            const state = YAML.load(content) as TopicState;
            // Provide defaults if file exists but is empty/malformed
            return state || { status: 'active', board: { Pending: [], Doing: [], Done: [] } };
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                // Return default state if file doesn't exist
                console.log(`State file not found for topic ${topic}, returning default state.`);
                return { status: 'active', board: { Pending: [], Doing: [], Done: [] } };
            }
            console.error(`Error reading state file ${statePath}:`, error);
            throw error; // Re-throw other errors
        }
    }

    async writeTopicState(topic: string, state: TopicState): Promise<void> {
        const statePath = this.getStatePath(topic);
        await this.ensureDirExists(this.getTopicDir(topic)); // Ensure dir exists
        const yamlContent = YAML.dump(state);
        await fs.writeFile(statePath, yamlContent, 'utf-8');
        console.log(`State saved to: ${statePath}`);
    }

    async appendChatLog(topic: string, chatContent: string): Promise<void> {
        const chatLogPath = this.getChatLogPath(topic);
        await this.ensureDirExists(this.getTopicDir(topic)); // Ensure dir exists
        await fs.appendFile(chatLogPath, chatContent, 'utf-8'); // Use appendFile
        console.log(`Chat log appended to: ${chatLogPath}`);
    }

}