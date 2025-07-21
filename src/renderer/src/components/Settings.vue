<template>
  <div class="settings-view">
    <header class="view-header">
      <h1>Settings</h1>
    </header>
    <div class="settings-content">
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
import { ref, onMounted } from 'vue';

const user = ref<any>(null);

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
});
</script>

<style scoped>
.settings-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.view-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.settings-content {
  padding-top: 2rem;
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
  font-size: 1.25rem;
}

.settings-card .description {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: var(--text-secondary);
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
  margin: 0;
}

.user-email {
  color: var(--text-secondary);
  margin: 0;
  font-size: 0.875rem;
}

button {
  padding: 10px 20px;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease;
}

.button-primary {
  background-color: var(--accent-primary);
  color: white;
  border-color: var(--accent-primary);
}
.button-primary:hover {
  opacity: 0.9;
}

.button-danger {
  background-color: #e74c3c;
  color: white;
  border-color: #e74c3c;
}
.button-danger:hover {
  background-color: #c0392b;
}
</style>
