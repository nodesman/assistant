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

    async getCalendarEvents(timeMin: string, timeMax: string, calendarId: string = 'primary'): Promise<any[]> {
        const calendar = await this.getCalendarClient();
        try {
            const response = await calendar.events.list({
                calendarId,
                timeMin,
                timeMax,
                singleEvents: true,
                orderBy: 'startTime',
            });
            return response.data.items;
        } catch (error) {
            console.error('Error fetching calendar events:', error);
            throw error;
        }
    }

    async createCalendarEvent(
        event: { summary: string; description: string; start: { dateTime: string }; end: { dateTime: string } },
        calendarId: string = 'primary'
    ): Promise<any> {
        const calendar = await this.getCalendarClient();
        try {
            const eventWithTimeZone = {
                ...event,
                start: { ...event.start, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
                end: { ...event.end, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
            };
            const response = await calendar.events.insert({
                calendarId,
                requestBody: eventWithTimeZone,
            });
            console.log(`Event created: "${event.summary}"`);
            return response.data;
        } catch (error) {
            console.error('Error creating calendar event:', error);
            throw error;
        }
    }

    async updateCalendarEvent(
        eventId: string,
        event: any,
        calendarId: string = 'primary'
    ): Promise<any> {
        const calendar = await this.getCalendarClient();
        try {
            console.log('CalendarManager.updateCalendarEvent:', { eventId, event });
            // ensure timeZone is set on start and end, like on creation
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const requestBody = {
                ...event,
                start: { ...event.start, timeZone: tz },
                end: { ...event.end, timeZone: tz },
            };
            console.log('CalendarManager.updateCalendarEvent requestBody:', requestBody);
            const response = await calendar.events.update({
                calendarId,
                eventId,
                requestBody,
            });
            console.log(`CalendarManager: Event with ID "${eventId}" updated.`);
            return response.data;
        } catch (error) {
            console.error('Error updating calendar event:', error);
            throw error;
        }
    }

    async deleteCalendarEvent(eventId: string, calendarId: string = 'primary'): Promise<void> {
        const calendar = await this.getCalendarClient();
        try {
            await calendar.events.delete({
                calendarId,
                eventId,
            });
            console.log(`Event with ID "${eventId}" deleted.`);
        } catch (error) {
            console.error('Error deleting calendar event:', error);
            throw error;
        }
    }
}
