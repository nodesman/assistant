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
  margin-bottom: 10px;
}
.view-switcher button {
  padding: 5px 10px;
  margin-right: 5px;
  border: 1px solid #ccc;
  background-color: #f0f0f0;
  cursor: pointer;
}
.view-switcher button.active {
  background-color: #007bff;
  color: white;
}
</style>
