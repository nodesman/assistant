<template>
  <div class="calendar-layout">
    <div class="calendar-sidebar">
      <MiniCalendar :selected-date="currentDate" @date-selected="handleDateSelected" />
    </div>
    <div class="calendar-main">
      <div class="calendar-header">
        <button @click="prev">&lt;</button>
        <h2>{{ headerDate }}</h2>
        <button @click="next">&gt;</button>
        <ViewSwitcher :current-view="activeViewName" @view-changed="handleViewChanged" />
      </div>
      <component :is="activeView" :events="events" :current-date="currentDate" @event-created="fetchEvents" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import moment from 'moment';
import MiniCalendar from './MiniCalendar.vue';
import ViewSwitcher from './ViewSwitcher.vue';
import MonthView from './MonthView.vue';
import WeekView from './WeekView.vue';
import DayView from './DayView.vue';

const events = ref([]);
const currentDate = ref(moment());
const activeViewName = ref('Month');

const fetchEvents = async () => {
  events.value = await window.api.getCalendarEvents();
};

onMounted(fetchEvents);

const activeView = computed(() => {
  switch (activeViewName.value) {
    case 'Week':
      return WeekView;
    case 'Day':
      return DayView;
    default:
      return MonthView;
  }
});

const headerDate = computed(() => {
  switch (activeViewName.value) {
    case 'Month':
      return currentDate.value.format('MMMM YYYY');
    case 'Week':
      const startOfWeek = currentDate.value.clone().startOf('week').format('MMM D');
      const endOfWeek = currentDate.value.clone().endOf('week').format('MMM D, YYYY');
      return `${startOfWeek} - ${endOfWeek}`;
    case 'Day':
      return currentDate.value.format('dddd, MMMM D, YYYY');
    default:
      return '';
  }
});

const handleDateSelected = (date) => {
  currentDate.value = date;
};

const handleViewChanged = (view) => {
  activeViewName.value = view;
};

const prev = () => {
  const unit = activeViewName.value === 'Month' ? 'month' : activeViewName.value === 'Week' ? 'week' : 'day';
  currentDate.value = currentDate.value.clone().subtract(1, unit);
};

const next = () => {
  const unit = activeViewName.value === 'Month' ? 'month' : activeViewName.value === 'Week' ? 'week' : 'day';
  currentDate.value = currentDate.value.clone().add(1, unit);
};
</script>

<style scoped>
.calendar-layout {
  display: flex;
  gap: 20px;
}
.calendar-sidebar {
  width: 250px;
}
.calendar-main {
  flex-grow: 1;
}
.calendar-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  gap: 10px;
}
</style>
