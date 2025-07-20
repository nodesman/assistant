<template>
  <div id="app-container">
    <nav class="sidebar">
      <button @click="activeTab = 'Goals'">Goals</button>
      <button @click="activeTab = 'Projects'">Projects</button>
      <button @click="activeTab = 'Journal'">Journal</button>
      <button @click="activeTab = 'Chat'">Chat</button>
      <button @click="activeTab = 'Settings'">Settings</button>
    </nav>
    <main class="main-content">
      <component :is="activeComponent" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Goals from './components/Goals.vue';
import Projects from './components/Projects.vue';
import Journal from './components/Journal.vue';
import Chat from './components/ChatInterface.vue';
import Settings from './components/Settings.vue';

const activeTab = ref('Goals');

const activeComponent = computed(() => {
  switch (activeTab.value) {
    case 'Goals':
      return Goals;
    case 'Projects':
      return Projects;
    case 'Journal':
      return Journal;
    case 'Chat':
      return Chat;
    case 'Settings':
      return Settings;
    default:
      return Goals;
  }
});

onMounted(() => {
  window.api.onReceiveMessage('change-tab', (tabName) => {
    activeTab.value = tabName;
  });
});
</script>

<style>
#app-container {
  display: flex;
  height: 100vh;
  font-family: Avenir, Helvetica, Arial, sans-serif;
}

.sidebar {
  width: 200px;
  background-color: #f4f4f4;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.sidebar button {
  background: none;
  border: 1px solid #ccc;
  padding: 10px;
  margin-bottom: 10px;
  cursor: pointer;
  text-align: left;
  border-radius: 5px;
}

.sidebar button:hover {
  background-color: #e9e9e9;
}

.main-content {
  flex-grow: 1;
  padding: 20px;
}
</style>
