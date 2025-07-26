<template>
  <div class="chat-container">
    <GenericConfirmationDialog
      v-if="showCancelConfirmDialog"
      title="Operation in Progress"
      message="The AI is currently processing a request. Would you like to cancel the current operation and start a new one?"
      confirm-text="Yes, Cancel"
      cancel-text="No, Wait"
      @confirm="handleCancelOperation"
      @cancel="showCancelConfirmDialog = false"
    />
    <GenericConfirmationDialog
      v-if="showImportConfirmDialog"
      title="Import from Text"
      message="It looks like you pasted a large block of text. Would you like to import projects and tasks from it?"
      confirm-text="Yes, Import"
      cancel-text="No, Just Paste"
      @confirm="handleImportConfirm"
      @cancel="handleImportCancel"
    />
    <div class="messages">
      <div v-for="(message, index) in messages" :key="index" :class="['message', message.role]">
        <!-- Conditionally render the correct card based on the plan type -->
        <div v-if="message.plan">
          <CalendarSelectionCard
            v-if="message.plan.type === 'calendar_selection_request'"
            :plan="message.plan"
            @submit="handleCalendarSelection"
            @dismiss="handlePlanDismissal"
          />
          <ActionConfirmationCard
            v-if="message.plan.type === 'calendar_plan'"
            :plan="message.plan"
            @approve="handlePlanApproval"
            @dismiss="handlePlanDismissal"
            @re-evaluate="handlePlanReEvaluation"
          />
        </div>
        <!-- Render a thinking message with status -->
        <div v-else-if="message.isThinking" class="thinking-indicator">
          <div class="spinner"></div>
          <span>{{ message.content }}</span>
        </div>
        <!-- Render regular text content -->
        <div v-else-if="message.role === 'model'" class="markdown-content" v-html="renderMarkdown(message.content)"></div>
        <div v-else>
          {{ message.content }}
        </div>
      </div>
    </div>
    <div v-if="isAiReady" class="input-area-container">
      <div v-if="newMessage.length === 0" class="suggestion-chips">
        <button v-for="suggestion in suggestions" :key="suggestion" @click="selectSuggestion(suggestion)">
          {{ suggestion }}
        </button>
      </div>
      <div class="input-area">
        <textarea
          v-model="newMessage"
          @keyup.enter.prevent="sendMessage()"
          @paste="handlePaste"
          placeholder="Type your message or paste text to import..."
          :disabled="isThinking"
        ></textarea>
        <button @click="sendMessage()" :disabled="isThinking">
          {{ isThinking ? 'Thinking...' : 'Send' }}
        </button>
      </div>
    </div>
    <div v-else class="ai-not-ready-banner">
      <p>The AI is not configured. Please set your Gemini API Key in the settings to enable the chat.</p>
      <button @click="goToSettings" class="button-secondary">Go to Settings</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineExpose } from 'vue';
import { ChatMessage, CalendarActionPlan, AnyPlan } from '../../../types';
import ActionConfirmationCard from './ActionConfirmationCard.vue';
import CalendarSelectionCard from './CalendarSelectionCard.vue';
import GenericConfirmationDialog from './GenericConfirmationDialog.vue';
import { marked } from 'marked';

// Extend the ChatMessage type for UI-specific properties
interface DisplayMessage extends ChatMessage {
  isThinking?: boolean;
}

const goToSettings = () => alert("Please navigate to the Settings view from the sidebar.");

const messages = ref<DisplayMessage[]>([]);
const newMessage = ref('');
const isAiReady = ref(false);
const isThinking = ref(false);
const showCancelConfirmDialog = ref(false);
const showImportConfirmDialog = ref(false);
const pastedText = ref('');

const suggestions = ref([
  'Create a new project called "Website Redesign"',
  'Schedule a meeting for tomorrow at 10am to discuss marketing',
  'What are my tasks for today?',
  'Add a task to the "Website Redesign" project: "Design new homepage"',
]);

const selectSuggestion = (suggestion: string) => {
  newMessage.value = suggestion;
  sendMessage();
};

const fetchHistory = async () => {
  messages.value = await window.api.getChatHistory();
};

const checkAiStatus = async () => {
  try {
    isAiReady.value = await window.api.isAiReady();
    if (isAiReady.value && messages.value.length === 0) {
       messages.value = await window.api.addChatMessage({ role: 'system', content: 'Hello! How can I help you today?' });
    }
  } catch (error) {
    console.error("Error checking AI status:", error);
    isAiReady.value = false;
  }
};

const renderMarkdown = (content: string) => {
  return content ? marked(content) : '';
};

const handlePaste = (event: ClipboardEvent) => {
  const text = event.clipboardData?.getData('text');
  if (text && text.length > 150) { // Heuristic for large text block
    event.preventDefault();
    pastedText.value = text;
    showImportConfirmDialog.value = true;
  }
};

const handleImportConfirm = async () => {
  showImportConfirmDialog.value = false;
  const textToImport = pastedText.value;
  pastedText.value = '';
  
  const systemMessage: ChatMessage = { role: 'system', content: `Starting import from pasted text...` };
  messages.value = await window.api.addChatMessage(systemMessage);

  await window.api.extractProjectsAndTasks(textToImport, "Extract projects and tasks from the following text.");
  const doneMessage: ChatMessage = { role: 'system', content: `✅ Import process finished.` };
  messages.value = await window.api.addChatMessage(doneMessage);
};

const handleImportCancel = () => {
  showImportConfirmDialog.value = false;
  newMessage.value += pastedText.value; // Paste the text as normal
  pastedText.value = '';
};

const sendMessage = async (messageContent?: string, isContinuation = false) => {
  if (!isAiReady.value) return;
  
  if (isThinking.value) {
    showCancelConfirmDialog.value = true;
    return;
  }

  const userMessageContent = messageContent || newMessage.value.trim();
  if (userMessageContent === '') return;

  const userMessage: ChatMessage = { role: 'user', content: userMessageContent };
  
  if (!isContinuation) {
    await window.api.addChatMessage(userMessage);
  }
  
  newMessage.value = '';
  isThinking.value = true;
  
  const thinkingMessage: DisplayMessage = { role: 'system', content: 'Thinking...', isThinking: true };
  await window.api.addChatMessage(thinkingMessage);
  messages.value = await window.api.getChatHistory();

  try {
    const historyForAI = await window.api.getChatHistory();
    if (isContinuation) {
        historyForAI.push(userMessage);
    }
    const response: ChatMessage = await window.api.generateChatResponse(historyForAI);
    
    messages.value = await window.api.replaceLastChatMessage(response);

  } catch (error) {
    console.error('Error sending message:', error);
    const errorMessage: ChatMessage = { role: 'model', content: 'Error: Could not get a response.' };
    messages.value = await window.api.replaceLastChatMessage(errorMessage);
  } finally {
    isThinking.value = false;
  }
};

defineExpose({ sendMessage });

const handleCancelOperation = () => {
  window.api.reloadWindow();
};

const handleCalendarSelection = async (selection: { originalPrompt: string, selectedCalendarId: string }) => {
  const planMessage = messages.value.find(m => m.plan?.type === 'calendar_selection_request');
  const calendar = (planMessage?.plan as any)?.calendars.find(c => c.id === selection.selectedCalendarId);
  const calendarName = calendar ? calendar.summary : selection.selectedCalendarId;
  const systemMessage: ChatMessage = { role: 'system', content: `Using calendar: ${calendarName}` };
  await window.api.replaceLastChatMessage(systemMessage);
  
  const continuedPrompt = `${selection.originalPrompt}. Please use the calendar with the ID '${selection.selectedCalendarId}'.`;
  sendMessage(continuedPrompt, true);
};

const handlePlanApproval = async (plan: CalendarActionPlan) => {
  const systemMessage: ChatMessage = { role: 'system', content: `Executing plan: ${plan.summary}` };
  await window.api.replaceLastChatMessage(systemMessage);
  messages.value = await window.api.getChatHistory();

  try {
    const plainPlan = JSON.parse(JSON.stringify(plan));
    const result = await window.api.executeCalendarPlan(plainPlan);
    const resultMessage: ChatMessage = { role: 'system', content: result.success ? `✅ ${result.message}` : `❌ Error: ${result.error}` };
    messages.value = await window.api.addChatMessage(resultMessage);
  } catch (error) {
    console.error('Error executing plan:', error);
    const errorMessage: ChatMessage = { role: 'system', content: `❌ Error executing plan: ${error.message}` };
    messages.value = await window.api.addChatMessage(errorMessage);
  }
};

const handlePlanDismissal = async () => {
  const systemMessage: ChatMessage = { role: 'system', content: 'Action cancelled.' };
  messages.value = await window.api.replaceLastChatMessage(systemMessage);
};

const handlePlanReEvaluation = async (context: { originalPrompt: string, targetCalendarId: string }) => {
  isThinking.value = true;
  try {
    const history: ChatMessage[] = [{ role: 'user', content: context.originalPrompt }];
    const response: ChatMessage = await window.api.generateChatResponse(history, context.targetCalendarId);
    messages.value = await window.api.replaceLastChatMessage(response);
  } catch (error) {
    console.error('Error re-evaluating plan:', error);
    const errorMessage: ChatMessage = { role: 'model', content: 'Sorry, I had trouble re-evaluating that plan.' };
    messages.value = await window.api.replaceLastChatMessage(errorMessage);
  } finally {
    isThinking.value = false;
  }
};

const handleAIUpdate = async (update: any) => {
  const lastMessage = messages.value[messages.value.length - 1];
  if (lastMessage && lastMessage.isThinking) {
    let content = 'Thinking...';
    if (update.status === 'tool_call') {
      content = `Calling tool: ${update.name}...`;
    } else {
      content = update.content;
    }
    const updatedMessage: DisplayMessage = { ...lastMessage, content };
    messages.value = await window.api.replaceLastChatMessage(updatedMessage);
  }
};

const handleImportLog = async (log: string) => {
    const logMessage: ChatMessage = { role: 'system', content: log };
    messages.value = await window.api.addChatMessage(logMessage);
};

onMounted(() => {
  fetchHistory();
  checkAiStatus();
  window.api.onAIUpdate(handleAIUpdate);
  window.api.onReceiveMessage('import-log', handleImportLog);
});

onUnmounted(() => {
  // Cleanup listener if the component is ever unmounted
});
</script>

<style scoped>
/* Styles are largely the same */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f0f4f8;
}
.messages {
  flex-grow: 1;
  overflow-y: auto;
  padding: 20px;
}
.message {
  margin-bottom: 12px;
  max-width: 80%;
  word-wrap: break-word;
}
.message.user {
  align-self: flex-end;
  margin-left: auto;
  background-color: #dcf8c6;
  padding: 12px 18px;
  border-radius: 18px;
}
.message.model {
  align-self: flex-start;
  background-color: #ffffff;
  /* Model messages with plans don't need padding as the card has its own */
}
.message.model:not(:has(div[class*="-card"])) {
  padding: 12px 18px;
  border-radius: 18px;
}
.message.system {
  align-self: center;
  background-color: #f0f0f0;
  color: #666;
  font-style: italic;
  text-align: center;
  width: 100%;
  padding: 8px;
  border-radius: 8px;
}
.input-area-container {
  display: flex;
  flex-direction: column;
  border-top: 1px solid #ccc;
  padding: 10px;
}
.suggestion-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 10px;
  justify-content: center;
}
.suggestion-chips button {
  background-color: #e0eaf1;
  color: #333;
  border: 1px solid #cdd7e1;
  border-radius: 16px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.suggestion-chips button:hover {
  background-color: #d0dbe5;
}
.input-area {
  display: flex;
}
textarea {
  flex-grow: 1;
  border-radius: 15px;
  padding: 10px;
  border: 1px solid #ccc;
  resize: none;
}
textarea:disabled {
  background-color: #f5f5f5;
}
button {
  margin-left: 10px;
  padding: 10px 20px;
  border-radius: 15px;
  border: none;
  background-color: #4CAF50;
  color: white;
  cursor: pointer;
}
button:disabled {
  background-color: #a5d6a7;
  cursor: not-allowed;
}
.markdown-content {
  white-space: pre-wrap;
}
.ai-not-ready-banner {
  padding: 1rem;
  text-align: center;
  background-color: var(--background-secondary);
  border-top: 1px solid var(--border-color);
}
.button-secondary {
  background-color: #e0e0e0;
  color: #333;
  margin-top: 0.5rem;
}
.button-secondary:hover {
  background-color: #dcdcdc;
}

.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
}

.spinner {
  border: 3px solid rgba(0, 0, 0, 0.1);
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border-left-color: #555;
  animation: spin 1s ease infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
