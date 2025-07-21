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
  
  console.log('DayView: handleDragStart id=', event.id, 'initialY=', e.clientY);
  dragData.value = {
    duration: moment(event.end.dateTime).diff(moment(event.start.dateTime)),
    initialMouseY: e.clientY,
    eventElement: e.target,
  };

  setTimeout(() => {
    if (dragData.value) {
      e.target.style.opacity = '0.5';
    }
  }, 0);
};

const handleDragOver = (e) => {
  if (!dragData.value) {
    console.log('DayView: handleDragOver skipped, no dragData');
    return;
  }
  
  const snappedMinutes = Math.round(e.offsetY / 15) * 15;
  console.log('DayView: handleDragOver snappedMinutes=', snappedMinutes);
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
  console.log('DayView: handleDrop start, dragData=', dragData.value);
  if (!dragData.value) {
    console.log('DayView: handleDrop skipped, no dragData');
    return;
  }

  const dragDistance = Math.abs(e.clientY - dragData.value.initialMouseY);
  console.log('DayView: handleDrop dragDistance=', dragDistance,
              'initialY=', dragData.value.initialMouseY,
              'clientY=', e.clientY);
  if (dragDistance < 10) {
    console.log('DayView: handleDrop below dragDistance threshold, cancelling');
    handleDragEnd(e);
    return;
  }

  const payload = e.dataTransfer.getData('application/json');
  console.log('DayView: handleDrop payloadString=', payload);
  if (!payload) {
    console.log('DayView: handleDrop no payload, abort');
    return;
  }
  const data = JSON.parse(payload);
  console.log('DayView: handleDrop parsed data=', data);

  const snappedMinutes = Math.round(e.offsetY / 15) * 15;
  console.log('DayView: handleDrop snappedMinutes=', snappedMinutes);
  // immediately reposition the dragged element for visual feedback
  if (dragData.value.eventElement?.style) {
    console.log('DayView: handleDrop moving element top to', snappedMinutes);
    dragData.value.eventElement.style.top = `${snappedMinutes}px`;
  }
  const newStart = props.currentDate.clone().startOf('day').add(snappedMinutes, 'minutes');
  const newEnd = newStart.clone().add(dragData.value.duration);
  console.log('DayView: handleDrop newStart=', newStart.format(), 'newEnd=', newEnd.format());

  const originalEvent = props.events.find(ev => ev.id === data.eventId);
  const updatedEvent = {
    ...originalEvent,
    start: { dateTime: newStart.toISOString() },
    end:   { dateTime: newEnd.toISOString() },
  };
  console.log('DayView: handleDrop updatedEvent=', updatedEvent);
  
  try {
    console.log('DayView: handleDrop preparing payload for updateCalendarEvent');
    // strip Vue proxies and any extra fields: only include plain data
    const payloadEvent = {
      summary: updatedEvent.summary,
      description: updatedEvent.description,
      start: updatedEvent.start,
      end: updatedEvent.end,
    };
    console.log('DayView: handleDrop payloadEvent=', payloadEvent);
    await window.api.updateCalendarEvent(updatedEvent.id, payloadEvent);
    console.log('DayView: handleDrop updateCalendarEvent success');
    emit('event-modified');
  } catch (error) {
    console.error('DayView: handleDrop updateCalendarEvent failed:', error);
  } finally {
    console.log('DayView: handleDrop final cleanup');
    handleDragEnd(e);
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
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  height: 1440px; /* 24 hours * 60 minutes */
  position: relative;
  cursor: crosshair;
  overflow: hidden;
}
.time-axis {
  width: 70px;
  border-right: 1px solid #e0e0e0;
  pointer-events: none;
  padding-top: 10px; /* Align with grid */
}
.hour-label {
  height: 60px; /* 60 minutes */
  text-align: right;
  padding-right: 10px;
  font-size: 12px;
  color: #999;
  position: relative;
}
.hour-label:not(:first-child)::before {
  content: '';
  position: absolute;
  top: 0;
  left: 10px;
  right: 0;
  border-top: 1px solid #f0f0f0;
}
.events-container {
  flex-grow: 1;
  position: relative;
  background-image: linear-gradient(to bottom, #f0f0f0 1px, transparent 1px);
  background-size: 100% 60px; /* Match hour label height */
}
.event {
  position: absolute;
  left: 10px;
  right: 10px;
  background-color: #89cff0; /* A more pleasant blue */
  border-left: 4px solid #00529b; /* A darker blue for emphasis */
  padding: 8px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #00213f;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.event:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}
.selection-box {
  position: absolute;
  left: 0;
  right: 0;
  background-color: rgba(0, 123, 255, 0.2);
  border: 1px solid rgba(0, 123, 255, 0.5);
  pointer-events: none;
  border-radius: 4px;
}
.drop-target {
  position: absolute;
  left: 2px;
  right: 2px;
  background-color: rgba(0, 123, 255, 0.2);
  border: 1px dashed #007bff;
  z-index: 5;
  pointer-events: none;
  border-radius: 4px;
}
</style>
