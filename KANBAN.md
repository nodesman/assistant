### KANBAN.md

---

### **To Do**

*   [ ] **Implement Multi-Calendar Support:**
    *   [ ] Fetch and display all available calendars from connected accounts.
    *   [ ] Add a calendar list with visibility toggles and color-coding.
    *   [ ] Add a "Calendar" dropdown to the "Create Event" dialog.
    *   [ ] Display the source calendar in the "Edit Event" dialog.
*   [ ] **Implement Function Calling for Context-Aware Chat:**
*   [ ] **Implement Full Calendar View:**

### **In Progress**

*   [ ] **Implement Conversational Import from Text:**
    *   [x] Create a new `TextParser.ts` manager.
    *   [x] Create a `ConfirmationDialog.vue` component with accordions and tooltips.
    *   [ ] Implement the real text parsing flow in the chat UI.
        *   [x] Render model responses as Markdown.
        *   [x] Add visual differentiation for user, model, and system messages.
        *   [x] Fix build errors in `TextParser.ts` to enable UI functionality.
    *   [ ] Implement the backend logic for mass import.
*   [ ] **Architectural Shift: Migrate to SQLite Database:**
    *   [x] Install `sqlite3` and `knex` libraries.
    *   [x] Create a new `DatabaseManager`.
    *   [x] Define and create the database schema.
    *   [x] Implement a one-time migration script.
    *   [x] Refactor managers to use the `DatabaseManager`.

### **Done**
*   [x] Implemented Rich-Text Task Management.
*   [x] Implemented Google Auth Flow.
*   [x] Migrated project to Electron + Vue.
*   [x] Created UI Shell with tabbed navigation.
*   [x] Implemented "Projects" tab.
*   [x] Implemented "Goals" tab (Read-only).
*   [x] Implemented "Journal" tab (Read-only).
*   [x] Implemented "Chat" tab.
*   [x] Set up Kanban Board.
*   [x] Bridged Frontend & Backend.

---
