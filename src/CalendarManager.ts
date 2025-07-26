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

    async getCalendarList(): Promise<any[]> {
        const calendar = await this.getCalendarClient();
        try {
            const response = await calendar.calendarList.list({});
            return response.data.items;
        } catch (error) {
            console.error('Error fetching calendar list:', error);
            throw error;
        }
    }

    async getCalendarEvents(timeMin: string, timeMax: string, calendarIds: string[]): Promise<any[]> {
        if (!calendarIds || calendarIds.length === 0) {
            return [];
        }
        const calendar = await this.getCalendarClient();
        const allEvents = [];

        // First, get the details of all calendars to access their colors
        const calendarList = await this.getCalendarList();
        const calendarDetailsMap = new Map(calendarList.map(cal => [cal.id, cal]));

        try {
            for (const calendarId of calendarIds) {
                const calendarInfo = calendarDetailsMap.get(calendarId);
                if (!calendarInfo) continue;

                const response = await calendar.events.list({
                    calendarId,
                    timeMin,
                    timeMax,
                    singleEvents: true,
                    orderBy: 'startTime',
                });

                if (response.data.items) {
                    const eventsWithColor = response.data.items.map(event => ({
                        ...event,
                        calendarId: calendarId,
                        color: calendarInfo.backgroundColor, // Inject calendar color
                    }));
                    allEvents.push(...eventsWithColor);
                }
            }
            // Sort all collected events by start time
            allEvents.sort((a, b) => {
                const timeA = new Date(a.start.dateTime || a.start.date).getTime();
                const timeB = new Date(b.start.dateTime || b.start.date).getTime();
                return timeA - timeB;
            });
            return allEvents;
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

    async deleteEventsByQuery(query: string, timeMin: string, timeMax: string): Promise<{ deletedCount: number, details: string[] }> {
        const calendarList = await this.getCalendarList();
        const allCalendarIds = calendarList.map(cal => cal.id);
        
        console.log(`Searching for events matching "${query}" between ${timeMin} and ${timeMax}`);

        const allEvents = await this.getCalendarEvents(timeMin, timeMax, allCalendarIds);
        
        const lowerCaseQuery = query.toLowerCase();
        const matchingEvents = allEvents.filter(event => 
            event.summary && event.summary.toLowerCase().includes(lowerCaseQuery)
        );

        if (matchingEvents.length === 0) {
            console.log(`No events found matching "${query}".`);
            return { deletedCount: 0, details: [] };
        }

        console.log(`Found ${matchingEvents.length} matching events. Proceeding with deletion...`);
        
        const deletedDetails: string[] = [];
        for (const event of matchingEvents) {
            try {
                await this.deleteCalendarEvent(event.id, event.calendarId);
                const eventDetail = `'${event.summary}' on ${new Date(event.start.dateTime || event.start.date).toLocaleDateString()}`;
                deletedDetails.push(eventDetail);
                console.log(`Successfully deleted ${eventDetail}`);
            } catch (error) {
                console.error(`Failed to delete event with ID "${event.id}":`, error);
                // Continue to the next event even if one fails
            }
        }

        return {
            deletedCount: deletedDetails.length,
            details: deletedDetails,
        };
    }
}
