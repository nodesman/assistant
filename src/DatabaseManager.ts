// src/DatabaseManager.ts
import { PrismaClient } from '@prisma/client';
import { Config } from './Config';
import * as path from 'path';

export class DatabaseManager {
    private static _instance: DatabaseManager;
    private _prisma: PrismaClient;

    private constructor(config: Config) {
        const dbPath = config.getDbPath();
        const dbUrl = `file:${path.resolve(dbPath)}`;
        process.env.DATABASE_URL = dbUrl;

        this._prisma = new PrismaClient();
    }

    public static getInstance(config: Config): DatabaseManager {
        if (!DatabaseManager._instance) {
            DatabaseManager._instance = new DatabaseManager(config);
        }
        return DatabaseManager._instance;
    }

    public get prisma(): PrismaClient {
        return this._prisma;
    }

    async init(): Promise<void> {
        // With Prisma, the schema is managed by migrations,
        // but we can run a migration check here.
        // In a real app, you'd run `prisma migrate deploy` as part of your build/deploy process.
        console.log('Database connection initialized with Prisma.');
        // The following is a placeholder for potential future migration logic.
        // For now, we assume migrations are handled outside the app's runtime.
    }
}