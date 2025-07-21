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
        >
          <div
            class="event"
            v-for="event in day.events"
            :key="event.id"
            :style="getEventStyle(event)"
            @click.stop="handleEventClick(event)"
            @mousedown.stop
          >
            {{ event.summary }}
          </div>
          <div v-if="selection.active && selection.dayIndex === dayIndex" class="selection-box" :style="selectionStyle"></div>
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
  dayIndex: -1,
  startY: 0,
  endY: 0,
  startTime: null,
  endTime: null,
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
  const selectedDay = weekDays.value[selection.value.dayIndex].date;

  let startTime, endTime;

  if (dragDistance < 5) { // Click
    const startMinutes = startY;
    startTime = selectedDay.clone().startOf('day').add(startMinutes, 'minutes');
    endTime = startTime.clone().add(30, 'minutes');
  } else { // Drag
    const startMinutes = Math.min(startY, endY);
    const endMinutes = Math.max(startY, endY);
    startTime = selectedDay.clone().startOf('day').add(startMinutes, 'minutes');
    endTime = selectedDay.clone().startOf('day').add(endMinutes, 'minutes');
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
  await window.api.createCalendarEvent(eventData);
  showCreateDialog.value = false;
  emit('event-modified');
};

const handleCreateCancel = () => {
  showCreateDialog.value = false;
};

const handleEventClick = (event) => {
  selectedEvent.value = event;
  showEditDialog.value = true;
};

const handleEditConfirm = async (updatedEvent) => {
  await window.api.updateCalendarEvent(updatedEvent.id, updatedEvent);
  showEditDialog.value = false;
  emit('event-modified');
};

const handleEditCancel = () => {
  showEditDialog.value = false;
};

const handleDeleteConfirm = async (eventId) => {
  await window.api.deleteCalendarEvent(eventId);
  showEditDialog.value = false;
  emit('event-modified');
};
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
</style>
