// src/ChatManager.ts
import { ChatMessage } from './types';

export class ChatManager {
  private static _instance: ChatManager;
  private messages: ChatMessage[] = [];

  private constructor() {}

  public static getInstance(): ChatManager {
    if (!ChatManager._instance) {
      ChatManager._instance = new ChatManager();
    }
    return ChatManager._instance;
  }

  public getHistory(): ChatMessage[] {
    return this.messages;
  }

  public addMessage(message: ChatMessage): void {
    // Prevent duplicate system messages if they are thinking indicators
    if (message.role === 'system' && this.messages[this.messages.length - 1]?.isThinking) {
        return;
    }
    this.messages.push(message);
  }
  
  public replaceLastMessage(message: ChatMessage): void {
    if (this.messages.length > 0) {
      this.messages[this.messages.length - 1] = message;
    }
  }

  public clearHistory(): void {
    this.messages = [];
  }
}
