// src/ProjectManager.ts
import { Project, Task } from './types';
import { DatabaseManager } from './DatabaseManager';
import { v4 as uuidv4 } from 'uuid';
import { Knex } from 'knex';

export class ProjectManager {
    private db: Knex;

    constructor(dbManager: DatabaseManager) {
        this.db = dbManager.getDb();
    }

    async getAllProjects(): Promise<Project[]> {
        const projects = await this.db('projects').select('*');
        for (const project of projects) {
            project.tasks = await this.db('tasks').where('projectId', project.id);
        }
        return projects;
    }

    async createProject(projectData: Partial<Project>): Promise<void> {
        const newProject = {
            id: uuidv4(),
            ...projectData,
        };
        await this.db('projects').insert(newProject);
    }

    async addTask(projectId: string, taskData: Partial<Task>): Promise<void> {
        // addTask called
        const newTask = {
            id: uuidv4(),
            projectId: projectId,
            ...taskData,
        };
        await this.db('tasks').insert(newTask);
    }

    async updateTask(taskId: string, taskData: Partial<Task>): Promise<void> {
        // updateTask called
        await this.db('tasks').where('id', taskId).update(taskData);
    }

    async deleteTask(taskId: string): Promise<void> {
        await this.db('tasks').where('id', taskId).del();
    }
}
