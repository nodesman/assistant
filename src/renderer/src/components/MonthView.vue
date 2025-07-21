<template>
  <div class="month-view">
    <div class="calendar-grid">
      <div class="day-header" v-for="day in daysOfWeek" :key="day">{{ day }}</div>
      <div
        class="day-cell"
        v-for="day in calendarDays"
        :key="day.date.toString()"
        :class="{
          'is-today': day.isToday,
          'is-current-month': day.isCurrentMonth,
          'drop-target-active': dropTarget.visible && dropTarget.date && dropTarget.date.isSame(day.date, 'day')
        }"
        @mousedown="handleMouseDown($event, day.date)"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseLeave"
        @dragover.prevent="handleDragOver($event, day.date)"
        @dragleave="handleDragLeave(day.date)"
        @drop.prevent="handleDrop(day.date)"
      >
        <div class="day-number">{{ day.date.date() }}</div>
        <div class="events">
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
  date: null,
  startY: 0,
  endY: 0,
  startTime: null,
  endTime: null,
});
const dragData = ref(null);
const dropTarget = ref({ visible: false, date: null });

onMounted(async () => {
  calendars.value = await window.api.getCalendarList();
  window.addEventListener('keydown', handleEscKey);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscKey);
});

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const calendarDays = computed(() => {
  const startOfMonth = props.currentDate.clone().startOf('month');
  const endOfMonth = props.currentDate.clone().endOf('month');
  const startDate = startOfMonth.clone().startOf('week');
  const endDate = endOfMonth.clone().endOf('week');

  const days = [];
  let day = startDate.clone();

  while (day.isSameOrBefore(endDate)) {
    days.push({
      date: day.clone(),
      isToday: day.isSame(moment(), 'day'),
      isCurrentMonth: day.isSame(props.currentDate, 'month'),
      events: props.events.filter(event => moment(event.start.dateTime).isSame(day, 'day')),
    });
    day.add(1, 'day');
  }
  return days;
});

const getEventStyle = (event) => {
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
    backgroundColor: backgroundColor,
    borderLeftColor: borderColor,
  };
};

const handleMouseDown = (e, date) => {
  selection.value.active = true;
  selection.value.date = date;
  selection.value.startY = e.offsetY;
  selection.value.endY = e.offsetY;
};

const handleMouseMove = (e) => {
  if (selection.value.active) {
    selection.value.endY = e.offsetY;
  }
};

const handleMouseUp = (e) => {
  if (!selection.value.active) return;
  selection.value.active = false;

  const startY = selection.value.startY;
  const endY = selection.value.endY;
  const dragDistance = Math.abs(endY - startY);
  if (dragDistance > 10) return; // It's a drag, not a click for creation

  const cellHeight = e.currentTarget.clientHeight;
  const clickFraction = startY / cellHeight;
  const clickMinutes = Math.floor(clickFraction * 24 * 60);
  const startTime = selection.value.date.clone().startOf('day').add(clickMinutes, 'minutes');
  const endTime = startTime.clone().add(30, 'minutes');

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
    console.error('Failed to create event in MonthView:', error);
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
    console.error('Failed to update event in MonthView:', error);
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
    console.error('Failed to delete event in MonthView:', error);
  }
};

const handleDragStart = (e, event) => {
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('application/json', JSON.stringify({ eventId: event.id }));

  dragData.value = {
    duration: moment(event.end.dateTime).diff(moment(event.start.dateTime)),
    startTimeOfDay: moment(event.start.dateTime).diff(moment(event.start.dateTime).startOf('day')),
    initialMouseY: e.clientY,
    eventElement: e.target,
  };

  setTimeout(() => {
    if (dragData.value) {
      e.target.style.opacity = '0.5';
    }
  }, 0);
};

const handleDragOver = (e, date) => {
  if (!dragData.value) return;
  dropTarget.value.visible = true;
  dropTarget.value.date = date;
};

const handleDragLeave = (date) => {
  if (dropTarget.value.date && dropTarget.value.date.isSame(date, 'day')) {
    dropTarget.value.visible = false;
    dropTarget.value.date = null;
  }
};

const handleDragEnd = (e) => {
  if (e.target && e.target.style) {
    e.target.style.opacity = '1';
  }
  dragData.value = null;
  dropTarget.value.visible = false;
  dropTarget.value.date = null;
};

const handleDrop = async (dropDate) => {
  if (!dragData.value) return;

  const payload = JSON.parse(event.dataTransfer.getData('application/json'));
  if (!payload) return;

  const newStart = dropDate.clone().startOf('day').add(dragData.value.startTimeOfDay);
  const newEnd = newStart.clone().add(dragData.value.duration);

  const originalEvent = props.events.find(ev => ev.id === payload.eventId);
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
    handleDragEnd(event);
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
.month-view {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  overflow: hidden;
  padding: 15px;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background-color: #e0e0e0;
  border: 1px solid #e0e0e0;
}
.day-header {
  text-align: center;
  font-weight: 600;
  padding: 10px 5px;
  background-color: #fafafa;
  color: #555;
}
.day-cell {
  background-color: #fff;
  min-height: 120px;
  padding: 8px;
  overflow-y: auto;
  position: relative;
  cursor: pointer;
  transition: background-color 0.2s;
}
.day-cell:hover {
  background-color: #f9f9f9;
}
.is-today .day-number {
  background-color: #007bff;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  font-weight: bold;
}
.is-current-month .day-number {
  color: #333;
  font-weight: 500;
}
.day-number {
  text-align: right;
  font-size: 14px;
  color: #aaa;
  margin-bottom: 8px;
  float: right;
}
.drop-target-active {
  background-color: rgba(0, 123, 255, 0.2);
  border: 1px dashed #007bff;
}
.events {
  clear: both;
  margin-top: 5px;
}
.event {
  background-color: #89cff0;
  border-left: 4px solid #00529b;
  border-radius: 4px;
  padding: 4px 8px;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #00213f;
  cursor: pointer;
  transition: all 0.2s ease;
}
.event:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
</style>
