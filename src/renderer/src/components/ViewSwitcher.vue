<template>
  <div class="view-switcher">
    <button @click="setView('Day')" :class="{ active: currentView === 'Day' }">Day</button>
    <button @click="setView('Week')" :class="{ active: currentView === 'Week' }">Week</button>
    <button @click="setView('Month')" :class="{ active: currentView === 'Month' }">Month</button>
  </div>
</template>

<script setup lang="ts">
import { defineEmits, defineProps } from 'vue';

const props = defineProps({
  currentView: String,
});

const emit = defineEmits(['view-changed']);

const setView = (view) => {
  emit('view-changed', view);
};
</script>

<style scoped>
.view-switcher {
  display: inline-flex;
  background-color: #e0e0e0;
  border-radius: 20px;
  padding: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.view-switcher button {
  padding: 8px 20px;
  border: none;
  background-color: transparent;
  cursor: pointer;
  font-weight: 600;
  color: #555;
  transition: all 0.3s ease;
  border-radius: 16px;
}
.view-switcher button.active {
  background-color: #ffffff;
  color: #007bff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
</style>
