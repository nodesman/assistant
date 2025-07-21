# Kanban Board

## To Do

- [ ] **Bug: Calendar events for future dates are not being fetched.**
  - **Description:** The chat interface is not displaying calendar events that occur in the future, even when the date range provided to the `get_calendar_events` function is correct.
  - **Context:**
    - The user has confirmed that events exist in the calendar for future dates.
    - The date format for the function call was recently updated.
  - **Next Steps:**
    1. Investigate the `get_calendar_events` function logic in `AIManager.ts` and `CalendarManager.ts`.
    2. Trace how `startDate` and `endDate` are processed and formatted.
    3. Add logging to see the exact date range being sent to the Google Calendar API.
    4. Verify the API response and any potential errors.

- [ ] Refactor ProjectManager to use the new DatabaseManager.
- [ ] Implement recurring tasks feature.
- [ ] Add support for multiple timezones in the Calendar view.

## In Progress

- [ ] Design the initial UI for the Horizons feature.

## Done

- [x] **Fix: LLM does not have current date for context.**
- [x] Implement basic Google Calendar integration.
- [x] Create initial project and task management UI.