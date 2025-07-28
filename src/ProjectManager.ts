// src/ProjectManager.ts
import { PrismaClient, Project, Task } from '@prisma/client';
import { DatabaseManager } from './DatabaseManager';

export class ProjectManager {
    private prisma: PrismaClient;

    constructor(dbManager: DatabaseManager) {
        this.prisma = dbManager.prisma;
    }

    async getAllProjects(): Promise<Project[]> {
        return this.prisma.project.findMany({
            include: {
                tasks: true,
            },
        });
    }

    async createProject(projectData: { title: string; body?: string }): Promise<Project> {
        return this.prisma.project.create({
            data: projectData,
        });
    }

    async addTask(
        projectId: string,
        taskData: {
            title: string;
            body?: string;
            status?: string;
            duration?: number;
            minChunk?: number;
            location?: string;
        },
    ): Promise<Task> {
        return this.prisma.task.create({
            data: {
                ...taskData,
                projectId: projectId,
            },
        });
    }

    async updateTask(taskId: string, taskData: Partial<Task>): Promise<Task> {
        // Omit id and projectId from the update data, as they should not be changed.
        const { id, projectId, ...dataToUpdate } = taskData;
        return this.prisma.task.update({
            where: { id: taskId },
            data: dataToUpdate,
        });
    }

    async deleteTask(taskId: string): Promise<Task> {
        return this.prisma.task.delete({
            where: { id: taskId },
        });
    }
}