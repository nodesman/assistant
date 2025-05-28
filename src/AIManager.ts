// src/AIManager.ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
// import OpenAI from "openai"; // Uncomment if using OpenAI
import { AiClient, JournalConfig, ChatMessage } from "./types"; // Import ChatMessage

export class AIManager implements AiClient {
    private config: JournalConfig['ai'];
    private googleAI?: GoogleGenerativeAI;
    // private openai?: OpenAI; // Uncomment if using OpenAI

    constructor(config: JournalConfig['ai']) {
        this.config = config;
        const apiKey = process.env[this.config.api_key_env_var];

        if (!apiKey) {
            throw new Error(`API key environment variable '${this.config.api_key_env_var}' not set.`);
        }

        // Initialize the correct client based on config (add provider check later if needed)
        // Assuming Google for now
        this.googleAI = new GoogleGenerativeAI(apiKey);
        console.log(`AI Manager initialized for model: ${this.config.model}`);

        /* // --- OpenAI Initialization Example ---
        if (config.provider === 'openai') {
            this.openai = new OpenAI({ apiKey });
            console.log(`AI Manager initialized for OpenAI model: ${this.config.model}`);
        } else {
             // Default to Google or throw error if provider specified and unsupported
             this.googleAI = new GoogleGenerativeAI(apiKey);
             console.log(`AI Manager initialized for Google model: ${this.config.model}`);
        }
        */
    }

    async generateReflection(entry: string): Promise<string> {
        if (!this.googleAI) { // Add || !this.openai if supporting both
            throw new Error("AI client not initialized correctly.");
        }

        const prompt = this.config.reflection_prompt.replace('{journal_entry}', entry);

        try {
             console.log(`Sending request to AI model (${this.config.model})...`);
            // --- Google Gemini Implementation ---
            const model = this.googleAI.getGenerativeModel({ model: this.config.model });
            const generationConfig = {
                temperature: 0.7, // Adjust as needed
                topK: 1,
                topP: 1,
                maxOutputTokens: 2048, // Adjust as needed
            };
             const safetySettings = [
                 { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                 { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                 { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                 { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
             ];


            const result = await model.generateContent({
                 contents: [{ role: "user", parts: [{ text: prompt }] }],
                 generationConfig,
                 safetySettings,
             });


             if (!result.response) {
                 console.error("AI response was undefined or missing.", result);
                 throw new Error("AI returned an empty response.");
             }


             const responseText = result.response.text();


             if (!responseText) {
                 // Log the full response if text is missing but response exists
                 console.error("AI response text was empty. Full response:", JSON.stringify(result.response, null, 2));
                 // Check for block reason
                 const blockReason = result.response.promptFeedback?.blockReason;
                 if (blockReason) {
                     throw new Error(`AI generation blocked due to: ${blockReason}`);
                 }
                 throw new Error("AI returned an empty text response.");
             }


              console.log("AI reflection generated successfully.");
             return responseText;


            /* // --- OpenAI Implementation Example ---
            if (this.openai) {
                const chatCompletion = await this.openai.chat.completions.create({
                    messages: [{ role: "user", content: prompt }],
                    model: this.config.model,
                    // Add other parameters like temperature if needed
                });
                const reflection = chatCompletion.choices[0]?.message?.content;
                if (!reflection) {
                    throw new Error("OpenAI returned an empty reflection.");
                }
                console.log("AI reflection generated successfully.");
                return reflection;
            }
            */

             throw new Error("No valid AI provider configured or initialized.");

        } catch (error) {
            console.error("Error generating AI reflection:", error);
            // Provide more specific error message if possible
            if (error instanceof Error) {
                 throw new Error(`Failed to get reflection from AI: ${error.message}`);
             } else {
                 throw new Error("An unknown error occurred while communicating with the AI.");
             }
        }
    }

    /**
     * Generates a response based on a conversation history.
     * @param history An array of ChatMessage objects representing the conversation.
     * @returns The AI's response text or null if an error occurs.
     */
    async generateChatResponse(history: ChatMessage[]): Promise<string | null> {
        if (!this.googleAI) {
            throw new Error("AI client not initialized correctly.");
        }

        // Map our ChatMessage format to the format expected by the Google AI SDK's chat history
        // Ensure role names match SDK ('model' is correct for Gemini)
        const googleChatHistory = history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
        }));

        // Extract the latest user message to send
        const lastUserMessage = googleChatHistory.pop(); // History now contains context *before* the last user message
        if (!lastUserMessage || lastUserMessage.role !== 'user') {
            console.error("History format error: Last message should be from user for chat.");
            // Restore history if needed before returning
            if(lastUserMessage) googleChatHistory.push(lastUserMessage);
            return null;
        }
        const currentMessageContent = lastUserMessage.parts[0].text;

        try {
            console.log(`Sending chat request to AI model (${this.config.model})...`);
            const model = this.googleAI.getGenerativeModel({
                 model: this.config.model,
                 // Define safety settings for chat as well
                 safetySettings: [
                     { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                     { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                     { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                     { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                 ],
            });

            // Start a chat session with the preceding history
            const chat = model.startChat({
                history: googleChatHistory,
                // generationConfig can be set here too if needed
            });

            const result = await chat.sendMessage(currentMessageContent); // Send only the latest user message

            if (!result.response) {
                console.error("AI chat response was undefined or missing.", result);
                throw new Error("AI returned an empty chat response.");
            }
            const responseText = result.response.text(); // Get text() handles potential streaming internally if not awaited differently
            if (!responseText) throw new Error("AI returned an empty text response in chat."); // Check for empty text

            return responseText;
        } catch (error) {
            console.error("Error generating AI chat response:", error);
            return null; // Return null to indicate failure
        }
    }
}