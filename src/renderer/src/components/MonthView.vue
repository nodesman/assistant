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
  date: null,
  startY: 0,
  endY: 0,
  startTime: null,
  endTime: null,
});
const dragData = ref(null);
const dropTarget = ref({ visible: false, date: null });

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
  transition: background-color 0.2s;
}
.is-today {
  background-color: #f0f0f0;
}
.is-current-month {
  font-weight: bold;
}
.drop-target-active {
  background-color: rgba(0, 123, 255, 0.3);
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
  transition: opacity 0.2s;
}
</style>
