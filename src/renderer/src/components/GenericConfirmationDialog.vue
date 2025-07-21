<template>
  <div class="dialog-overlay" @mousedown.stop @click.stop @keydown.esc="$emit('cancel')">
    <div class="dialog-content" ref="dialogContent">
      <h4>{{ title }}</h4>
      <p>{{ message }}</p>
      <div class="dialog-actions">
        <button ref="confirmButton" @click="$emit('confirm')">Yes</button>
        <button @click="$emit('cancel')">No</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineProps } from 'vue';

const props = defineProps({
  title: String,
  message: String,
});

const confirmButton = ref<HTMLButtonElement | null>(null);
const dialogContent = ref<HTMLElement | null>(null);

onMounted(() => {
  // Focus the confirm button by default
  confirmButton.value?.focus();

  // Trap focus within the dialog
  dialogContent.value?.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      const focusableElements = dialogContent.value?.querySelectorAll('button');
      if (!focusableElements) return;
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }
  });
});
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}
.dialog-content {
  background-color: white;
  padding: 20px;
  border-radius: 5px;
  width: 300px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
}
.dialog-actions {
  text-align: right;
  margin-top: 20px;
}
.dialog-actions button {
  margin-left: 10px;
}
.dialog-actions button:focus {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}
</style>
