<template>
  <div id="app-container">
    <OnboardingWizard v-if="showOnboarding" @finish="completeOnboarding" />
    <div class="main-layout" :class="{ 'palette-is-open': !isPaletteCollapsed }">
      <Sidebar :active-tab="activeTab" @tab-change="changeTab" />
      <main class="main-content">
        <!-- Use v-show for ChatInterface to keep it alive and referenceable -->
        <ChatInterface ref="chatInterfaceRef" v-show="activeTab === 'Chat'" />
        <CalendarView v-if="activeTab === 'Calendar'" />
        <Projects v-if="activeTab === 'Projects'" />
        <Settings v-if="activeTab === 'Settings'" />
      </main>
      <ActionPalette @action-clicked="handleAction" @update:collapsed="updatePaletteState" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Sidebar from './components/Sidebar.vue';
import ChatInterface from './components/ChatInterface.vue';
import CalendarView from './components/CalendarView.vue';
import Projects from './components/Projects.vue';
import Settings from './components/Settings.vue';
import OnboardingWizard from './components/OnboardingWizard.vue';
import ActionPalette from './components/ActionPalette.vue';

const activeTab = ref('Chat');
const showOnboarding = ref(false);
const chatInterfaceRef = ref(null);
const isPaletteCollapsed = ref(true);

const handleAction = (prompt: string) => {
  if (activeTab.value !== 'Chat') {
    activeTab.value = 'Chat';
  }
  // Ensure the chat interface is mounted and ready
  setTimeout(() => {
    if (chatInterfaceRef.value) {
      (chatInterfaceRef.value as any).sendMessage(prompt);
    }
  }, 0);
};

const updatePaletteState = (collapsed: boolean) => {
  isPaletteCollapsed.value = collapsed;
};

const checkOnboardingStatus = async () => {
  try {
    const hasCompleted = await window.api.getOnboardingStatus();
    showOnboarding.value = !hasCompleted;
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    showOnboarding.value = true;
  }
};

const completeOnboarding = async () => {
  try {
    await window.api.setOnboardingCompleted();
    showOnboarding.value = false;
  } catch (error) {
    console.error('Error completing onboarding:', error);
  }
};

onMounted(() => {
  checkOnboardingStatus();
  if (window.api?.onReceiveMessage) {
    window.api.onReceiveMessage('change-tab', (tabName) => {
      activeTab.value = tabName;
    });
  } else {
    console.error("Preload script not loaded, 'window.api' is not available.");
  }
});

const changeTab = (tabName: string) => {
  activeTab.value = tabName;
};
</script>

<style>
/* Global styles */
:root {
  --background-primary: #ffffff;
  --background-secondary: #f8f9fa;
  --border-color: #e9ecef;
  --text-primary: #212529;
  --text-secondary: #6c757d;
  --accent-primary: #4a90e2;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: var(--background-secondary);
  color: var(--text-primary);
}

.main-layout {
  display: flex;
  height: 100vh;
}

.main-content {
  flex-grow: 1;
  overflow: auto;
  padding: 1.5rem;
  transition: margin-right 0.3s ease-in-out;
}

.main-layout.palette-is-open .main-content {
  margin-right: 240px; /* Corresponds to the palette width minus its collapsed size */
}
</style>
