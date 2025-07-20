import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Horizons } from './types';
import { Config } from './Config';

export class HorizonsManager {
    private horizonsFilePath: string;

    constructor(config: Config) {
        const configDir = path.dirname(config.getUserConfigPath());
        this.horizonsFilePath = path.join(configDir, 'horizons.yml');
    }

    async getHorizons(): Promise<Horizons> {
        try {
            await fs.access(this.horizonsFilePath);
            const fileContent = await fs.readFile(this.horizonsFilePath, 'utf8');
            const data = yaml.load(fileContent) as Horizons;
            return {
                purpose: data.purpose || { purpose: 'Not yet defined.', principles: [] },
                goals: data.goals || [],
            };
        } catch (error) {
            return {
                purpose: { purpose: 'Not yet defined.', principles: [] },
                goals: [],
            };
        }
    }

    async saveHorizons(horizons: Horizons): Promise<void> {
        await fs.writeFile(this.horizonsFilePath, yaml.dump(horizons), 'utf8');
    }
}
