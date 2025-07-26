<template>
  <div class="settings-view">
    <header class="view-header">
      <h1>Settings</h1>
    </header>
    <div class="settings-content">
      <!-- Gemini API Key Card -->
      <div class="settings-card">
        <h3>Gemini AI</h3>
        <p class="description">
          Manage your Google Gemini API Key. This key is required for all AI-powered features.
          <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-link">Get your key here.</a>
        </p>
        <div class="form-group">
          <label for="gemini-api-key">API Key</label>
          <div class="input-group">
            <input type="password" id="gemini-api-key" v-model="geminiApiKey" placeholder="Enter your API key">
            <button @click="saveApiKey" class="button-primary" :disabled="!isApiKeyDirty">Save</button>
          </div>
          <p v-if="saveStatus" :class="['save-status', { 'is-success': isSaveSuccess }]">{{ saveStatus }}</p>
        </div>
      </div>

      <!-- Google Account Card -->
      <div class="settings-card">
        <h3>Google Account</h3>
        <p class="description">Link your Google Account to sync with Google Calendar.</p>
        <div v-if="user" class="account-info">
          <div class="user-details">
            <p class="user-name">{{ user.name }}</p>
            <p class="user-email">{{ user.email }}</p>
          </div>
          <button @click="removeAccount" class="button-danger">Remove Account</button>
        </div>
        <div v-else>
          <p>No Google account authorized.</p>
          <button @click="authorizeAccount" class="button-primary">Authorize Google Account</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { JournalConfig } from '../../../types';

const user = ref<any>(null);
const geminiApiKey = ref('');
const originalApiKey = ref('');
const saveStatus = ref('');
const isSaveSuccess = ref(false);

const isApiKeyDirty = computed(() => geminiApiKey.value !== originalApiKey.value);

watch(geminiApiKey, () => {
  // Clear save status when user starts typing again
  saveStatus.value = '';
});

const fetchConfig = async () => {
  try {
    const config: JournalConfig = await window.api.getConfig();
    geminiApiKey.value = config.ai?.apiKey || '';
    originalApiKey.value = config.ai?.apiKey || '';
  } catch (error) {
    console.error('Error fetching config:', error);
  }
};

const saveApiKey = async () => {
  try {
    const result = await window.api.updateConfig({
      ai: {
        apiKey: geminiApiKey.value
      }
    });
    if (result.success) {
      originalApiKey.value = geminiApiKey.value;
      isSaveSuccess.value = true;
      saveStatus.value = 'API Key saved successfully!';
    } else {
      throw new Error(result.error || 'Unknown error occurred.');
    }
  } catch (error) {
    console.error('Error saving API key:', error);
    isSaveSuccess.value = false;
    saveStatus.value = 'Failed to save API key.';
  }
};

const fetchUser = async () => {
  try {
    user.value = await window.api.getAuthorizedUser();
  } catch (error) {
    console.error('Error fetching user:', error);
  }
};

const authorizeAccount = async () => {
  try {
    await window.api.authorizeGoogleAccount();
    fetchUser();
  } catch (error) {
    console.error('Error authorizing account:', error);
  }
};

const removeAccount = async () => {
  try {
    await window.api.removeGoogleAccount();
    user.value = null;
  } catch (error) {
    console.error('Error removing account:', error);
  }
};

onMounted(() => {
  fetchUser();
  fetchConfig();
});
</script>

<style scoped>
.settings-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.view-header {
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.view-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.settings-content {
  padding-top: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.settings-card {
  background-color: var(--background-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  padding: 1.5rem;
  max-width: 600px;
}

.settings-card h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.settings-card .description {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: var(--text-secondary);
}

.text-link {
  color: var(--accent-primary);
  text-decoration: none;
}
.text-link:hover {
  text-decoration: underline;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group {
  display: flex;
  gap: 0.5rem;
}

.input-group input {
  flex-grow: 1;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--background-primary);
  color: var(--text-primary);
}

.save-status {
  font-size: 0.875rem;
  margin-top: 0.5rem;
  color: #e74c3c;
}

.save-status.is-success {
  color: #27ae60;
}

.account-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--background-primary);
  padding: 1rem;
  border-radius: 6px;
}

.user-name {
  font-weight: 600;
}

.user-email {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

button {
  padding: 10px 20px;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button-primary {
  background-color: var(--accent-primary);
  color: white;
}
.button-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.button-danger {
  background-color: #e74c3c;
  color: white;
}
.button-danger:hover {
  background-color: #c0392b;
}
</style>
