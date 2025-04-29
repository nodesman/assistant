// src/Config.ts
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { JournalConfig } from './types';
import os from 'os';

// Define a standard location for this tool's user-specific config
const DEFAULT_USER_CONFIG_PATH = path.join(os.homedir(), '.config', 'personal-journal-cli', 'config.yaml');
// Path to the default config bundled with the application, relative to the compiled JS file location (e.g., dist/)
const BUNDLED_DEFAULT_CONFIG_PATH = path.resolve(__dirname, '../config/config.yaml');

export class Config {
    private configPath: string;
    private config: JournalConfig | null = null;

    constructor(configPath?: string) {
        this.configPath = configPath || DEFAULT_USER_CONFIG_PATH;
    }

    private expandTilde(filePath: string): string {
        if (filePath && filePath.startsWith('~')) {
            return path.join(os.homedir(), filePath.slice(1));
        }
        return filePath;
    }

    private async loadDefaults(): Promise<JournalConfig> {
        try {
            console.log(`Attempting to load bundled default config from: ${BUNDLED_DEFAULT_CONFIG_PATH}`);
            const defaultConfigContent = await fs.readFile(BUNDLED_DEFAULT_CONFIG_PATH, 'utf-8');
            const defaults = yaml.load(defaultConfigContent) as JournalConfig;
            if (!defaults || typeof defaults !== 'object') {
                throw new Error('Invalid default config format');
            }
            // Expand tilde in default journal directory if present
            defaults.journal_directory = this.expandTilde(defaults.journal_directory);

            console.log("Loaded default config:", defaults);
            return defaults;
        } catch(error) {
            console.error(`Error loading default config from ${BUNDLED_DEFAULT_CONFIG_PATH}:`, error);
            // Provide hardcoded fallback defaults if bundled file fails entirely
            // This should match the structure and essential fields of JournalConfig
            return {
                journal_directory: this.expandTilde("~/.personal_system/journal_entries"), // Use expanded path
                ai: {
                    model: "gemini-1.5-flash-latest",
                    api_key_env_var: "GOOGLE_API_KEY",
                    reflection_prompt: "Please reflect on this entry:\n{journal_entry}",
                },
                editor_command: "code -w", // Use the same default as the yaml
            };
        }
    }

    async loadConfig(): Promise<JournalConfig> {
        if (this.config) {
            return this.config;
        }

        const defaults = await this.loadDefaults();
        let userConfig: Partial<JournalConfig> = {};

        try {
            await fs.access(this.configPath);
            const userConfigContent = await fs.readFile(this.configPath, 'utf-8');
            const loadedUserConfig = yaml.load(userConfigContent);

            if (loadedUserConfig && typeof loadedUserConfig === 'object') {
                 userConfig = loadedUserConfig as Partial<JournalConfig>;
                 console.log(`Loaded user config from: ${this.configPath}`);
                 // Expand tilde in user-defined journal directory if present
                 if (userConfig.journal_directory) {
                      userConfig.journal_directory = this.expandTilde(userConfig.journal_directory);
                 }
            } else {
                 console.warn(`User config file at ${this.configPath} is empty or invalid. Using defaults.`);
                 userConfig = {};
            }

        } catch (error: any) {
            if (error.code === 'ENOENT') {
                console.log(`User config file not found at ${this.configPath}. Using defaults and creating the file.`);
                // If user config doesn't exist, we'll use defaults and try to create it
                await this.saveConfig(defaults); // Attempt to save defaults if user file missing
                userConfig = {}; // Ensure it's an empty object
            } else {
                 console.error(`Error reading user config file ${this.configPath}:`, error);
                 // Proceed with defaults, but don't necessarily overwrite a potentially corrupted file
                 userConfig = {};
            }
        }

        // Deep merge defaults and user config
        this.config = {
            ...defaults,
            ...userConfig,
            ai: { // Merge AI settings separately
                ...defaults.ai,
                ...(userConfig.ai || {}),
            },
         };

        // Validate essential fields after merging
        if (!this.config.journal_directory || !this.config.ai?.model || !this.config.ai?.api_key_env_var || !this.config.editor_command) {
             console.error("Essential configuration fields missing after merging defaults and user config. Please check config file or defaults.", this.config);
             throw new Error("Essential configuration fields missing.");
        }

         console.log("Final loaded config:", this.config);
        return this.config;
    }


    async saveConfig(configData: JournalConfig): Promise<void> {
        try {
            const configDir = path.dirname(this.configPath);
            await fs.mkdir(configDir, { recursive: true });

            // Prepare data for saving - potentially revert tilde expansion for journal_directory if desired
            const dataToSave = { ...configData };
            // Example: If you want to save "~" instead of the full path:
            // const homeDir = os.homedir();
            // if (dataToSave.journal_directory.startsWith(homeDir)) {
            //     dataToSave.journal_directory = `~${dataToSave.journal_directory.slice(homeDir.length)}`;
            // }

            const yamlContent = yaml.dump(dataToSave);
            await fs.writeFile(this.configPath, yamlContent, 'utf-8');
            console.log(`Configuration saved to ${this.configPath}`);
            this.config = configData; // Update internal cache with the potentially modified dataToSave if needed, or keep the runtime version (configData)
        } catch (error) {
            console.error(`Error saving configuration to ${this.configPath}:`, error);
        }
    }

    get(): JournalConfig {
        if (!this.config) {
            throw new Error("Config not loaded. Call loadConfig() first.");
        }
        return this.config;
    }
}