// src/DatabaseManager.ts
import knex, { Knex } from 'knex';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';
import { Config } from './Config';
import { Project, Task } from './types';

export class DatabaseManager {
    private db: Knex;
    private config: Config;
    private projectsDir: string = path.resolve(process.cwd(), 'projects');

    constructor(config: Config) {
        this.config = config;
        const dbPath = this.config.getDbPath();
        console.log(`Database path set to: ${dbPath}`);

        this.db = knex({
            client: 'sqlite3',
            connection: {
                filename: dbPath,
            },
            useNullAsDefault: true,
        });
    }

    public getDb(): Knex {
        return this.db;
    }

    async init(): Promise<void> {
        console.log('Initializing database schema...');
        await this.createProjectsTable();
        await this.createTasksTable();
        // Add other table creations here (goals, journal, etc.)
        console.log('Database schema initialized.');
    }

    private async createProjectsTable(): Promise<void> {
        if (!(await this.db.schema.hasTable('projects'))) {
            await this.db.schema.createTable('projects', (table) => {
                table.string('id').primary();
                table.string('title').notNullable();
                table.text('body');
            });
        }
    }

    private async createTasksTable(): Promise<void> {
        if (!(await this.db.schema.hasTable('tasks'))) {
            await this.db.schema.createTable('tasks', (table) => {
                table.string('id').primary();
                table.string('projectId').references('id').inTable('projects').onDelete('CASCADE');
                table.string('title').notNullable();
                table.text('body');
                table.string('status').notNullable().defaultTo('To Do');
            });
        }
    }

    async migrateFromYaml(): Promise<void> {
        // Check if migration has already been done
        const migrationFlag = await this.db.schema.hasColumn('projects', 'migrated_from_yaml');
        if (migrationFlag) {
            console.log('Migration from YAML has already been completed. Skipping.');
            return;
        }

        console.log('Starting one-time migration from YAML files to SQLite...');
        try {
            const projectFiles = await fs.readdir(this.projectsDir);
            for (const projectFile of projectFiles) {
                if (path.extname(projectFile).match(/\.ya?ml$/)) {
                    const filePath = path.join(this.projectsDir, projectFile);
                    const fileContent = await fs.readFile(filePath, 'utf8');
                    const projectData = yaml.load(fileContent) as Project;

                    const projectId = projectData.id || uuidv4();
                    
                    // Insert project
                    await this.db('projects').insert({
                        id: projectId,
                        title: projectData.title,
                        body: projectData.body,
                    });

                    // Insert tasks
                    if (projectData.tasks) {
                        for (const task of projectData.tasks) {
                            await this.db('tasks').insert({
                                id: task.id || uuidv4(),
                                projectId: projectId,
                                title: task.title,
                                body: task.body,
                                status: task.status || 'To Do',
                            });
                        }
                    }
                }
            }
            // Add a flag column to prevent re-running the migration
            await this.db.schema.alterTable('projects', (table) => {
                table.boolean('migrated_from_yaml').defaultTo(true);
            });
            console.log('Migration from YAML to SQLite completed successfully.');
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('No legacy YAML project files found to migrate.');
                 await this.db.schema.alterTable('projects', (table) => {
                    table.boolean('migrated_from_yaml').defaultTo(true);
                });
            } else {
                console.error('Error during YAML migration:', error);
            }
        }
    }
}
