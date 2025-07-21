<template>
  <div class="dialog-overlay" @mousedown.stop @click.stop @keydown.esc="handleCancel" @keydown.enter.prevent="requestConfirm">
    <div class="dialog-content">
      <h2>Create New Event</h2>
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
        <textarea v-model="eventDetails.description" placeholder="Event Details"></textarea>
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

const props = defineProps({
  startTime: Object,
  endTime: Object,
});

const emit = defineEmits(['confirm', 'cancel']);

const projects = ref([]);
const selectedProject = ref('');
const selectedTask = ref('');
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
  emit('confirm', eventData);
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
.form-group select, .form-group input, .form-group textarea {
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
hr {
  border: none;
  border-top: 1px solid #eee;
  margin: 20px 0;
}
</style>
