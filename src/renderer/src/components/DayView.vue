<template>
  <div class="day-view" @mousedown="handleMouseDown" @mousemove="handleMouseMove" @mouseup="handleMouseUp">
    <div class="time-axis">
      <div class="hour-label" v-for="hour in 24" :key="hour">{{ formatHour(hour - 1) }}</div>
    </div>
    <div class="events-container">
      <div
        class="event"
        v-for="event in dayEvents"
        :key="event.id"
        :style="getEventStyle(event)"
        @click.stop="handleEventClick(event)"
        @mousedown.stop
      >
        {{ event.summary }}
      </div>
      <div v-if="selection.active" class="selection-box" :style="selectionStyle"></div>
    </div>
    <CreateEventDialog
      v-if="showCreateDialog"
      :start-time="selection.startTime"
      :end-time="selection.endTime"
      @confirm="handleDialogConfirm"
      @cancel="handleDialogCancel"
    />
    <EditEventDialog
      v-if="showEditDialog"
      :event="selectedEvent"
      @confirm="handleEditConfirm"
      @cancel="handleEditCancel"
      @delete="handleDeleteConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineEmits } from 'vue';
import moment from 'moment';
import CreateEventDialog from './CreateEventDialog.vue';
import EditEventDialog from './EditEventDialog.vue';

const props = defineProps({
  events: Array,
  currentDate: Object,
});

const emit = defineEmits(['event-modified']);

const selection = ref({
  active: false,
  startY: 0,
  endY: 0,
  startTime: null,
  endTime: null,
});
const showCreateDialog = ref(false);
const showEditDialog = ref(false);
const selectedEvent = ref(null);

const dayEvents = computed(() => {
  return props.events.filter(event => moment(event.start.dateTime).isSame(props.currentDate, 'day'));
});

const formatHour = (hour) => {
  return moment({ hour }).format('h A');
};

const getEventStyle = (event) => {
  const start = moment(event.start.dateTime);
  const end = moment(event.end.dateTime);
  const top = start.hours() * 60 + start.minutes();
  const duration = end.diff(start, 'minutes');
  return {
    top: `${top}px`,
    height: `${duration}px`,
  };
};

const selectionStyle = computed(() => {
  const top = Math.min(selection.value.startY, selection.value.endY);
  const height = Math.abs(selection.value.endY - selection.value.startY);
  return {
    top: `${top}px`,
    height: `${height}px`,
  };
});

const handleMouseDown = (e) => {
  selection.value.active = true;
  selection.value.startY = e.offsetY;
  selection.value.endY = e.offsetY;
};

const handleMouseMove = (e) => {
  if (selection.value.active) {
    selection.value.endY = e.offsetY;
  }
};

const handleMouseUp = () => {
  if (!selection.value.active) return;
  selection.value.active = false;

  const startY = selection.value.startY;
  const endY = selection.value.endY;
  const dragDistance = Math.abs(endY - startY);

  let startTime, endTime;

  if (dragDistance < 5) { // It's a click
    const startMinutes = startY;
    startTime = props.currentDate.clone().startOf('day').add(startMinutes, 'minutes');
    endTime = startTime.clone().add(30, 'minutes');
  } else { // It's a drag
    const startMinutes = Math.min(startY, endY);
    const endMinutes = Math.max(startY, endY);
    startTime = props.currentDate.clone().startOf('day').add(startMinutes, 'minutes');
    endTime = props.currentDate.clone().startOf('day').add(endMinutes, 'minutes');
  }

  selection.value.startTime = startTime;
  selection.value.endTime = endTime;

  showCreateDialog.value = true;
};

const handleDialogConfirm = async (eventData) => {
  await window.api.createCalendarEvent(eventData);
  showCreateDialog.value = false;
  emit('event-modified');
};

const handleDialogCancel = () => {
  showCreateDialog.value = false;
};

const handleEventClick = (event) => {
  selectedEvent.value = event;
  showEditDialog.value = true;
};

const handleEditConfirm = async (updatedEvent) => {
  await window.api.updateCalendarEvent(updatedEvent.id, updatedEvent);
  showEditDialog.value = false;
  emit('event-modified'); // Re-fetch events to show the update
};

const handleEditCancel = () => {
  showEditDialog.value = false;
};

const handleDeleteConfirm = async (eventId) => {
  await window.api.deleteCalendarEvent(eventId);
  showEditDialog.value = false;
  emit('event-modified'); // Re-fetch to show the deletion
};
</script>

<style scoped>
.day-view {
  display: flex;
  border: 1px solid #ccc;
  height: 1440px; /* 24 hours * 60 minutes */
  position: relative;
  cursor: crosshair;
}
.time-axis {
  width: 60px;
  border-right: 1px solid #ccc;
  pointer-events: none;
}
.hour-label {
  height: 60px; /* 60 minutes */
  text-align: right;
  padding-right: 5px;
  font-size: 12px;
  color: #777;
  border-top: 1px solid #eee;
}
.events-container {
  flex-grow: 1;
  position: relative;
}
.event {
  position: absolute;
  left: 10px;
  right: 10px;
  background-color: #e0e0ff;
  border-left: 3px solid #007bff;
  padding: 5px;
  border-radius: 3px;
  font-size: 12px;
  overflow: hidden;
  cursor: pointer;
}
.selection-box {
  position: absolute;
  left: 0;
  right: 0;
  background-color: rgba(0, 123, 255, 0.3);
  border: 1px solid #007bff;
  pointer-events: none;
}
</style>
