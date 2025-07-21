<template>
  <div id="app-container">
    <nav class="sidebar">
      <div class="sidebar-header">
        <button class="sidebar-toggle" @click="toggleSidebar">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
        </button>
      </div>
      <div class="sidebar-menu">
        <button @click="activeTab = 'Projects'" :class="{ active: activeTab === 'Projects' }">P<span>rojects</span></button>
        <button @click="activeTab = 'Calendar'" :class="{ active: activeTab === 'Calendar' }">C<span>alendar</span></button>
        <button @click="activeTab = 'Chat'" :class="{ active: activeTab === 'Chat' }">C<span>hat</span></button>
      </div>
      <div class="sidebar-footer">
        <button @click="activeTab = 'Import'" :class="{ active: activeTab === 'Import' }">I<span>mport</span></button>
        <button @click="activeTab = 'Settings'" :class="{ active: activeTab === 'Settings' }">S<span>ettings</span></button>
      </div>
    </nav>
    <main class="main-content">
      <component :is="activeComponent" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Projects from './components/Projects.vue';
import Calendar from './components/Calendar.vue';
import Chat from './components/ChatInterface.vue';
import Settings from './components/Settings.vue';
import ImportView from './components/ImportView.vue';

const activeTab = ref('Projects');

const activeComponent = computed(() => {
  switch (activeTab.value) {
    case 'Projects': return Projects;
    case 'Calendar': return Calendar;
    case 'Chat': return Chat;
    case 'Settings': return Settings;
    case 'Import': return ImportView;
    default: return Projects;
  }
});

const toggleSidebar = () => {
  const container = document.getElementById('app-container');
  container?.classList.toggle('sidebar-collapsed');
};

onMounted(() => {
  window.api.onReceiveMessage('change-tab', (tabName) => {
    activeTab.value = tabName;
  });
});
</script>

<style>
:root {
  --sidebar-width: 220px;
  --sidebar-width-collapsed: 60px;
  --header-height: 60px;
  --background-primary: #f0f2f5;
  --background-secondary: #ffffff;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --accent-primary: #4a90e2;
  --border-color: #e5e7eb;
}

body {
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: var(--background-primary);
  color: var(--text-primary);
}

#app-container {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: var(--sidebar-width);
  background-color: var(--background-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: var(--header-height);
  padding: 0 1rem;
}

.sidebar-toggle {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
}

.sidebar-menu {
  flex-grow: 1;
  padding: 0 1rem;
}

.sidebar-menu button,
.sidebar-footer button {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px;
  margin-bottom: 8px;
  background: none;
  border: none;
  border-radius: 6px;
  text-align: left;
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.sidebar-menu button:hover,
.sidebar-footer button:hover {
  background-color: var(--background-primary);
  color: var(--text-primary);
}

.sidebar-menu button.active,
.sidebar-footer button.active {
  background-color: var(--accent-primary);
  color: white;
}

.sidebar-footer {
  padding: 0 1rem 1rem;
}

.main-content {
  flex-grow: 1;
  height: 100vh;
  overflow-y: auto;
  padding: 2rem;
}

/* Collapsed State */
#app-container.sidebar-collapsed .sidebar {
  width: var(--sidebar-width-collapsed);
}

#app-container.sidebar-collapsed .sidebar-header {
  justify-content: center;
  padding: 0;
}

#app-container.sidebar-collapsed .sidebar-menu button,
#app-container.sidebar-collapsed .sidebar-footer button {
  justify-content: center;
  font-size: 1.5rem; /* Larger font for the single letter */
  font-weight: 600;
}

#app-container.sidebar-collapsed .sidebar-menu button span,
#app-container.sidebar-collapsed .sidebar-footer button span {
  display: none;
}

#app-container.sidebar-collapsed .sidebar-toggle {
  margin-right: 0;
}
</style>
