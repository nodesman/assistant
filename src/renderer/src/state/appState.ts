// src/renderer/src/state/appState.ts
import { reactive } from 'vue';

// The single source of truth for our application's reactive state.
const appState = reactive({
  isAiReady: false,
});

/**
 * Checks the backend for the AI configuration status and updates the shared state.
 * This function will be called by components when they mount and after the config is changed.
 */
async function updateAiState() {
  try {
    console.log('[appState] Checking AI readiness...');
    appState.isAiReady = await window.api.isAiReady();
    console.log(`[appState] AI isReady state updated to: ${appState.isAiReady}`);
  } catch (error) {
    console.error('Error updating AI state:', error);
    appState.isAiReady = false;
  }
}

// Export the readonly state and the update function for components to use.
export { appState, updateAiState };
