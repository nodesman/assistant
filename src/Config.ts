// src/Config.ts
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { JournalConfig } from './types';
import os from 'os';

// Define a standard location for this tool's user-specific config
const DEFAULT_USER_CONFIG_PATH = path.join(os.homedir(), '.config', 'personal-journal-cli', 'config.yaml');
// Path to the default config bundled with the application
const BUNDLED_DEFAULT_CONFIG_PATH = path.resolve(process.cwd(), 'config/config.yaml');

export class Config {
    private static _instance: Config;
    private configPath: string;
    private _config: JournalConfig | null = null;

    private constructor(configPath?: string) {
        this.configPath = configPath || DEFAULT_USER_CONFIG_PATH;
    }

    public static async getInstance(configPath?: string): Promise<Config> {
        if (!Config._instance) {
            const newInstance = new Config(configPath);
            await newInstance.loadConfig();
            Config._instance = newInstance;
        }
        return Config._instance;
    }

    private expandTilde(filePath: string): string {
        if (filePath && filePath.startsWith('~')) {
            return path.join(os.homedir(), filePath.slice(1));
        }
        return filePath;
    }

    private async loadDefaults(): Promise<JournalConfig> {
        try {
            const defaultConfigContent = await fs.readFile(BUNDLED_DEFAULT_CONFIG_PATH, 'utf-8');
            const defaults = yaml.load(defaultConfigContent) as JournalConfig;
            defaults.journal_directory = this.expandTilde(defaults.journal_directory);
            return defaults;
        } catch(error) {
            console.error(`Error loading default config:`, error);
            return {
                journal_directory: this.expandTilde("~/.personal_system/journal_entries"),
                ai: {
                    model: "gemini-1.5-flash-latest",
                    api_key_env_var: "GOOGLE_API_KEY",
                    reflection_prompt: "Please reflect on this entry:\n{journal_entry}",
                },
                editor_command: "code -w",
            };
        }
    }

    private async loadConfig(): Promise<void> {
        const defaults = await this.loadDefaults();
        let userConfig: Partial<JournalConfig> = {};

        try {
            const userConfigContent = await fs.readFile(this.configPath, 'utf-8');
            userConfig = yaml.load(userConfigContent) as Partial<JournalConfig>;
            if (userConfig.journal_directory) {
                userConfig.journal_directory = this.expandTilde(userConfig.journal_directory);
            }
        } catch (error: any) {
            // Ignore ENOENT, handle other errors
            if (error.code !== 'ENOENT') {
                console.error(`Error reading user config file:`, error);
            }
        }

        this._config = {
            ...defaults,
            ...userConfig,
            ai: { ...defaults.ai, ...(userConfig.ai || {}) },
            google_auth: { ...defaults.google_auth, ...(userConfig.google_auth || {}) },
         };
    }

    public get(): JournalConfig {
        if (!this._config) {
            throw new Error("Config not loaded. This should not happen.");
        }
        return this._config;
    }

    public getUserConfigPath(): string {
        return this.configPath;
    }
}
