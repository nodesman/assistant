<template>
  <div class="calendar-layout">
    <div class="calendar-sidebar-container">
      <div class="calendar-sidebar" v-if="!isMiniCalendarCollapsed">
        <MiniCalendar :selected-date="currentDate" @date-selected="handleDateSelected" />
      </div>
    </div>
    <div class="calendar-main">
      <div class="calendar-header">
        <button @click="toggleMiniCalendar" class="calendar-toggle-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg>
        </button>
        <button @click="goToToday">Today</button>
        <button @click="prev">&lt;</button>
        <h2>{{ headerDate }}</h2>
        <button @click="next">&gt;</button>
        <ViewSwitcher :current-view="activeViewName" @view-changed="handleViewChanged" />
      </div>
      <component :is="activeView" :events="events" :current-date="currentDate" @event-modified="fetchEvents" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import moment from 'moment';
import MiniCalendar from './MiniCalendar.vue';
import ViewSwitcher from './ViewSwitcher.vue';
import MonthView from './MonthView.vue';
import WeekView from './WeekView.vue';
import DayView from './DayView.vue';

const events = ref([]);
const currentDate = ref(moment());
const activeViewName = ref('Month');
const isMiniCalendarCollapsed = ref(true);

const fetchEvents = async () => {
  let start, end;
  const view = activeViewName.value;
  const date = currentDate.value;

  if (view === 'Month') {
    start = date.clone().startOf('month').startOf('week');
    end = date.clone().endOf('month').endOf('week');
  } else if (view === 'Week') {
    start = date.clone().startOf('week');
    end = date.clone().endOf('week');
  } else { // Day view
    start = date.clone().startOf('day');
    end = date.clone().endOf('day');
  }

  events.value = await window.api.getCalendarEvents(start.toISOString(), end.toISOString());
};

// Watch for changes in the view or date and refetch events
watch([currentDate, activeViewName], fetchEvents, { immediate: true });

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

const goToToday = () => {
  currentDate.value = moment();
};

const toggleMiniCalendar = () => {
  isMiniCalendarCollapsed.value = !isMiniCalendarCollapsed.value;
};

const handleDateSelected = (date) => {
  currentDate.value = date;
  isMiniCalendarCollapsed.value = true; // Auto-close on selection
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
  position: relative;
}
.calendar-sidebar-container {
  position: relative;
}
.calendar-sidebar {
  position: absolute;
  top: 40px; /* Position below the header */
  left: 0;
  z-index: 100;
  background: white;
  border: 1px solid #ccc;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  border-radius: 5px;
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
.calendar-toggle-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
}
</style>
