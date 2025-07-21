<template>
  <div id="app-container" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <div class="sidebar-toggle" @click="toggleSidebar">
      <span class="hamburger"></span>
    </div>
    <nav class="sidebar">
      <button @click="activeTab = 'Goals'">Goals</button>
      <button @click="activeTab = 'Projects'">Projects</button>
      <button @click="activeTab = 'Journal'">Journal</button>
      <button @click="activeTab = 'Calendar'">Calendar</button>
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
import Calendar from './components/Calendar.vue';
import Chat from './components/ChatInterface.vue';
import Settings from './components/Settings.vue';

const activeTab = ref('Goals');
const isSidebarCollapsed = ref(false);

const activeComponent = computed(() => {
  switch (activeTab.value) {
    case 'Goals':
      return Goals;
    case 'Projects':
      return Projects;
    case 'Journal':
      return Journal;
    case 'Calendar':
      return Calendar;
    case 'Chat':
      return Chat;
    case 'Settings':
      return Settings;
    default:
      return Goals;
  }
});

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
};

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
  transition: margin-left 0.3s ease;
}

.sidebar {
  width: 200px;
  background-color: #f4f4f4;
  padding: 60px 20px 20px;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
  transform: translateX(0);
}

.sidebar-collapsed .sidebar {
  transform: translateX(-100%);
}

.sidebar-toggle {
  position: fixed;
  top: 15px;
  left: 15px;
  z-index: 1100;
  cursor: pointer;
}

.hamburger,
.hamburger::before,
.hamburger::after {
  content: '';
  display: block;
  width: 25px;
  height: 3px;
  background-color: #333;
  margin: 5px 0;
  transition: transform 0.3s ease;
}

.sidebar-collapsed .hamburger {
  transform: rotate(45deg) translate(4px, 4px);
}
.sidebar-collapsed .hamburger::before {
  opacity: 0;
}
.sidebar-collapsed .hamburger::after {
  transform: rotate(-90deg) translate(7px, -7px);
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
  transition: margin-left 0.3s ease;
}

.sidebar-collapsed .main-content {
  margin-left: -200px;
}
</style>
