<template>
  <div class="month-view">
    <div class="calendar-grid">
      <div class="day-header" v-for="day in daysOfWeek" :key="day">{{ day }}</div>
      <div
        class="day-cell"
        v-for="day in calendarDays"
        :key="day.date.toString()"
        :class="{ 'is-today': day.isToday, 'is-current-month': day.isCurrentMonth }"
        @mousedown="handleMouseDown($event, day.date)"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseLeave"
        @dragover.prevent
        @drop="handleDrop(day.date)"
      >
        <div class="day-number">{{ day.date.date() }}</div>
        <div class="events">
          <div
            class="event"
            v-for="event in day.events"
            :key="event.id"
            draggable="true"
            @dragstart="handleDragStart($event, event)"
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
import { ref, computed, defineEmits } from 'vue';
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
  date: null,
  startY: 0,
  endY: 0,
  startTime: null,
  endTime: null,
});
const dragData = ref(null);

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
  const cellHeight = e.currentTarget.clientHeight;

  let startTime, endTime;

  if (dragDistance < 10) { // Click
    const startFraction = startY / cellHeight;
    const startMinutes = Math.floor(startFraction * 24 * 60);
    startTime = selection.value.date.clone().startOf('day').add(startMinutes, 'minutes');
    endTime = startTime.clone().add(30, 'minutes');
  } else { // Drag
    const startFraction = startY / cellHeight;
    const endFraction = endY / cellHeight;
    const startMinutes = Math.floor(startFraction * 24 * 60);
    const endMinutes = Math.floor(endFraction * 24 * 60);

    startTime = selection.value.date.clone().startOf('day').add(Math.min(startMinutes, endMinutes), 'minutes');
    endTime = selection.value.date.clone().startOf('day').add(Math.max(startMinutes, endMinutes), 'minutes');
  }

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
    await window.api.updateCalendarEvent(updatedEvent.id, updatedEvent);
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
    await window.api.deleteCalendarEvent(eventId);
    showEditDialog.value = false;
    emit('event-modified');
  } catch (error) {
    console.error('Failed to delete event in MonthView:', error);
  }
};

const handleDragStart = (e, event) => {
  e.dataTransfer.effectAllowed = 'move';
  dragData.value = {
    eventId: event.id,
    startTimeOfDay: moment(event.start.dateTime).diff(moment(event.start.dateTime).startOf('day')),
    duration: moment(event.end.dateTime).diff(moment(event.start.dateTime)),
  };
};

const handleDrop = async (dropDate) => {
  if (!dragData.value) return;

  const newStart = dropDate.clone().startOf('day').add(dragData.value.startTimeOfDay);
  const newEnd = newStart.clone().add(dragData.value.duration);

  const originalEvent = props.events.find(ev => ev.id === dragData.value.eventId);
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

  dragData.value = null;
};
</script>

<style scoped>
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
}
.day-header {
  text-align: center;
  font-weight: bold;
}
.day-cell {
  border: 1px solid #ccc;
  height: 120px;
  padding: 5px;
  overflow-y: auto;
  position: relative;
  cursor: crosshair;
}
.is-today {
  background-color: #f0f0f0;
}
.is-current-month {
  font-weight: bold;
}
.day-number {
  text-align: right;
}
.events {
  margin-top: 5px;
}
.event {
  background-color: #e0e0ff;
  border-radius: 3px;
  padding: 2px 4px;
  margin-bottom: 2px;
  font-size: 12px;
  cursor: pointer;
}
</style>