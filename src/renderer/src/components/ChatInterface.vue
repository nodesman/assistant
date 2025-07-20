<template>
  <div class="chat-container">
    <div class="messages">
      <div v-for="message in messages" :key="message.content" :class="message.role">
        {{ message.content }}
      </div>
    </div>
    <div class="input-area">
      <textarea v-model="newMessage" @keyup.enter="sendMessage" placeholder="Type your message..."></textarea>
      <button @click="sendMessage">Send</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ChatMessage } from '../../../types';

const messages = ref<ChatMessage[]>([]);
const newMessage = ref('');

const sendMessage = async () => {
  if (newMessage.value.trim() === '') return;

  messages.value.push({ role: 'user', content: newMessage.value });
  const userMessage = newMessage.value;
  newMessage.value = '';

  try {
    const context = await getContext();
    const response = await window.api.generateChatResponse(context, userMessage);
    messages.value.push({ role: 'model', content: response });
  } catch (error) {
    console.error('Error sending message:', error);
    messages.value.push({ role: 'model', content: 'Error: Could not get a response.' });
  }
};

const getContext = async () => {
  try {
    const projects = await window.api.getProjects();
    const goals = await window.api.getGoals();
    const calendarEvents = await window.api.getCalendarEvents();

    let context = 'Projects:\n';
    projects.forEach(p => {
      context += `- ${p.title}\n`;
    });

    context += '\nGoals:\n';
    goals.goals.forEach(g => {
      context += `- ${g.title}\n`;
    });

    context += '\nCalendar Events:\n';
    calendarEvents.forEach(e => {
      context += `- ${e.summary} at ${e.start.dateTime}\n`;
    });

    return context;
  } catch (error) {
    console.error('Error fetching context:', error);
    return 'Could not fetch context.';
  }
};

onMounted(() => {
  messages.value.push({ role: 'model', content: 'Hello! How can I help you today?' });
});
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.messages {
  flex-grow: 1;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid #ccc;
  margin-bottom: 10px;
}

.user {
  text-align: right;
  margin-bottom: 5px;
}

.model {
  text-align: left;
  margin-bottom: 5px;
  white-space: pre-wrap;
}

.input-area {
  display: flex;
}

textarea {
  flex-grow: 1;
  height: 50px;
}
</style>
