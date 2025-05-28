// src/JournalManager.ts
import { FileManager } from './FileManager';
import { UserInterface } from './UserInterface';
import { EditorInteraction } from './EditorInteraction';
import { AIManager } from './AIManager';
import { JournalConfig, JournalEntry } from './types';
import moment from 'moment';
import YAML from 'js-yaml'; // To format state data for the prompt
import { ChatMessage, TopicState, KanbanBoard } from './types'; // Import the new types
import path from 'path'; // Needed for path operations in saveRawNotesContent

export class JournalManager {
    private fileManager: FileManager;
    private ui: UserInterface;
    private editor: EditorInteraction;
    private aiManager: AIManager;
    private config: JournalConfig;

    // Define the trigger string(s) - could be moved to config later
    private readonly STRUCTURE_TRIGGER = '/integrate'; // Or '/structure', '/process' etc.

    // Define the help text to show in the editor
    private readonly HELP_LEGEND_TEXT = `Commands (include within your text):\n  ${this.STRUCTURE_TRIGGER} : Marks the preceding block for AI structuring help after closing the editor.`;

    // Configuration for context extraction
    private readonly MAX_LOG_LINES_FOR_CONTEXT = 15;

    // Define the detailed prompt template for the AI structuring task
    private readonly STRUCTURING_PROMPT_TEMPLATE = `
SYSTEM: You are an AI assistant helping the user organize their thoughts within a persistent, hierarchical markdown document (\`notes.md\`) and a state file (\`state.yaml\`) for the topic '{topic_name}'.
The \`notes.md\` document typically contains sections like '## Log' (dated entries), '## Board' (references tasks tracked in state.yaml), and '## Nodes' (key ideas/questions using nested bullets).
The \`state.yaml\` tracks the Kanban board (Pending/Doing/Done lists) and overall topic status.

The user has just added the following thoughts and triggered an integration request:
--- START NEW THOUGHTS ---
{triggered_block}
--- END NEW THOUGHTS ---

Current state from \`state.yaml\`:
\`\`\`yaml
{state_yaml_content}
\`\`\`

Relevant existing context from \`notes.md\`:
--- START EXISTING STRUCTURE CONTEXT ---
{relevant_notes_md_snippets}
--- END EXISTING STRUCTURE CONTEXT ---

Your goal is to engage in a conversation to help the user integrate these new thoughts effectively into the structure.
1. Focus first on the NEW THOUGHTS block provided above. Ask clarifying questions.
2. Suggest specific placements in \`notes.md\` (Log, Nodes, hierarchy) or updates to the board/status in \`state.yaml\`.
3. *After* processing the new thoughts, proactively review the EXISTING STRUCTURE CONTEXT and suggest integrations for older, unstructured notes if appropriate.
4. Help refine wording and provide markdown/YAML snippets when useful.
5. Await user confirmation before finalizing changes. The user will signal completion (e.g., with /done).

Begin the conversation by acknowledging the request and suggesting a starting point for integrating the NEW THOUGHTS block.`;

    constructor(
        config: JournalConfig,
        fileManager: FileManager,
        ui: UserInterface,
        editor: EditorInteraction,
        aiManager: AIManager
    ) {
        this.config = config;
        this.fileManager = fileManager;
        this.ui = ui;
        this.editor = editor;
        this.aiManager = aiManager;
    }

    async startJournaling() {
        this.ui.displayMessage("Welcome to Journaling!");

        const topics = await this.fileManager.listTopics();
        let selectedTopic: string;

        const NEW_TOPIC_OPTION = "[Create New Topic]";
        if (topics.length > 0) {
            const choice = await this.ui.promptSelection("Select a journal topic or create a new one:", [...topics, NEW_TOPIC_OPTION]);
            if (choice === NEW_TOPIC_OPTION) {
                selectedTopic = await this.promptNewTopic();
            } else {
                selectedTopic = choice;
            }
        } else {
            this.ui.displayMessage("No existing topics found.");
            selectedTopic = await this.promptNewTopic();
        }

        this.ui.displayMessage(`\nSelected topic: ${selectedTopic}`);

        await this.writeAndReflect(selectedTopic);

        this.ui.displayMessage("\nJournaling session finished.");
    }

    private async promptNewTopic(): Promise<string> {
        let newTopic = '';
        while (!newTopic) {
            newTopic = await this.ui.promptInput("Enter the name for the new topic:");
            if (!newTopic) {
                this.ui.displayError("Topic name cannot be empty.");
            }
            // Add more validation if needed (e.g., check for invalid characters)
        }
        await this.fileManager.createTopic(newTopic); // Create the directory immediately
        return newTopic;
    }

    private async writeAndReflect(topic: string) {
        // Now works with notes.md and state.yaml per topic directory
        const notesFilePath = this.fileManager.getNotesPath(topic);
        const stateFilePath = this.fileManager.getStatePath(topic); // We'll need state later

        let existingContent = '';
        let currentState: TopicState = { status: 'active', board: { Pending: [], Doing: [], Done: [] } }; // Default state

        try {
             existingContent = await this.fileManager.readNotesFile(topic);
             currentState = await this.fileManager.readTopicState(topic); // Load current state
             this.ui.displayMessage(`Loaded notes for topic: ${topic}`);
             // console.log("Current State:", currentState); // Log state for debugging
        } catch (error: any) {
             // FileManager.readNotesFile and readTopicState handle ENOENT returning defaults
             this.ui.displayError(`Error loading topic data: ${error.message}`);
             // Potentially ask user if they want to proceed with defaults/empty notes
             const proceed = await this.ui.promptConfirm("Could not load existing topic data correctly. Continue?", false);
             if (!proceed) return;
         }


        const userWrittenContent = await this.editor.CANCELLABLE_getUserInputViaEditor(
            `## Journal Entry: ${topic} - ${moment().format('YYYY-MM-DD')}\n\n(Write your thoughts below. Use '${this.STRUCTURE_TRIGGER}' within your text to mark a block for AI structuring help. Save and close the editor when finished.)\n---\n`,
            existingContent, // Pass existing content to the editor
            this.HELP_LEGEND_TEXT // Pass the legend text
        );


        if (userWrittenContent === null) {
            this.ui.displayMessage("Journal entry cancelled or no input provided.");
            return; // Exit if user cancelled or provided no input
        }

        // Find the difference to isolate new content (simple approach: assume everything after existing is new)
        // More robust diffing might be needed later.
        const newContent = userWrittenContent.substring(existingContent.length);

        // Check if the trigger string is present in the *new* content
        const triggerIndex = newContent.indexOf(this.STRUCTURE_TRIGGER);

        if (triggerIndex === -1) {
             this.ui.displayMessage("No AI structuring trigger found in new content.");
             // If no trigger, just save the file as-is if changed (auto-save principle)
             if(userWrittenContent.trim() !== existingContent.trim()){
                 this.ui.displayMessage("Saving changes made in editor...");
                 await this.saveRawNotesContent(notesFilePath, userWrittenContent);
             } else {
                 this.ui.displayMessage("No changes detected in editor.");
             }
             return; // Exit after simple save or no change
        }

        // --- Trigger Detected ---
        this.ui.displayMessage(`Trigger '${this.STRUCTURE_TRIGGER}' detected. Preparing AI structuring session...`);

        // Identify the block associated with the trigger (e.g., the paragraph containing it, or all new content)
        // Simple approach: Use all new content as the triggered block for now.
        const triggeredBlock = newContent.replace(this.STRUCTURE_TRIGGER, '').trim(); // Remove trigger for clarity

        // Load relevant context
        // - Use loaded state data
        const stateYamlContent = YAML.dump(currentState);
        // - Load relevant notes.md snippets
        const relevantNotesMdSnippets = this.extractRelevantSnippets(existingContent); // Use implemented logic

        try {
            // Format the detailed structuring prompt
            const initialStructuringPrompt = this.STRUCTURING_PROMPT_TEMPLATE
                .replace('{topic_name}', topic)
                .replace('{triggered_block}', triggeredBlock)
                .replace('{state_yaml_content}', stateYamlContent)
                .replace('{relevant_notes_md_snippets}', relevantNotesMdSnippets);

             // Initialize conversation history with the detailed prompt
             const conversationHistory: ChatMessage[] = [
                 { role: 'user', content: initialStructuringPrompt },
             ];

             // Start the interactive loop - it will get the *first* AI response internally
             const finalDecision = await this.startInteractiveReflectionLoop(conversationHistory);

             // Handle saving based on the loop's outcome
             if (finalDecision === 'save') { // Assuming '/done' or similar leads to 'save' decision
                 this.ui.displayMessage("Structuring complete. Saving changes...");

                 // --- Logic to apply changes based on conversation ---
                 // Apply state changes first. Note modification is NOT YET IMPLEMENTED.
                 const { finalNotesContent, finalStateData } = this.applyChangesFromConversation(userWrittenContent, currentState, conversationHistory);

                 const formattedChatLog = this.formatConversationHistory(conversationHistory);
                 try {
                    // Overwrite notes.md (with content from editor), overwrite state.yaml, append chat_log.md
                    await this.saveStructuredResults(topic, finalNotesContent, finalStateData, formattedChatLog);

                 } catch (saveError) {
                    this.ui.displayError("Failed to save entry after reflection.", saveError);
                 }
             } else { // User quit the structuring loop
                 this.ui.displayMessage("Exited without saving structured changes.");
                 // Save the raw editor changes when quitting the structuring loop
                 await this.saveRawNotesContent(notesFilePath, userWrittenContent);
             }

         } catch (error: any) {
            // Handle error during initial prompt generation or AI call
            this.ui.displayError("Error during AI structuring session.", error);
             const saveAnyway = await this.ui.promptConfirm("An error occurred during AI processing. Save your raw changes from the editor?", true);
             if (saveAnyway) {
                 await this.saveRawNotesContent(notesFilePath, userWrittenContent);
             }
         }
     }

    /**
     * Manages the interactive chat loop for reflection.
     * @param history The initial conversation history (starts with the detailed structuring prompt)
     * @returns 'save' or 'quit' indicating the user's final action.
    */
    private async startInteractiveReflectionLoop(history: ChatMessage[]): Promise<'save' | 'quit'> {
        this.ui.displayMessage("You can now chat with the AI to structure your thoughts. Type '/done' or '/save' to finish and save, '/quit' to exit without saving, or '/help' for commands.");
        let firstAiResponseProcessed = false; // Flag to ensure first response is handled

        while (true) {
            // If it's the first loop iteration, get the initial AI response to the prompt
            if (!firstAiResponseProcessed && history.length === 1 && history[0].role === 'user') {
                 this.ui.displayMessage("Thinking..."); // Indicate AI is processing initial prompt
                 try {
                    const aiResponse = await this.aiManager.generateChatResponse(history);
                     if (aiResponse) {
                         history.push({ role: 'model', content: aiResponse });
                         this.ui.displayMessage(`\nAI: ${aiResponse}\n`);
                     } else {
                         this.ui.displayError("AI did not provide an initial response. Use /quit or try again if applicable.");
                         // Handle error - maybe return 'quit'?
                         return 'quit'; // Exit if initial response fails
                     }
                 } catch (error) {
                     this.ui.displayError("Error communicating with AI for initial response.", error);
                     return 'quit'; // Exit on error
                 }
                 firstAiResponseProcessed = true;
            }


            const userInput = await this.ui.promptInput("> "); // Simple prompt

             // --- Handle Commands ---
             // Redefine '/save' (or /done) to mean 'finish structuring and save'
             if (userInput.toLowerCase() === '/done' || userInput.toLowerCase() === '/save' || userInput.toLowerCase() === '/finish') {
                 // Potentially ask for confirmation?
                 const confirmSave = await this.ui.promptConfirm("Finalize structuring and save changes?", true);
                 if (confirmSave) {
                      return 'save';
                 } else {
                      continue; // Go back to prompt if save not confirmed
                 }
             }

             if (userInput.toLowerCase() === '/quit') {
                 const confirmQuit = await this.ui.promptConfirm("Exit without saving structured changes? (Raw editor changes might still be saved)", true);
                 if (confirmQuit) return 'quit';
                 else continue;
             }

             if (userInput.toLowerCase() === '/help') {
                 this.ui.displayMessage("Commands: /done (or /save, /finish) to finalize and save, /quit to exit without saving, /help. Type anything else to chat.");
                 continue; // Go back to prompt input
             }

            // --- Process Chat Input ---
            if (!userInput.trim()) {
                continue; // Ignore empty input
            }

            // Add user message to history and get AI response
            history.push({ role: 'user', content: userInput });
            this.ui.displayMessage("Thinking..."); // Indicate AI is processing

            try {
                // Call the AI Manager method that handles conversation history
                const aiResponse = await this.aiManager.generateChatResponse(history);
                if (aiResponse) {
                    history.push({ role: 'model', content: aiResponse }); // Add AI response to history
                    this.ui.displayMessage(`\nAI: ${aiResponse}\n`); // Display AI response
                } else {
                    this.ui.displayError("AI did not provide a response. Try again or use /quit or /done.");
                    history.pop(); // Remove the user's last message if AI failed, so they can retry
                }
            } catch (error) {
                this.ui.displayError("Error communicating with AI.", error);
                history.pop(); // Remove the user's last message if AI failed
            }
        }
    }

    /** Saves the raw content directly to the notes file */
    private async saveRawNotesContent(notesFilePath: string, content: string): Promise<void> {
        try {
            // Need topic name from path to call fileManager method
            const topicName = path.basename(path.dirname(notesFilePath));
            await this.fileManager.writeNotesFile(topicName, content);
        } catch (error) {
            this.ui.displayError(`Failed to save raw notes to ${notesFilePath}`, error);
        }
    }

     /** Saves the final structured results to notes.md, state.yaml, and chat_log.md */
     private async saveStructuredResults(topic: string, finalNotesContent: string, finalStateData: TopicState, chatLog: string): Promise<void> {
         try {
             await this.fileManager.writeNotesFile(topic, finalNotesContent);
             await this.fileManager.writeTopicState(topic, finalStateData);
             await this.fileManager.appendChatLog(topic, `\n\n---\n**Session: ${moment().format()}**\n\n${chatLog}\n`); // Append chat log with timestamp
             this.ui.displayMessage(`Successfully saved updates for topic '${topic}'.`);
         } catch (error) {
             this.ui.displayError(`Error saving structured results for topic '${topic}'`, error);
         }
     }

     /** Placeholder function to extract relevant context snippets from notes.md */
     private extractRelevantSnippets(notesContent: string): string {
         // Extract content under ## Nodes until the next L2 heading or EOF
         // Extract last N lines under ## Log until the next L2 heading or EOF

         const lines = notesContent.split('\n');
         let logContent = "";
         let nodesContent = "";
         let currentSection = "";

         const logLines: string[] = [];

         for (const line of lines) {
             if (line.startsWith('## Log')) {
                 currentSection = 'log';
                 continue;
             } else if (line.startsWith('## Board')) {
                 currentSection = 'board'; // Stop log capture if board encountered
                 continue;
             } else if (line.startsWith('## Nodes')) {
                 currentSection = 'nodes';
                 continue;
             } else if (line.startsWith('## ')) { // Any other L2 heading stops capture for nodes/log
                 currentSection = 'other';
                 continue;
             }

             if (currentSection === 'log' && line.trim()) {
                 logLines.push(line);
             } else if (currentSection === 'nodes') {
                 // Capture all lines under Nodes until next L2 heading
                 nodesContent += line + '\n';
             }
         }

         // Get last N lines from the collected log lines
         logContent = logLines.slice(-this.MAX_LOG_LINES_FOR_CONTEXT).join('\n');

         let finalSnippet = "";
         if (nodesContent.trim()) {
             finalSnippet += "--- Nodes Section ---\n" + nodesContent.trim() + "\n";
         }
         if (logContent.trim()) {
             finalSnippet += "\n--- Recent Log Entries ---\n" + logContent.trim() + "\n";
         }

         return finalSnippet.trim() || "[No relevant context found in notes.md]";
     }

      /** Applies changes agreed upon in the conversation, primarily to the state object. */
      // TODO: Implement modification of notes.md content based on conversation.
      private applyChangesFromConversation(originalNotes: string, originalState: TopicState, history: ChatMessage[]): { finalNotesContent: string, finalStateData: TopicState } {
          // For now, only state changes are implemented. Notes content is returned as-is.
          console.warn("applyChangesFromConversation: Modifying state based on chat, but notes.md modification is NOT YET IMPLEMENTED.");
          console.log("Attempting to apply changes based on conversation history...");

          // --- Basic State Change Implementation ---
          let finalState = JSON.parse(JSON.stringify(originalState)); // Deep copy to modify safely
          const confirmationKeywords = ['yes', 'ok', 'okay', 'sure', 'confirm', 'do it', 'sounds good', 'correct', 'affirmative'];
          const validLists: (keyof KanbanBoard)[] = ['Pending', 'Doing', 'Done']; // Define valid list names

          for (let i = 0; i < history.length - 1; i++) {
              if (history[i].role === 'model' && history[i+1].role === 'user') {
                  const modelSuggestion = history[i].content; // Keep case for item names
                  const modelSuggestionLower = modelSuggestion.toLowerCase();
                  const userResponseLower = history[i+1].content.toLowerCase();

                  // Check if user response is affirmative
                  if (confirmationKeywords.some(keyword => userResponseLower.includes(keyword))) {

                      // --- Check for Board Updates (Move) ---
                      const moveMatch = modelSuggestionLower.match(/move '([^']+)' from (\w+) to (\w+)/);
                      if (moveMatch) {
                          // Extract item name *from original case* suggestion if possible, fallback to lowercase match
                          const itemMatchOriginalCase = modelSuggestion.match(new RegExp(`move '([^']+)' from ${moveMatch[2]} to ${moveMatch[3]}`, 'i'));
                          const item = itemMatchOriginalCase ? itemMatchOriginalCase[1] : moveMatch[1];
                          const fromListRaw = moveMatch[2];
                          const toListRaw = moveMatch[3];
                          const fromList = fromListRaw.charAt(0).toUpperCase() + fromListRaw.slice(1) as keyof KanbanBoard;
                          const toList = toListRaw.charAt(0).toUpperCase() + toListRaw.slice(1) as keyof KanbanBoard;

                          console.log(`Detected confirmed intent to move '${item}' from ${fromList} to ${toList}`);
                          if (validLists.includes(fromList) && validLists.includes(toList)) {
                              const itemIndex = finalState.board[fromList]?.indexOf(item); // Check if list exists
                              if (itemIndex !== undefined && itemIndex > -1) {
                                  finalState.board[fromList].splice(itemIndex, 1); // Remove from old list
                                  if (!finalState.board[toList]?.includes(item)) { // Check if list exists and avoid duplicates
                                       finalState.board[toList].push(item); // Add to new list
                                       console.log(`Moved '${item}' successfully.`);
                                  } else {
                                       console.log(`Item '${item}' already in ${toList} or ${toList} list invalid.`);
                                  }
                              } else {
                                  console.warn(`Item '${item}' not found in list '${fromList}' or ${fromList} list invalid.`);
                              }
                          } else {
                               console.warn(`Invalid list names in move command: ${fromListRaw} or ${toListRaw}`);
                          }
                          continue; // Prevent processing other patterns for this confirmed response
                      }

                      // --- Check for Board Updates (Add) ---
                      const addMatch = modelSuggestionLower.match(/add '([^']+)' to (\w+)/);
                      if (addMatch) {
                          const itemMatchOriginalCase = modelSuggestion.match(new RegExp(`add '([^']+)' to ${addMatch[2]}`, 'i'));
                          const item = itemMatchOriginalCase ? itemMatchOriginalCase[1] : addMatch[1];
                          const listRaw = addMatch[2];
                          const list = listRaw.charAt(0).toUpperCase() + listRaw.slice(1) as keyof KanbanBoard;
                          console.log(`Detected confirmed intent to add '${item}' to ${list}`);
                          if (validLists.includes(list) && finalState.board[list]) {
                              if (!finalState.board[list].includes(item)) {
                                  finalState.board[list].push(item);
                                  console.log(`Added '${item}' to ${list}.`);
                              } else {
                                  console.log(`Item '${item}' already exists in ${list}.`);
                              }
                          } else {
                              console.warn(`Invalid list name for add command: ${listRaw}`);
                          }
                          continue;
                      }

                       // --- Check for Board Updates (Remove) ---
                       const removeMatch = modelSuggestionLower.match(/remove '([^']+)' from (\w+)/);
                       if (removeMatch) {
                            const itemMatchOriginalCase = modelSuggestion.match(new RegExp(`remove '([^']+)' from ${removeMatch[2]}`, 'i'));
                            const item = itemMatchOriginalCase ? itemMatchOriginalCase[1] : removeMatch[1];
                            const listRaw = removeMatch[2];
                            const list = listRaw.charAt(0).toUpperCase() + listRaw.slice(1) as keyof KanbanBoard;
                            console.log(`Detected confirmed intent to remove '${item}' from ${list}`);
                             if (validLists.includes(list) && finalState.board[list]) {
                                 const itemIndex = finalState.board[list].indexOf(item);
                                 if (itemIndex > -1) {
                                     finalState.board[list].splice(itemIndex, 1);
                                     console.log(`Removed '${item}' from ${list}.`);
                                 } else {
                                     console.warn(`Item '${item}' not found in list '${list}'.`);
                                 }
                             } else {
                                 console.warn(`Invalid list name for remove command: ${listRaw}`);
                             }
                             continue;
                       }

                       // --- Check for Status Updates ---
                       const statusMatch = modelSuggestionLower.match(/set status to '(\w+)'/);
                       if (statusMatch) {
                          const [, newStatus] = statusMatch;
                          if (['active', 'stable', 'concluded'].includes(newStatus)) {
                              console.log(`Detected confirmed intent to set status to '${newStatus}'`);
                              finalState.status = newStatus as 'active' | 'stable' | 'concluded';
                          } else {
                              console.warn(`Invalid status value suggested: '${newStatus}'`);
                          }
                          continue;
                       }

                       // --- Check for Notes Modifications (Placeholder) ---
                       if (modelSuggestionLower.includes("add this to the notes") || modelSuggestionLower.includes("create a new node")) {
                            console.warn("Notes modification based on chat is not yet implemented.");
                            // TODO: Add logic here to parse the suggestion and user confirmation,
                            // then figure out how to modify 'finalNotesContent'. This is complex.
                       }
                  }
              }
          }
           // --- End Basic State Change Implementation ---

          // For this first cut, notes content is NOT modified by the conversation.
          const finalNotesContent = originalNotes;

          console.log("Final State after applying changes:", finalState);
          return { finalNotesContent: finalNotesContent, finalStateData: finalState };
      }

    /** Formats conversation history for saving */
    private formatConversationHistory(history: ChatMessage[]): string {
        // Start log from the first *actual* AI response (index 1, skipping the initial prompt)
        return history.slice(1).map(msg => `${msg.role === 'model' ? 'AI' : 'You'}: ${msg.content}`).join('\n\n');
    }

}