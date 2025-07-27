# Kanban Board

## Backlog

- [ ] **Epic: AI-Powered Automatic Task Scheduling.**
  - **Description:** Evolve the assistant from a passive task list into a proactive scheduling partner. The system will automatically find time on the user's calendar to complete their tasks, inspired by features from apps like Motion.
  - **Key Components:**
    - **Automatic Time-Blocking:** Scan connected calendars for free time within defined "working hours" and schedule unscheduled tasks.
    - **Task Duration:** Add an "estimated time" field to tasks, which is required for scheduling.
    - **Workspaces/Realms:** Allow users to create contexts (e.g., "Work", "Personal") that link specific tasks to specific calendars and scheduling rules.
    - **Dynamic Rescheduling:** If a scheduled task is not completed or a conflict arises, the system should automatically find the next available slot.

## To Do

- [ ] **Feature: Conversational Project/Task Search.**
  - **Description:** The user should be able to conversationally find a specific project or task. For example, "find the project about X" or "show me the task about Y".

- [ ] **Feature: Action Palette with Arguments.**
  - **Description:** Allow actions in the action palette to accept arguments directly after being triggered.
  - **Decision:** We have decided on a primary implementation strategy. See [ACTION_PALETTE_DECISION.md](ACTION_PALETTE_DECISION.md) for details.

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