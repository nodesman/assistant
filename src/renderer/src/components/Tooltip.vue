<template>
  <div v-if="visible" class="tooltip" :style="{ top: y + 'px', left: x + 'px' }">
    <pre>{{ content }}</pre>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  content: string;
  x: number;
  y: number;
}>();
</script>

<style scoped>
.tooltip {
  position: fixed;
  background-color: #333;
  color: white;
  padding: 10px;
  border-radius: 5px;
  z-index: 1000;
  pointer-events: none; /* Allows mouse events to pass through to elements underneath */
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 12px;
}
</style>
