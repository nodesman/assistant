<template>
  <div class="day-view" @mousedown="handleMouseDown" @mousemove="handleMouseMove" @mouseup="handleMouseUp">
    <div class="time-axis">
      <div class="hour-label" v-for="hour in 24" :key="hour">{{ formatHour(hour - 1) }}</div>
    </div>
    <div class="events-container" @dragover.prevent="handleDragOver" @dragleave="handleDragLeave" @drop.prevent="handleDrop">
      <div
        class="event"
        v-for="event in dayEvents"
        :key="event.id"
        :style="getEventStyle(event)"
        draggable="true"
        @dragstart="handleDragStart($event, event)"
        @dragend="handleDragEnd"
        @click.stop="handleEventClick(event)"
        @mousedown.stop
      >
        {{ event.summary }}
      </div>
      <div v-if="selection.active" class="selection-box" :style="selectionStyle"></div>
      <div v-if="dropTarget.visible" class="drop-target" :style="dropTargetStyle"></div>
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
import { ref, computed, defineEmits, onMounted, onUnmounted } from 'vue';
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
const dropTarget = ref({ visible: false, y: 0, height: 0 });
const dragData = ref(null); // For visual feedback data

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

const dropTargetStyle = computed(() => ({
  top: `${dropTarget.value.y}px`,
  height: `${dropTarget.value.height}px`,
}));

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

  if (dragDistance < 5) return; // Dead zone for clicks

  let startTime, endTime;
  const startMinutes = Math.min(startY, endY);
  const endMinutes = Math.max(startY, endY);
  startTime = props.currentDate.clone().startOf('day').add(startMinutes, 'minutes');
  endTime = props.currentDate.clone().startOf('day').add(endMinutes, 'minutes');

  selection.value.startTime = startTime;
  selection.value.endTime = endTime;
  showCreateDialog.value = true;
};

const handleDialogConfirm = async (eventData) => {
  try {
    await window.api.createCalendarEvent(eventData);
    showCreateDialog.value = false;
    emit('event-modified');
  } catch (error) {
    console.error('Failed to create event:', error);
  }
};

const handleDialogCancel = () => {
  showCreateDialog.value = false;
};

const handleEventClick = (event) => {
  selectedEvent.value = event;
  showEditDialog.value = true;
};

const handleEditConfirm = async (updatedEvent) => {
  try {
    await window.api.updateCalendarEvent(updatedEvent.id, updatedEvent);
    showEditDialog.value = false;
    emit('event-modified');
  } catch (error) {
    console.error('Failed to update event:', error);
  }
};

const handleEditCancel = () => {
  showEditDialog.value = false;
};

const handleDeleteConfirm = async (eventId) => {
  try {
    await window.api.deleteCalendarEvent(eventId);
    showEditDialog.value = false;
    emit('event-modified');
  } catch (error) {
    console.error('Failed to delete event:', error);
  }
};

const handleDragStart = (e, event) => {
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('application/json', JSON.stringify({ eventId: event.id }));
  
  dragData.value = {
    duration: moment(event.end.dateTime).diff(moment(event.start.dateTime)),
    initialMouseY: e.clientY,
  };

  setTimeout(() => {
    if (dragData.value) {
      e.target.style.opacity = '0.5';
    }
  }, 0);
};

const handleDragOver = (e) => {
  if (!dragData.value) return;
  
  const snappedMinutes = Math.round(e.offsetY / 15) * 15;
  dropTarget.value.visible = true;
  dropTarget.value.y = snappedMinutes;
  dropTarget.value.height = moment.duration(dragData.value.duration).asMinutes();
};

const handleDragLeave = () => {
  dropTarget.value.visible = false;
};

const handleDragEnd = (e) => {
  if (e.target && e.target.style) {
    e.target.style.opacity = '1';
  }
  dragData.value = null;
  dropTarget.value.visible = false;
};

const handleDrop = async (e) => {
  if (!dragData.value) return;

  const dragDistance = Math.abs(e.clientY - dragData.value.initialMouseY);
  if (dragDistance < 10) {
    handleDragEnd(e);
    return;
  }

  const payload = e.dataTransfer.getData('application/json');
  if (!payload) return;
  const data = JSON.parse(payload);

  const snappedMinutes = Math.round(e.offsetY / 15) * 15;
  const newStart = props.currentDate.clone().startOf('day').add(snappedMinutes, 'minutes');
  const newEnd = newStart.clone().add(dragData.value.duration);

  const originalEvent = props.events.find(ev => ev.id === data.eventId);
  const updatedEvent = {
    ...originalEvent,
    start: { dateTime: newStart.toISOString() },
    end: { dateTime: newEnd.toISOString() },
  };
  
  try {
    await window.api.updateCalendarEvent(updatedEvent.id, updatedEvent);
    emit('event-modified');
  } catch (error) {
    console.error('Failed to update event via drag-and-drop:', error);
  }
};

const handleEscKey = (e) => {
  if (e.key === 'Escape' && dragData.value) {
    const draggedElement = document.querySelector('.event[draggable="true"][style*="opacity: 0.5"]');
    if (draggedElement) {
      draggedElement.dispatchEvent(new DragEvent('dragend', { bubbles: true, cancelable: true }));
    }
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleEscKey);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscKey);
});

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
  transition: opacity 0.2s;
}
.selection-box {
  position: absolute;
  left: 0;
  right: 0;
  background-color: rgba(0, 123, 255, 0.3);
  border: 1px solid #007bff;
  pointer-events: none;
}
.drop-target {
  position: absolute;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.2);
  border: 1px dashed #000;
  z-index: 5;
  pointer-events: none;
}
</style>
