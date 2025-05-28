# Personal Journal CLI

A CLI tool for periodic journaling with AI reflection, designed as part of a personal task management system.

## Features (Planned/Implemented)

*   Create and manage journal topics.
*   Write journal entries using your preferred external editor.
*   Get initial AI reflections on your entries.
*   Engage in an interactive chat session with the AI to explore thoughts further.
*   Use trigger commands (like `/integrate`) within your notes to initiate AI-assisted structuring.
*   Maintain a persistent knowledge base per topic (`notes.md`).
*   Track topic status and simple tasks using a Kanban board (`state.yaml`).
*   Save AI conversation logs (`chat_log.md`).

## Setup

1.  **Prerequisites:**
    *   Node.js (v18.0.0 or higher recommended)
    *   npm (usually comes with Node.js)

2.  **Clone the Repository (if applicable):**
    ```bash
    git clone <repository-url>
    cd personal-journal-cli
    ```

3.  **Install Dependencies:**
    ```bash
    npm install
    ```

## Configuration

1.  **Configuration File:**
    *   The tool looks for a configuration file at `~/.config/personal-journal-cli/config.yaml` by default.
    *   If it doesn't exist, the tool will try to create it using defaults based on the `config/config.yaml` included in the project.
    *   You can customize the journal directory path, AI model, API key environment variable name, AI prompt, and editor command in this file.

2.  **AI API Key:**
    *   The tool requires an API key for the configured AI provider (currently Google Gemini by default).
    *   Set the environment variable specified in your `config.yaml` (default: `GOOGLE_API_KEY`) before running the tool.
    ```bash
    # Example for Bash/Zsh
    export GOOGLE_API_KEY="YOUR_ACTUAL_API_KEY"
    ```
    *   Consider adding this export command to your shell profile (`.bashrc`, `.zshrc`, `.profile`, etc.) for persistence across terminal sessions.

## Building

To compile the TypeScript code to JavaScript (output to `dist/` directory):
```bash
npm run build
```
You typically need to run this after pulling changes or modifying the `.ts` source files.

## Running the Tool

1.  **Ensure Prerequisites:** Make sure you have installed dependencies (`npm install`) and set the required API key environment variable.
2.  **Build (if necessary):** Run `npm run build` if you haven't already or if you've made code changes.
3.  **Execute:**
    ```bash
    node dist/journal_cli.js
    ```
    *Alternatively, if you have used `npm link` or installed the package globally, you might be able to run it using the command defined in `package.json`'s `bin` section:*
    ```bash
    journal
    ```

The tool will then guide you through selecting or creating a journal topic and opening your editor. Follow the instructions provided within the tool and the editor's help text.