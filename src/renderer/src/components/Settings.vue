<template>
  <div>
    <h2>Settings</h2>
    <div v-if="user">
      <p>Authorized as: {{ user.name }} ({{ user.email }})</p>
      <button @click="removeAccount">Remove Account</button>
    </div>
    <div v-else>
      <p>No Google account authorized.</p>
      <button @click="authorizeAccount">Authorize Google Account</button>
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
    // After authorization, the main process will handle the token exchange.
    // We can then fetch the user info again.
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
