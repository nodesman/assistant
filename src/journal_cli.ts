#!/usr/bin/env node
// src/journal_cli.ts

import { Command } from 'commander';
import path from 'path';
import os from 'os';
import { Config } from './Config';
import { FileManager } from './FileManager';
import { UserInterface } from './UserInterface';
import { EditorInteraction } from './EditorInteraction';
import { AIManager } from './AIManager';
import { JournalManager } from './JournalManager';
import { JournalConfig } from './types';

async function main() {
    const program = new Command();

    program
        .version('0.1.0')
        .description('CLI tool for periodic journaling with AI reflection')
        .option('-c, --config <path>', 'Path to configuration file')
        // Add other options if needed, e.g., specifying a topic directly
        .parse(process.argv);

    const options = program.opts();

    // --- Configuration ---
    // Define a standard location for this tool's config
    const defaultConfigPath = path.join(os.homedir(), '.config', 'personal-journal-cli', 'config.yaml');
    const configLoader = new Config(options.config || defaultConfigPath);
    let config: JournalConfig;
    try {
        config = await configLoader.loadConfig();
    } catch (error: any) {
        console.error(`Error loading configuration: ${error.message}`);
        // No UI instance here yet, maybe create a basic one just for error?
        // ui.displayError(`Error loading configuration:`, error); // If UI was available
        process.exit(1);
    }

    // --- Instantiate UI early for potential error reporting ---
    const ui = new UserInterface();

    try {
        // Ensure the journal directory exists using the loaded config path
        const fileManagerForInit = new FileManager(config.journal_directory);
        await fileManagerForInit.ensureBaseDirExists();
        console.log(`Using journal directory: ${config.journal_directory}`);

        // --- Dependency Injection (Now that config is guaranteed to be loaded) ---
        const fileManager = new FileManager(config.journal_directory);
        // Use editor_command, provide a fallback if it's null/undefined
        const editorCmd = config.editor_command || process.env.EDITOR || 'code -w'; // Example fallback logic
        const editorInteraction = new EditorInteraction(editorCmd);
        const aiManager = new AIManager(config.ai); // Pass only the AI part of config

        const journalManager = new JournalManager(
            config,
            fileManager,
            ui,
            editorInteraction,
            aiManager
        );
        await journalManager.startJournaling();
    } catch (error: any) {
        ui.displayError("An unexpected error occurred:", error);
        process.exit(1);
    }
}

main().catch((err) => {
    console.error("Failed to run journal CLI:", err);
    process.exit(1);
});