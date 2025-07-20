import { google } from 'googleapis';
import { GoogleAuthService } from './GoogleAuthService';
import { Project, Task, Config } from './types';

export class CalendarManager {
    private googleAuthService: GoogleAuthService;
    private calendar: any | null = null;

    constructor(config: Config) {
        this.googleAuthService = new GoogleAuthService(config);
    }

    private async getCalendarClient(): Promise<any> {
        if (this.calendar) {
            return this.calendar;
        }
        const auth = await this.googleAuthService.getOAuth2Client();
        this.calendar = (google as any).calendar({ version: 'v3', auth });
        return this.calendar;
    }

    async getCalendarEvents(calendarId: string = 'primary'): Promise<any[]> {
        const calendar = await this.getCalendarClient();
        try {
            const response = await calendar.events.list({
                calendarId,
                timeMin: (new Date()).toISOString(),
                maxResults: 10,
                singleEvents: true,
                orderBy: 'startTime',
            });
            return response.data.items;
        } catch (error) {
            console.error('Error fetching calendar events:', error);
            throw error;
        }
    }

    /**
     * Fetches free/busy information for a given time range and calendar.
     * @param timeMin Start time (ISO 8601).
     * @param timeMax End time (ISO 8601).
     * @param calendarId The ID of the calendar to check.
     * @returns Free/busy data.
     */
    async getFreeBusy(timeMin: string, timeMax: string, calendarId: string = 'primary'): Promise<any> {
        const calendar = await this.getCalendarClient();
        try {
            const response = await calendar.freebusy.query({
                requestBody: {
                    timeMin,
                    timeMax,
                    items: [{ id: calendarId }],
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching free/busy data:', error);
            throw error;
        }
    }

    /**
     * Creates a calendar event for a task.
     * @param task The task to schedule.
     * @param startTime The start time of the event (ISO 8601).
     * @param endTime The end time of the event (ISO 8601).
     * @param calendarId The ID of the calendar to add the event to.
     * @returns The created event data.
     */
    async createCalendarEvent(
        task: Task,
        startTime: string,
        endTime: string,
        calendarId: string = 'primary'
    ): Promise<any> {
        const calendar = await this.getCalendarClient();
        try {
            const event = {
                summary: task.title,
                description: task.body,
                start: { dateTime: startTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
                end: { dateTime: endTime, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
            };
            const response = await calendar.events.insert({
                calendarId,
                requestBody: event,
            });
            console.log(`Event created for task "${task.title}" from ${startTime} to ${endTime}`);
            return response.data;
        } catch (error) {
            console.error('Error creating calendar event:', error);
            throw error;
        }
    }

    /**
     * Placeholder for intelligent task scheduling logic.
     * This method would take a task and find suitable slots in the calendar.
     * @param task The task to schedule.
     * @param project The project the task belongs to (for context).
     * @param calendarId The ID of the calendar to schedule on.
     */
    async scheduleTask(
        task: Task,
        project: Project,
        calendarId: string = 'primary'
    ): Promise<void> {
        console.log(`Attempting to schedule task: "${task.title}" from project "${project.title}"`);

        if (!task.estimated_duration_minutes) {
            console.log(`Task "${task.title}" has no estimated duration. Skipping scheduling.`);
            return;
        }

        // For demonstration, let's try to schedule it for tomorrow for its estimated duration
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0); // Start at 9 AM tomorrow

        const endTime = new Date(tomorrow.getTime() + task.estimated_duration_minutes * 60 * 1000);

        try {
            await this.createCalendarEvent(
                task,
                tomorrow.toISOString(),
                endTime.toISOString(),
                calendarId
            );
            console.log(`Successfully scheduled "${task.title}" for tomorrow.`);
        } catch (error) {
            console.error(`Failed to schedule "${task.title}":`, error);
        }
    }
}
