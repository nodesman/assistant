<template>
  <div class="dialog-overlay">
    <div class="dialog-content">
      <h2>Create New Event</h2>
      <div class="form-group">
        <label>Project</label>
        <select v-model="selectedProject" @change="handleProjectChange">
          <option disabled value="">Please select one</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">
            {{ project.title }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label>Task</label>
        <select v-model="selectedTask">
          <option disabled value="">Please select one</option>
          <option v-for="task in availableTasks" :key="task.id" :value="task.id">
            {{ task.title }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label>Start Time</label>
        <input type="text" :value="formatTime(startTime)" readonly />
      </div>
      <div class="form-group">
        <label>End Time</label>
        <input type="text" :value="formatTime(endTime)" readonly />
      </div>
      <div class="dialog-actions">
        <button @click="handleConfirm">Create Event</button>
        <button @click="handleCancel">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, defineEmits, defineProps } from 'vue';
import moment from 'moment';

const props = defineProps({
  startTime: Object,
  endTime: Object,
});

const emit = defineEmits(['confirm', 'cancel']);

const projects = ref([]);
const selectedProject = ref('');
const selectedTask = ref('');

onMounted(async () => {
  projects.value = await window.api.getProjects();
});

const availableTasks = computed(() => {
  if (!selectedProject.value) return [];
  const project = projects.value.find(p => p.id === selectedProject.value);
  return project ? project.tasks : [];
});

const formatTime = (date) => {
  return moment(date).format('h:mm A');
};

const handleProjectChange = () => {
  selectedTask.value = '';
};

const handleConfirm = () => {
  const task = availableTasks.value.find(t => t.id === selectedTask.value);
  emit('confirm', { task });
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
}
.dialog-content {
  background-color: white;
  padding: 20px;
  border-radius: 5px;
  width: 400px;
}
.form-group {
  margin-bottom: 15px;
}
.form-group label {
  display: block;
  margin-bottom: 5px;
}
.form-group select, .form-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 3px;
}
.dialog-actions {
  text-align: right;
}
.dialog-actions button {
  margin-left: 10px;
}
</style>
