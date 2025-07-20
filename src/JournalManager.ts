// src/JournalManager.ts
import { Config } from './Config';
import { JournalEntry } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class JournalManager {
    private journalDir: string;

    constructor(config: Config) {
        this.journalDir = config.get().journal_directory;
    }

    private async ensureJournalDirExists(): Promise<void> {
        try {
            await fs.mkdir(this.journalDir, { recursive: true });
        } catch (error) {
            console.error(`Error creating journal directory at ${this.journalDir}:`, error);
            throw error;
        }
    }

    async getAllEntries(): Promise<JournalEntry[]> {
        await this.ensureJournalDirExists();
        const journalFiles = await fs.readdir(this.journalDir);
        const entries: JournalEntry[] = [];

        for (const journalFile of journalFiles) {
            if (path.extname(journalFile).match(/\.md$/)) {
                const filePath = path.join(this.journalDir, journalFile);
                try {
                    const fileContent = await fs.readFile(filePath, 'utf8');
                    const entry: JournalEntry = {
                        title: path.basename(journalFile, '.md'),
                        content: fileContent,
                        date: (await fs.stat(filePath)).mtime.toISOString(),
                    };
                    entries.push(entry);
                } catch (error) {
                    console.error(`Error reading or parsing journal file ${journalFile}:`, error);
                }
            }
        }
        return entries;
    }

    async createJournalEntry(entry: JournalEntry): Promise<void> {
        await this.ensureJournalDirExists();
        const fileName = `${entry.title.toLowerCase().replace(/\s+/g, '_')}.md`;
        const filePath = path.join(this.journalDir, fileName);
        await fs.writeFile(filePath, entry.content, 'utf8');
        console.log(`Journal entry "${entry.title}" created successfully at ${filePath}`);
    }
}
