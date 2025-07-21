<template>
  <div class="chat-container">
    <div class="messages">
      <div v-for="(message, index) in messages" :key="index" :class="['message', message.role]">
        <ConfirmationDialog
          v-if="message.type === 'confirmation'"
          :data="message.data"
          @confirm="handleConfirmation(true, message.data)"
          @cancel="handleConfirmation(false)"
        />
        <div v-else-if="message.role === 'model'" class="markdown-content" v-html="renderMarkdown(message.content)"></div>
        <div v-else>
          {{ message.content }}
        </div>
      </div>
    </div>
    <div class="input-area">
      <textarea
        v-model="newMessage"
        @keyup.enter.prevent="sendMessage"
        @paste="handlePaste"
        placeholder="Type your message... or paste a block of text to import."
      ></textarea>
      <button @click="sendMessage">Send</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ChatMessage } from '../../../types';
import ConfirmationDialog from './ConfirmationDialog.vue';
import { marked } from 'marked';

interface DisplayMessage {
  role: 'user' | 'model' | 'system';
  content?: string;
  type?: 'text' | 'confirmation';
  data?: any;
}

const messages = ref<DisplayMessage[]>([]);
const newMessage = ref('');

const renderMarkdown = (content: string) => {
  if (content) {
    return marked(content);
  }
  return '';
};

const handlePaste = async (event: ClipboardEvent) => {
  const pastedText = event.clipboardData?.getData('text');
  if (pastedText && pastedText.length > 100) { // Heuristic for "large" text
    event.preventDefault(); // Prevent the text from being pasted into the textarea
    messages.value.push({ role: 'system', content: 'Parsing pasted text...', type: 'text' });
    try {
      const parsedData = await window.api.parseTextForProjects(pastedText);
      if (parsedData.projects.length > 0 || parsedData.tasks.length > 0) {
        messages.value.push({ role: 'system', type: 'confirmation', data: parsedData });
      } else {
        messages.value.push({ role: 'system', content: 'I couldn\'t find any projects or tasks in the text you pasted.', type: 'text' });
      }
    } catch (error) {
      console.error('Error parsing pasted text:', error);
      messages.value.push({ role: 'system', content: 'Sorry, I had trouble parsing that text.', type: 'text' });
    }
  }
};

const sendMessage = async () => {
  const userMessage = newMessage.value.trim();
  if (userMessage === '') return;

  messages.value.push({ role: 'user', content: userMessage, type: 'text' });
  newMessage.value = '';

  try {
    const history = getHistory();
    const response = await window.api.generateChatResponse(history);
    messages.value.push({ role: 'model', content: response, type: 'text' });
  } catch (error) {
    console.error('Error sending message:', error);
    messages.value.push({ role: 'model', content: 'Error: Could not get a response.', type: 'text' });
  }
};

const handleConfirmation = async (isConfirmed: boolean, data?: any) => {
  messages.value = messages.value.filter(m => m.type !== 'confirmation');
  if (isConfirmed) {
    try {
      await window.api.importParsedProjects(data);
      messages.value.push({ role: 'system', content: 'Successfully imported the projects and tasks!', type: 'text' });
    } catch (error) {
      console.error('Error importing projects:', error);
      messages.value.push({ role: 'system', content: 'There was an error importing the data.', type: 'text' });
    }
  } else {
    messages.value.push({ role: 'system', content: 'Import cancelled.', type: 'text' });
  }
};

const getHistory = (): ChatMessage[] => {
  const history: ChatMessage[] = messages.value
    .filter(m => m.type === 'text' && (m.role === 'user' || m.role === 'model'))
    .map(m => ({
      role: m.role,
      content: m.content || ''
    }));

  const today = new Date().toISOString().slice(0, 10);
  const systemPrompt = `Today's date is ${today}.`;

  return [{ role: 'system', content: systemPrompt }, ...history];
};

onMounted(() => {
  messages.value.push({ role: 'system', content: 'Hello! How can I help you today? Paste a block of text to import projects and tasks.', type: 'text' });
});
</script>

<style scoped>
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
  padding: 12px 18px;
  border-radius: 18px;
  margin-bottom: 12px;
  max-width: 80%;
  word-wrap: break-word;
}
.user {
  background-color: #dcf8c6;
  align-self: flex-end;
  margin-left: auto;
}
.model {
  background-color: #ffffff;
  align-self: flex-start;
  text-align: left;
}
.system {
  background-color: #f0f0f0;
  color: #666;
  font-style: italic;
  text-align: center;
  align-self: center;
  max-width: 100%;
  width: 100%;
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
button {
  margin-left: 10px;
  padding: 10px 20px;
  border-radius: 15px;
  border: none;
  background-color: #4CAF50;
  color: white;
  cursor: pointer;
}
.markdown-content {
  white-space: pre-wrap;
}
</style>
