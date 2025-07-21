<template>
  <div class="dialog-overlay" @mousedown.stop @click.stop @keydown.esc="handleCancel" @keydown.enter.prevent="requestConfirm">
    <div class="dialog-content">
      <h2>Create New Event</h2>
      <div class="form-group">
        <label>Calendar</label>
        <select v-model="selectedCalendar">
          <option v-for="calendar in calendars" :key="calendar.id" :value="calendar.id">
            {{ calendar.summary }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label>Project (Optional)</label>
        <select v-model="selectedProject" @change="handleProjectChange">
          <option value="">None</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">
            {{ project.title }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label>Task (Optional)</label>
        <select v-model="selectedTask">
          <option value="">None</option>
          <option v-for="task in availableTasks" :key="task.id" :value="task.id">
            {{ task.title }}
          </option>
        </select>
      </div>
      <hr />
      <div class="form-group">
        <label>Summary</label>
        <input type="text" v-model="eventDetails.summary" placeholder="Event Title" />
      </div>
      <div class="form-group">
        <label>Description</label>
        <TaskEditor v-model="eventDetails.description" />
      </div>
      <div class="form-group">
        <label>Start Time</label>
        <input type="datetime-local" v-model="localStartTime" />
      </div>
      <div class="form-group">
        <label>End Time</label>
        <input type="datetime-local" v-model="localEndTime" />
      </div>
      <div class="dialog-actions">
        <button @click="requestConfirm" :disabled="!eventDetails.summary">Create Event</button>
        <button @click="handleCancel">Cancel</button>
      </div>
    </div>
    <GenericConfirmationDialog
      v-if="showConfirmation"
      title="Confirm Creation"
      message="Are you sure you want to create this event?"
      @confirm="handleConfirm"
      @cancel="showConfirmation = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, defineEmits, defineProps } from 'vue';
import moment from 'moment';
import GenericConfirmationDialog from './GenericConfirmationDialog.vue';
import TaskEditor from './TaskEditor.vue';

const props = defineProps({
  startTime: Object,
  endTime: Object,
  calendars: Array,
});

const emit = defineEmits(['confirm', 'cancel']);

const projects = ref([]);
const selectedProject = ref('');
const selectedTask = ref('');
const selectedCalendar = ref('');
const eventDetails = ref({
  summary: '',
  description: '',
});
const showConfirmation = ref(false);

const localStartTime = ref(moment(props.startTime).format('YYYY-MM-DDTHH:mm'));
const localEndTime = ref(moment(props.endTime).format('YYYY-MM-DDTHH:mm'));
const duration = ref(moment(props.endTime).diff(moment(props.startTime)));

onMounted(async () => {
  projects.value = await window.api.getProjects();
  if (props.calendars.length > 0) {
    // Default to the primary calendar if it exists, otherwise the first one.
    const primary = props.calendars.find(c => c.primary);
    selectedCalendar.value = primary ? primary.id : props.calendars[0].id;
  }
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
      eventDetails.value.summary = task.title;
      eventDetails.value.description = task.body;
    }
  } else {
    eventDetails.value.summary = '';
    eventDetails.value.description = '';
  }
});

watch(localStartTime, (newStart) => {
  const start = moment(newStart);
  const end = moment(localEndTime.value);
  if (start.isAfter(end)) {
    localEndTime.value = start.clone().add(duration.value).format('YYYY-MM-DDTHH:mm');
  } else {
    duration.value = end.diff(start);
  }
});

watch(localEndTime, (newEnd) => {
  const start = moment(localStartTime.value);
  const end = moment(newEnd);
  if (end.isBefore(start)) {
    localEndTime.value = start.clone().add(30, 'minutes').format('YYYY-MM-DDTHH:mm');
  }
  duration.value = moment(localEndTime.value).diff(moment(localStartTime.value));
});


const handleProjectChange = () => {
  selectedTask.value = '';
};

const requestConfirm = () => {
  if (eventDetails.value.summary) {
    showConfirmation.value = true;
  }
};

const handleConfirm = () => {
  const eventData = {
    summary: eventDetails.value.summary,
    description: eventDetails.value.description,
    start: { dateTime: moment(localStartTime.value).toISOString() },
    end: { dateTime: moment(localEndTime.value).toISOString() },
  };
  emit('confirm', eventData, selectedCalendar.value);
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
.form-group select, .form-group input, .form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #dcdcdc;
  border-radius: 6px;
  font-size: 14px;
  background-color: #fdfdfd;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.form-group select:focus, .form-group input:focus, .form-group textarea:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.1);
}
textarea {
  resize: vertical;
  min-height: 90px;
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
hr {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 20px 0;
}
</style>
