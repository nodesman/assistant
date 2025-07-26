<template>
  <div class="dialog-overlay" @mousedown.stop @click.stop @keydown.esc="handleCancel" @keydown.enter.prevent="requestConfirm">
    <div class="dialog-content">
      <h2>Create New Project</h2>
      <div class="form-group">
        <label>Project Title</label>
        <input type="text" v-model="projectTitle" placeholder="Enter project title" ref="titleInput" />
      </div>
      <div class="dialog-actions">
        <button @click="requestConfirm" :disabled="!projectTitle.trim()">Create Project</button>
        <button @click="handleCancel">Cancel</button>
      </div>
    </div>
    <GenericConfirmationDialog
        v-if="showConfirmation"
        title="Confirm Creation"
        message="Are you sure you want to create this project?"
        @confirm="handleConfirm"
        @cancel="showConfirmation = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineEmits } from 'vue';
import GenericConfirmationDialog from './GenericConfirmationDialog.vue';

const emit = defineEmits(['confirm', 'cancel']);

const projectTitle = ref('');
const showConfirmation = ref(false);
const titleInput = ref<HTMLInputElement | null>(null);

onMounted(() => {
  titleInput.value?.focus();
});

const requestConfirm = () => {
  if (projectTitle.value.trim()) {
    showConfirmation.value = true;
  }
};

const handleConfirm = () => {
  emit('confirm', projectTitle.value.trim());
  showConfirmation.value = false;
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}
.dialog-content {
  background-color: #ffffff;
  padding: 24px;
  border-radius: 12px;
  width: 480px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
  animation: slide-up 0.3s ease-out;
  border: 1px solid #e0e0e0;
}
@keyframes slide-up {
  from {
    transform: translateY(15px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
h2 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}
.form-group {
  margin-bottom: 16px;
}
.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #555;
  font-size: 14px;
}
.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #dcdcdc;
  border-radius: 6px;
  font-size: 14px;
  background-color: #fdfdfd;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.form-group input:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.1);
}
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
}
.dialog-actions button {
  padding: 10px 20px;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease;
}
.dialog-actions button:first-child {
  background-color: #4a90e2;
  color: white;
  border-color: #4a90e2;
}
.dialog-actions button:first-child:hover {
  background-color: #357abd;
}
.dialog-actions button:first-child:disabled {
  background-color: #a0c7e4;
  border-color: #a0c7e4;
  cursor: not-allowed;
}
.dialog-actions button:last-child {
  background-color: #f9f9f9;
  color: #555;
  border-color: #e0e0e0;
}
.dialog-actions button:last-child:hover {
  background-color: #f0f0f0;
  border-color: #dcdcdc;
}
</style>
