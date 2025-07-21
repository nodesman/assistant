<template>
  <div id="app-container">
    <OnboardingWizard v-if="showOnboarding" @finish="completeOnboarding" />
    <div class="main-layout">
      <Sidebar :active-tab="activeTab" @tab-change="changeTab" />
      <main class="main-content">
        <component :is="activeComponent" />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import Sidebar from './components/Sidebar.vue';
import ChatInterface from './components/ChatInterface.vue';
import CalendarView from './components/CalendarView.vue';
import Projects from './components/Projects.vue';
import Settings from './components/Settings.vue';
import OnboardingWizard from './components/OnboardingWizard.vue';

const activeTab = ref('Chat');
const showOnboarding = ref(false);

const checkOnboardingStatus = async () => {
  try {
    const hasCompleted = await window.api.getOnboardingStatus();
    showOnboarding.value = !hasCompleted;
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    // Assume onboarding is needed if there's an error
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

const activeComponent = computed(() => {
  switch (activeTab.value) {
    case 'Calendar':
      return CalendarView;
    case 'Projects':
      return Projects;
    case 'Settings':
      return Settings;
    case 'Chat':
    default:
      return ChatInterface;
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
}
</style>
