// src/EditorInteraction.ts
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

export class EditorInteraction {
    private editorCommand: string;

    constructor(editorCommand: string) {
        // Ensure the command is treated as potentially needing shell interpretation
        // e.g., "code -w" or "subl -w" needs shell: true
        this.editorCommand = editorCommand;
    }

    private async createTempFile(initialContent: string = ''): Promise<string> {
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'journal-cli-edit-'));
        const tempFilePath = path.join(tempDir, 'entry.md');
        await fs.writeFile(tempFilePath, initialContent, 'utf-8');
        return tempFilePath;
    }

    private openEditor(filePath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // Split the command and arguments correctly if needed, but shell:true handles most cases
            const parts = this.editorCommand.split(' ');
            const command = parts[0];
            const args = [...parts.slice(1), filePath]; // Add file path as the last argument

            console.log(`Executing editor: ${command} ${args.join(' ')}`); // Log the command being run

            const editorProcess = spawn(command, args, {
                stdio: 'inherit', // Inherit stdin, stdout, stderr lets user interact directly
                shell: true // Use shell to handle complex commands, paths with spaces (maybe), and '-w' flags
            });

            editorProcess.on('error', (err) => {
                console.error(`Failed to start editor command '${this.editorCommand}'. Is '${command}' in your PATH?`);
                // Provide specific advice based on common errors if possible
                if ((err as any).code === 'ENOENT') {
                     console.error(`Error details: The command '${command}' was not found.`);
                     console.error("Please ensure the editor command is correct in your config file and that the editor executable is in your system's PATH.");
                } else {
                    console.error("Error details:", err);
                }
                reject(new Error(`Failed to launch editor: ${err.message}`)); // Reject with a more informative error
            });

            editorProcess.on('close', (code) => {
                console.log(`Editor process exited with code ${code}`);
                if (code === 0) {
                    // Editor closed successfully (or user saved and closed)
                    resolve();
                } else {
                    // Editor closed with an error or non-zero exit code
                    // We still resolve because the user might have saved changes before an issue,
                    // or the non-zero code might be expected for some editors/workflows.
                    // Let the subsequent file read handle potential issues.
                    console.warn(`Editor process closed with non-zero code (${code}). Continuing assuming user interaction finished.`);
                    resolve();
                }
            });
        });
    }

    /**
     * Opens the configured editor with initial content and returns the modified content.
     * Returns null if the editor could not be opened, the content was unchanged, or the entry was empty after editing.
     * @param promptText Text to prepend to the editor buffer, explaining what to do.
     * @param existingContent Existing content to load into the editor.
     * @returns The user-written content (excluding the prompt), or null if cancelled/empty/unchanged.
     */
    async CANCELLABLE_getUserInputViaEditor(
        promptText: string = "## Write your journal entry below:\n\n",
        existingContent: string = ''
    ): Promise<string | null> {
        // Ensure prompt ends with newlines for separation
        const formattedPrompt = promptText.trimEnd() + "\n\n";
        const initialContent = `${formattedPrompt}${existingContent}`;
        let tempFilePath = '';
        let tempDir = '';

        try {
            // Create temp file within a dedicated directory for easier cleanup
            tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'journal-cli-edit-'));
            tempFilePath = path.join(tempDir, 'entry.md');
            await fs.writeFile(tempFilePath, initialContent, 'utf-8');

            console.log(`Opening editor ('${this.editorCommand}') for you to write...`);
             console.log("-> Please SAVE and CLOSE the editor window/tab when you are finished writing.");

            await this.openEditor(tempFilePath); // Wait for editor to close

            const updatedContent = await fs.readFile(tempFilePath, 'utf-8');

            // Extract content after the prompt
            const userWrittenContent = updatedContent.substring(formattedPrompt.length);

            // Trim whitespace for comparison and final result
            const trimmedUserWritten = userWrittenContent.trim();
            const trimmedExisting = existingContent.trim();

            if (trimmedUserWritten === trimmedExisting) {
                console.log("No changes detected compared to existing content.");
                return null; // Indicate no change
            }
             if (trimmedUserWritten === '') {
                 console.log("Entry is empty after editing.");
                 return null; // Indicate empty entry
             }

            // Return only the user-written part, trimmed
            return userWrittenContent.trim(); // Return the potentially multi-line content, but trimmed of leading/trailing whitespace

        } catch (error) {
            console.error("Error during editor interaction:", error);
            return null; // Indicate error/cancellation
        } finally {
            // Cleanup: Remove the temporary directory and its contents
            if (tempDir) {
                 try {
                     await fs.rm(tempDir, { recursive: true, force: true });
                     // console.log(`Cleaned up temp directory: ${tempDir}`);
                 } catch (cleanupError) {
                     console.error(`Failed to clean up temporary directory ${tempDir}:`, cleanupError);
                 }
             } else if (tempFilePath) {
                 // Fallback if only file path known (shouldn't normally happen with current logic)
                 try {
                     await fs.unlink(tempFilePath);
                 } catch (cleanupError) {
                     console.error(`Failed to clean up temporary file ${tempFilePath}:`, cleanupError);
                 }
            }
        }
    }
}