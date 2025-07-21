<template>
  <div class="dialog-overlay" @mousedown.stop @click.stop @keydown.esc="handleCancel" @keydown.enter.prevent="requestUpdate">
    <div class="dialog-content">
      <h2>Edit Event</h2>
      <div class="form-group">
        <label>Calendar</label>
        <input type="text" :value="editableEvent.calendarId" disabled />
      </div>
      <div class="form-group">
        <label>Project</label>
        <select v-model="selectedProject" @change="handleProjectChange">
          <option value="">None</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">
            {{ project.title }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label>Task</label>
        <select v-model="selectedTask">
          <option value="">None</option>
          <option v-for="task in availableTasks" :key="task.id" :value="task.id">
            {{ task.title }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label>Summary</label>
        <input type="text" v-model="editableEvent.summary" />
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea v-model="editableEvent.description"></textarea>
      </div>
      <div class="form-group">
        <label>Start Time</label>
        <input type="datetime-local" v-model="editableEvent.start.dateTime" />
      </div>
      <div class="form-group">
        <label>End Time</label>
        <input type="datetime-local" v-model="editableEvent.end.dateTime" />
      </div>
      <div class="dialog-actions">
        <button class="delete-btn" @click="requestDelete">Delete</button>
        <button @click="requestUpdate">Update Event</button>
        <button @click="handleCancel">Cancel</button>
      </div>
    </div>
    <GenericConfirmationDialog
      v-if="showUpdateConfirmation"
      title="Confirm Update"
      message="Are you sure you want to update this event?"
      @confirm="handleConfirm"
      @cancel="showUpdateConfirmation = false"
    />
    <GenericConfirmationDialog
      v-if="showDeleteConfirmation"
      title="Confirm Deletion"
      message="Are you sure you want to delete this event?"
      @confirm="handleDelete"
      @cancel="showDeleteConfirmation = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, defineEmits, defineProps } from 'vue';
import moment from 'moment';
import GenericConfirmationDialog from './GenericConfirmationDialog.vue';

const props = defineProps({
  event: Object,
});

const emit = defineEmits(['confirm', 'cancel', 'delete']);

const projects = ref([]);
const selectedProject = ref('');
const selectedTask = ref('');
const editableEvent = ref(JSON.parse(JSON.stringify(props.event)));
const showUpdateConfirmation = ref(false);
const showDeleteConfirmation = ref(false);
const duration = ref(moment(props.event.end.dateTime).diff(moment(props.event.start.dateTime)));

editableEvent.value.start.dateTime = moment(editableEvent.value.start.dateTime).format('YYYY-MM-DDTHH:mm');
editableEvent.value.end.dateTime = moment(editableEvent.value.end.dateTime).format('YYYY-MM-DDTHH:mm');

onMounted(async () => {
  projects.value = await window.api.getProjects();
});

const availableTasks = computed(() => {
  if (!selectedProject.value) return [];
  const project = projects.value.find(p => p.id === selectedProject.value);
  return project ? project.tasks : [];
});

watch(selectedTask, (newTaskId) => {
  if (newTaskId) {
    const task = availableTasks.value.find(t => t.id === newTaskId);
    if (task) {
      editableEvent.value.summary = task.title;
      editableEvent.value.description = task.body;
    }
  }
});

watch(() => editableEvent.value.start.dateTime, (newStart) => {
  const start = moment(newStart);
  const end = moment(editableEvent.value.end.dateTime);
  if (start.isAfter(end)) {
    editableEvent.value.end.dateTime = start.clone().add(duration.value).format('YYYY-MM-DDTHH:mm');
  } else {
    duration.value = end.diff(start);
  }
});

watch(() => editableEvent.value.end.dateTime, (newEnd) => {
  const start = moment(editableEvent.value.start.dateTime);
  const end = moment(newEnd);
  if (end.isBefore(start)) {
    // If end is before start, set it to 30 minutes after the start time
    editableEvent.value.end.dateTime = start.clone().add(30, 'minutes').format('YYYY-MM-DDTHH:mm');
  }
  duration.value = moment(editableEvent.value.end.dateTime).diff(moment(editableEvent.value.start.dateTime));
});

const handleProjectChange = () => {
  selectedTask.value = '';
};

const requestUpdate = () => {
  showUpdateConfirmation.value = true;
};

const requestDelete = () => {
  showDeleteConfirmation.value = true;
};

const handleConfirm = () => {
  editableEvent.value.start.dateTime = moment(editableEvent.value.start.dateTime).toISOString();
  editableEvent.value.end.dateTime = moment(editableEvent.value.end.dateTime).toISOString();
  const plainEvent = JSON.parse(JSON.stringify(editableEvent.value));
  emit('confirm', plainEvent);
  showUpdateConfirmation.value = false;
};

const handleDelete = () => {
  emit('delete', editableEvent.value.id);
  showDeleteConfirmation.value = false;
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
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}
.dialog-content {
  background-color: white;
  padding: 30px;
  border-radius: 12px;
  width: 450px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
  animation: slide-up 0.3s ease-out;
}
@keyframes slide-up {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
h2 {
  margin-top: 0;
  margin-bottom: 25px;
  font-size: 24px;
  font-weight: 600;
  color: #333;
  text-align: center;
}
.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #555;
  font-size: 14px;
}
.form-group select, .form-group input, .form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.form-group select:focus, .form-group input:focus, .form-group textarea:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}
textarea {
  resize: vertical;
  min-height: 100px;
}
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 30px;
}
.dialog-actions button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease;
}
.dialog-actions button:nth-child(2) {
  background-color: #007bff;
  color: white;
}
.dialog-actions button:nth-child(2):hover {
  background-color: #0056b3;
}
.dialog-actions button:last-child {
  background-color: #f0f0f0;
  color: #555;
}
.dialog-actions button:last-child:hover {
  background-color: #e0e0e0;
}
.delete-btn {
  background-color: #dc3545;
  color: white;
  margin-right: auto;
}
.delete-btn:hover {
  background-color: #c82333;
}
</style>
