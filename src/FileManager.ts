// src/FileManager.ts
import fs, { Dirent } from 'fs/promises'; // Import Dirent
import path from 'path';
import os from 'os';
import { JournalEntry } from './types';
import moment from 'moment';

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

    getTopicDir(topic: string): string {
        // Sanitize topic name to be filesystem-friendly if needed
        const sanitizedTopic = topic.replace(/[^a-zA-Z0-9-_]/g, '_');
        return path.join(this.journalBaseDir, sanitizedTopic);
    }

    getEntryFilePath(topic: string, date: string = moment().format('YYYY-MM-DD')): string {
        const topicDir = this.getTopicDir(topic);
        return path.join(topicDir, `${date}.md`); // Use markdown extension
    }

    async listTopics(): Promise<string[]> {
        try {
            await this.ensureBaseDirExists();
            const entries = await fs.readdir(this.journalBaseDir, { withFileTypes: true });
            return entries
                .filter((dirent: Dirent) => dirent.isDirectory()) // Add Dirent type
                .map((dirent: Dirent) => dirent.name); // Add Dirent type
        } catch (error) {
            console.error("Error listing journal topics:", error);
            return [];
        }
    }

    async createTopic(topic: string): Promise<void> {
        const topicDir = this.getTopicDir(topic);
        await this.ensureDirExists(topicDir);
        console.log(`Created topic directory: ${topicDir}`);
    }

    async readJournalEntry(filePath: string): Promise<string> {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            // Simple read for now, might parse frontmatter later
            return content;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                // File doesn't exist, return empty string for a new entry
                return '';
            }
            console.error(`Error reading journal entry ${filePath}:`, error);
            throw error; // Re-throw other errors
        }
    }

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
        }
    }

    async getOrCreateTodaysEntryPath(topic: string): Promise<string> {
        const today = moment().format('YYYY-MM-DD');
        const filePath = this.getEntryFilePath(topic, today);
        const topicDir = this.getTopicDir(topic);
        await this.ensureDirExists(topicDir); // Ensure topic dir exists before checking file
        return filePath;
    }
}