<template>
  <div>
    <h2>Journal</h2>
    <button @click="fetchEntries">Refresh</button>
    <div v-for="entry in entries" :key="entry.title">
      <h3>{{ entry.title }}</h3>
      <p>{{ entry.content }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { JournalEntry } from '../../../types';

const entries = ref<JournalEntry[]>([]);

const fetchEntries = async () => {
  try {
    entries.value = await window.api.getJournalEntries();
  } catch (error) {
    console.error('Error fetching journal entries:', error);
  }
};

onMounted(() => {
  fetchEntries();
});
</script>
