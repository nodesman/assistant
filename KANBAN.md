### KANBAN.md

---

### **To Do**

*   [ ] **Implement Function Calling for Context-Aware Chat:**
    *   [ ] Define a clear schema for the available tools (`getCalendarEvents`, `findProject`, etc.).
    *   [ ] Update `AIManager` to include the tool definitions in its prompts.
    *   [ ] Update the `generate-chat-response` IPC handler in `main.ts` to handle function-calling responses from the AI.
    *   [ ] Implement the logic in `main.ts` to execute the requested functions and send the results back to the AI.
    *   [ ] Add a loading indicator in the Chat UI while the AI is "using" a tool.
*   [ ] **Implement Full Calendar View:**
    *   [ ] Create a dedicated "Calendar" tab.
    *   [ ] Display a full month/week/day view of the user's Google Calendar.
*   [ ] **Implement "Projects" Tab (CRUD):**
    *   [ ] Add functionality to create, edit, and delete projects and tasks.
*   [ ] **Implement "Goals" Tab (CRUD):**
*   [ ] **Implement "Journal" Tab (CRUD):**

### **In Progress**

*   [ ] **Implement Google Auth Flow:**
    *   [x] Create a "Settings" tab in the UI.
    *   [x] On first run, direct the user to the Settings tab to authorize their account.
    *   [x] Display the authorized user's name and email on the Settings page.
    *   [x] Add a button to remove the current Google account.
    *   [x] Add a button to authorize a new Google account.

### **Done**

*   [x] Migrated project to Electron + Vue.
*   [x] Created UI Shell with tabbed navigation.
*   [x] Implemented "Projects" tab (Read-only).
*   [x] Implemented "Goals" tab (Read-only).
*   [x] Implemented "Journal" tab (Read-only).
*   [x] Implemented "Chat" tab.
*   [x] Set up Kanban Board.
*   [x] Bridged Frontend & Backend.

---