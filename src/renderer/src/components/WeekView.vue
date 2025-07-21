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
      :calendars="calendars"
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

const calendars = ref([]);
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

onMounted(async () => {
  calendars.value = await window.api.getCalendarList();
  window.addEventListener('keydown', handleEscKey);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscKey);
});

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

  // Helper function to lighten a hex color
  const lightenColor = (color, percent) => {
    const num = parseInt(color.replace("#",""), 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) + amt,
      G = (num >> 8 & 0x00FF) + amt,
      B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
  };

  const backgroundColor = event.color || '#89cff0'; // Default color
  const borderColor = lightenColor(backgroundColor, -20); // Darken by 20%

  return {
    top: `${top}px`,
    height: `${duration}px`,
    backgroundColor: backgroundColor,
    borderLeftColor: borderColor,
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

const handleCreateConfirm = async (eventData, calendarId) => {
  try {
    await window.api.createCalendarEvent(eventData, calendarId);
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
    await window.api.updateCalendarEvent(updatedEvent.id, updatedEvent, updatedEvent.calendarId);
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
    await window.api.deleteCalendarEvent(eventId, selectedEvent.value.calendarId);
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
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  overflow: hidden;
}
.header-row {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  background-color: #fafafa;
}
.body-row {
  display: flex;
  flex-grow: 1;
  overflow-y: auto;
  max-height: 1440px;
}
.time-gutter {
  width: 70px;
  flex-shrink: 0;
}
.day-header {
  flex-grow: 1;
  text-align: center;
  border-left: 1px solid #e0e0e0;
  padding: 10px 0;
  font-weight: 600;
  color: #555;
}
.day-header h3 {
  margin: 0 0 4px;
  font-size: 14px;
}
.day-header p {
  margin: 0;
  font-size: 12px;
  color: #888;
}
.time-axis {
  width: 70px;
  border-right: 1px solid #e0e0e0;
  flex-shrink: 0;
  pointer-events: none;
  padding-top: 10px;
}
.hour-label {
  height: 60px;
  text-align: right;
  padding-right: 10px;
  font-size: 12px;
  color: #999;
}
.week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  flex-grow: 1;
  position: relative;
  background-image: linear-gradient(to bottom, #f0f0f0 1px, transparent 1px);
  background-size: 100% 60px;
}
.day-column {
  position: relative;
  border-left: 1px solid #e0e0e0;
  height: 1440px; /* 24 * 60 */
  cursor: crosshair;
}
.event {
  position: absolute;
  left: 8px;
  right: 8px;
  background-color: #89cff0;
  border-left: 4px solid #00529b;
  padding: 6px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #00213f;
  overflow: hidden;
  cursor: pointer;
  z-index: 10;
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
  z-index: 20;
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
