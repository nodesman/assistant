<template>
  <div class="week-view-container">
    <div class="header-row">
      <div class="time-gutter"></div>
      <div class="day-header" v-for="day in weekDays" :key="day.date.toString()">
        <h3>{{ day.date.format('ddd') }}</h3>
        <p>{{ day.date.format('D') }}</p>
      </div>
    </div>
    <div class="body-row" @mouseleave="handleMouseLeave">
      <div class="time-axis">
        <div class="hour-label" v-for="hour in 24" :key="hour">{{ formatHour(hour - 1) }}</div>
      </div>
      <div class="week-grid">
        <div
          class="day-column"
          v-for="(day, dayIndex) in weekDays"
          :key="day.date.toString()"
          @mousedown="handleMouseDown($event, day.date)"
          @mousemove="handleMouseMove($event, dayIndex)"
          @mouseup="handleMouseUp"
          @dragover.prevent="handleDragOver($event, dayIndex)"
          @dragleave="handleDragLeave(dayIndex)"
          @drop.prevent="handleDrop($event, day.date)"
        >
          <div
            class="event"
            v-for="event in day.events"
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
          <div v-if="selection.active && selection.dayIndex === dayIndex" class="selection-box" :style="selectionStyle"></div>
          <div v-if="dropTarget.visible && dropTarget.dayIndex === dayIndex" class="drop-target" :style="dropTargetStyle"></div>
        </div>
      </div>
    </div>
    <CreateEventDialog
      v-if="showCreateDialog"
      :start-time="selection.startTime"
      :end-time="selection.endTime"
      @confirm="handleCreateConfirm"
      @cancel="handleCreateCancel"
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

const showCreateDialog = ref(false);
const showEditDialog = ref(false);
const selectedEvent = ref(null);
const selection = ref({
  active: false,
  dayIndex: -1,
  startY: 0,
  endY: 0,
  startTime: null,
  endTime: null,
});
const dragData = ref(null);
const dropTarget = ref({ visible: false, y: 0, height: 0, dayIndex: -1 });

const weekDays = computed(() => {
  const startOfWeek = props.currentDate.clone().startOf('week');
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = startOfWeek.clone().add(i, 'days');
    days.push({
      date,
      events: props.events.filter(event => moment(event.start.dateTime).isSame(date, 'day')),
    });
  }
  return days;
});

const formatHour = (hour) => {
  return moment({ hour }).format('h A');
};

const getEventStyle = (event) => {
  const start = moment(event.start.dateTime);
  const end = moment(event.end.dateTime);
  const top = start.hours() * 60 + start.minutes();
  const duration = Math.max(30, end.diff(start, 'minutes'));
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

const handleMouseDown = (e, date) => {
  selection.value.active = true;
  selection.value.startY = e.offsetY;
  selection.value.endY = e.offsetY;
  selection.value.dayIndex = weekDays.value.findIndex(d => d.date.isSame(date, 'day'));
};

const handleMouseMove = (e, dayIndex) => {
  if (selection.value.active && selection.value.dayIndex === dayIndex) {
    selection.value.endY = e.offsetY;
  }
};

const handleMouseUp = () => {
  if (!selection.value.active) return;
  selection.value.active = false;

  const startY = selection.value.startY;
  const endY = selection.value.endY;
  const dragDistance = Math.abs(endY - startY);
  if (dragDistance < 5) return;

  const selectedDay = weekDays.value[selection.value.dayIndex].date;

  const startMinutes = Math.min(startY, endY);
  const endMinutes = Math.max(startY, endY);
  const startTime = selectedDay.clone().startOf('day').add(startMinutes, 'minutes');
  const endTime = selectedDay.clone().startOf('day').add(endMinutes, 'minutes');

  selection.value.startTime = startTime;
  selection.value.endTime = endTime;

  showCreateDialog.value = true;
};

const handleMouseLeave = () => {
  if (selection.value.active) {
    selection.value.active = false;
  }
};

const handleCreateConfirm = async (eventData) => {
  try {
    await window.api.createCalendarEvent(eventData);
    showCreateDialog.value = false;
    emit('event-modified');
  } catch (error) {
    console.error('Failed to create event in WeekView:', error);
  }
};

const handleCreateCancel = () => {
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
    console.error('Failed to update event in WeekView:', error);
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
    console.error('Failed to delete event in WeekView:', error);
  }
};

const handleDragStart = (e, event) => {
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('application/json', JSON.stringify({ eventId: event.id }));

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

const handleDragOver = (e, dayIndex) => {
  if (!dragData.value) return;

  const snappedMinutes = Math.round(e.offsetY / 15) * 15;
  dropTarget.value.visible = true;
  dropTarget.value.y = snappedMinutes;
  dropTarget.value.height = moment.duration(dragData.value.duration).asMinutes();
  dropTarget.value.dayIndex = dayIndex;
};

const handleDragLeave = (dayIndex) => {
  if (dropTarget.value.dayIndex === dayIndex) {
    dropTarget.value.visible = false;
  }
};

const handleDragEnd = (e) => {
  if (e.target && e.target.style) {
    e.target.style.opacity = '1';
  }
  dragData.value = null;
  dropTarget.value.visible = false;
};

const handleDrop = async (e, dropDate) => {
  if (!dragData.value) return;

  const dragDistance = Math.abs(e.clientY - dragData.value.initialMouseY);
  if (dragDistance < 10 && moment(props.events.find(ev => ev.id === JSON.parse(e.dataTransfer.getData('application/json')).eventId)?.start.dateTime).isSame(dropDate, 'day')) {
    handleDragEnd(e);
    return;
  }

  const payload = e.dataTransfer.getData('application/json');
  if (!payload) return;
  const data = JSON.parse(payload);

  const snappedMinutes = Math.round(e.offsetY / 15) * 15;
  const newStart = dropDate.clone().startOf('day').add(snappedMinutes, 'minutes');
  const newEnd = newStart.clone().add(dragData.value.duration);

  const originalEvent = props.events.find(ev => ev.id === data.eventId);
  const updatedEvent = {
    ...originalEvent,
    start: { dateTime: newStart.toISOString() },
    end: { dateTime: newEnd.toISOString() },
  };

  try {
    const payloadEvent = {
      summary: updatedEvent.summary,
      description: updatedEvent.description,
      start: updatedEvent.start,
      end: updatedEvent.end,
    };
    await window.api.updateCalendarEvent(updatedEvent.id, payloadEvent);
    emit('event-modified');
  } catch (error) {
    console.error('Failed to update event via drag-and-drop:', error);
  } finally {
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
.week-view-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.header-row {
  display: flex;
  border-bottom: 1px solid #ccc;
}
.body-row {
  display: flex;
  flex-grow: 1;
  overflow-y: auto;
  max-height: 1440px; /* Fallback for container height */
}
.time-gutter {
  width: 60px;
  flex-shrink: 0;
}
.day-header {
  flex-grow: 1;
  text-align: center;
  border-left: 1px solid #ccc;
  padding: 5px 0;
}
.time-axis {
  width: 60px;
  border-right: 1px solid #ccc;
  flex-shrink: 0;
  pointer-events: none;
}
.hour-label {
  height: 60px;
  text-align: right;
  padding-right: 5px;
  font-size: 12px;
  color: #777;
  border-top: 1px solid #eee;
}
.week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  flex-grow: 1;
  position: relative;
}
.day-column {
  position: relative;
  border-left: 1px solid #ccc;
  height: 1440px; /* 24 * 60 */
  cursor: crosshair;
}
.event {
  position: absolute;
  left: 5px;
  right: 5px;
  background-color: #e0e0ff;
  border-left: 3px solid #007bff;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 12px;
  overflow: hidden;
  cursor: pointer;
  z-index: 10;
  transition: opacity 0.2s;
}
.selection-box {
  position: absolute;
  left: 0;
  right: 0;
  background-color: rgba(0, 123, 255, 0.3);
  border: 1px solid #007bff;
  pointer-events: none;
  z-index: 20;
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
