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
  backdrop-filter: blur(5px);
}
.dialog-content {
  background-color: white;
  padding: 30px;
  border-radius: 12px;
  width: 350px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  text-align: center;
  animation: fade-in 0.2s ease-out;
}
@keyframes fade-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
h4 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}
p {
  margin-bottom: 25px;
  color: #555;
  font-size: 16px;
}
.dialog-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}
.dialog-actions button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease;
}
.dialog-actions button:first-child {
  background-color: #007bff;
  color: white;
}
.dialog-actions button:first-child:hover {
  background-color: #0056b3;
}
.dialog-actions button:last-child {
  background-color: #f0f0f0;
  color: #555;
}
.dialog-actions button:last-child:hover {
  background-color: #e0e0e0;
}
.dialog-actions button:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.2);
}
</style>
