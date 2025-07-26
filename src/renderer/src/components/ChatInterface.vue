<template>
  <div class="chat-container">
    <div class="messages">
      <div v-for="(message, index) in messages" :key="index" :class="['message', message.role]">
        <!-- Render the ActionConfirmationCard if the message has a plan -->
        <ActionConfirmationCard
          v-if="message.plan"
          :plan="message.plan"
          @approve="handlePlanApproval"
          @dismiss="handlePlanDismissal"
          @re-evaluate="handlePlanReEvaluation"
        />
        <!-- Render regular text content -->
        <div v-else-if="message.role === 'model'" class="markdown-content" v-html="renderMarkdown(message.content)"></div>
        <div v-else>
          {{ message.content }}
        </div>
      </div>
    </div>
    <div v-if="isAiReady" class="input-area">
      <textarea
        v-model="newMessage"
        @keyup.enter.prevent="sendMessage"
        @paste="handlePaste"
        placeholder="Type your message..."
        :disabled="isThinking"
      ></textarea>
      <button @click="sendMessage" :disabled="isThinking">
        {{ isThinking ? 'Thinking...' : 'Send' }}
      </button>
    </div>
    <div v-else class="ai-not-ready-banner">
      <p>The AI is not configured. Please set your Gemini API Key in the settings to enable the chat.</p>
      <button @click="goToSettings" class="button-secondary">Go to Settings</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ChatMessage, CalendarActionPlan } from '../../../types';
import ActionConfirmationCard from './ActionConfirmationCard.vue';
import { marked } from 'marked';

const goToSettings = () => alert("Please navigate to the Settings view from the sidebar.");

const messages = ref<ChatMessage[]>([]);
const newMessage = ref('');
const isAiReady = ref(false);
const isThinking = ref(false);

const checkAiStatus = async () => {
  try {
    isAiReady.value = await window.api.isAiReady();
    if (isAiReady.value) {
       messages.value.push({ role: 'system', content: 'Hello! How can I help you today?' });
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
  // This functionality can be re-integrated later if needed.
  // For now, we focus on the new chat flow.
};

const sendMessage = async () => {
  if (!isAiReady.value || isThinking.value) return;
  const userMessage = newMessage.value.trim();
  if (userMessage === '') return;

  messages.value.push({ role: 'user', content: userMessage });
  newMessage.value = '';
  isThinking.value = true;

  try {
    const history = getHistory();
    const response: ChatMessage = await window.api.generateChatResponse(history);
    messages.value.push(response);
  } catch (error) {
    console.error('Error sending message:', error);
    messages.value.push({ role: 'model', content: 'Error: Could not get a response.' });
  } finally {
    isThinking.value = false;
  }
};

const handlePlanApproval = async (plan: CalendarActionPlan) => {
  // Remove the card from the chat
  messages.value = messages.value.filter(m => m.plan?.originalPrompt !== plan.originalPrompt);
  // Add a system message indicating execution
  messages.value.push({ role: 'system', content: `Executing plan: ${plan.summary}` });

  try {
    const result = await window.api.executeCalendarPlan(plan);
    if (result.success) {
      messages.value.push({ role: 'system', content: `✅ ${result.message}` });
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error executing plan:', error);
    messages.value.push({ role: 'system', content: `❌ Error executing plan: ${error.message}` });
  }
};

const handlePlanDismissal = () => {
  messages.value = messages.value.filter(m => !m.plan);
  messages.value.push({ role: 'system', content: 'Plan dismissed.' });
};

const handlePlanReEvaluation = async (context: { originalPrompt: string, targetCalendarId: string }) => {
  isThinking.value = true;
  // Re-run the generation with the new calendar context
  try {
    const history: ChatMessage[] = [{ role: 'user', content: context.originalPrompt }];
    const response: ChatMessage = await window.api.generateChatResponse(history, context.targetCalendarId);
    
    // Find and update the existing plan message
    const planMessageIndex = messages.value.findIndex(m => m.plan?.originalPrompt === context.originalPrompt);
    if (planMessageIndex !== -1) {
      messages.value[planMessageIndex] = response;
    }
  } catch (error) {
    console.error('Error re-evaluating plan:', error);
    messages.value.push({ role: 'model', content: 'Sorry, I had trouble re-evaluating that plan.' });
  } finally {
    isThinking.value = false;
  }
};

const getHistory = (): ChatMessage[] => {
  // We only want to send text-based messages as history, not plans
  return messages.value.filter(m => !m.plan);
};

onMounted(() => {
  checkAiStatus();
});
</script>

<style scoped>
/* Styles remain largely the same, with minor additions for the thinking state */
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
.input-area {
  display: flex;
  padding: 10px;
  border-top: 1px solid #ccc;
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
</style>
