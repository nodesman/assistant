<template>
  <div class="calendar-layout">
    <div class="calendar-main">
      <div class="calendar-header">
        <div class="header-left">
          <button @click="toggleMiniCalendar" class="icon-button calendar-toggle-btn" title="Toggle Calendar">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/></svg>
          </button>
          <button @click="goToToday" class="nav-button today-button">Today</button>
          <div class="nav-button-group">
            <button @click="prev" class="icon-button" title="Previous">&lt;</button>
            <button @click="next" class="icon-button" title="Next">&gt;</button>
          </div>
          <h2 class="header-date">{{ headerDate }}</h2>
        </div>
        <div class="header-right">
          <ViewSwitcher :current-view="activeViewName" @view-changed="handleViewChanged" />
          <button @click="fetchEvents" class="icon-button refresh-button" :class="{ 'loading': isFetching }" title="Refresh Events" :disabled="isFetching">
            <span v-if="isFetching" class="spinner"></span>
            <span v-else>↻</span>
          </button>
        </div>
      </div>
      <div class="calendar-content-area">
        <div class="calendar-sidebar-container">
          <div class="calendar-sidebar" v-if="!isMiniCalendarCollapsed">
            <MiniCalendar :selected-date="currentDate" @date-selected="handleDateSelected" />
            <hr>
            <CalendarList :calendars="calendars" :visible-calendars="visibleCalendars" @visibility-changed="handleCalendarVisibilityChanged" />
          </div>
        </div>
        <component :is="activeView" :events="events" :current-date="currentDate" @event-modified="fetchEvents" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import moment from 'moment';
import MiniCalendar from './MiniCalendar.vue';
import ViewSwitcher from './ViewSwitcher.vue';
import MonthView from './MonthView.vue';
import WeekView from './WeekView.vue';
import DayView from './DayView.vue';
import CalendarList from './CalendarList.vue';

const events = ref([]);
const currentDate = ref(moment());
const activeViewName = ref('Month');
const isMiniCalendarCollapsed = ref(true);
const calendars = ref<any[]>([]);
const visibleCalendars = ref<string[]>([]);
const isFetching = ref(false);

const fetchEvents = async () => {
  if (visibleCalendars.value.length === 0) {
    events.value = [];
    return;
  }
  isFetching.value = true;
  try {
    let start, end;
    const view = activeViewName.value;
    const date = currentDate.value;

    if (view === 'Month') {
      start = date.clone().startOf('month').startOf('week');
      end = date.clone().endOf('month').endOf('week');
    } else if (view === 'Week') {
      start = date.clone().startOf('week');
      end = date.clone().endOf('week');
    } else {
      start = date.clone().startOf('day');
      end = date.clone().endOf('day');
    }

    events.value = await window.api.getCalendarEvents(
      start.toISOString(),
      end.toISOString(),
      [...visibleCalendars.value]
    );
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
  } finally {
    isFetching.value = false;
  }
};

// Fetch calendar list on mount, then refetch events whenever inputs change
onMounted(async () => {
  try {
    const list = await window.api.getCalendarList();
    calendars.value = list;
    visibleCalendars.value = list.map(cal => cal.id);
  } catch (error) {
    console.error('Failed to fetch calendar list on mount:', error);
  }
});
watch([currentDate, activeViewName, visibleCalendars], fetchEvents, { immediate: true });

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
};

const handleViewChanged = (view) => {
  activeViewName.value = view;
};

const handleCalendarVisibilityChanged = (newVisibleCalendars) => {
  visibleCalendars.value = newVisibleCalendars;
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
  height: 100%;
}
.calendar-main {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 10px;
}
.header-left, .header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.icon-button {
  background: none;
  border: 1px solid transparent;
  cursor: pointer;
  color: #555;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.2s ease;
}
.icon-button:hover {
  background-color: #f0f0f0;
}
.icon-button:disabled {
  cursor: not-allowed;
  color: #ccc;
}
.refresh-button {
  border: 1px solid #e0e0e0;
}
.refresh-button.loading span {
  font-size: 16px;
}
.calendar-toggle-btn {
  border: 1px solid #e0e0e0;
}
.nav-button {
  background-color: #fff;
  border: 1px solid #e0e0e0;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  color: #555;
  transition: all 0.2s ease;
}
.nav-button:hover {
  background-color: #f5f5f5;
  border-color: #dcdcdc;
}
.nav-button-group {
  display: flex;
  align-items: center;
  gap: 4px;
}
.nav-button-group .icon-button {
  font-size: 22px;
  font-weight: bold;
  color: #888;
}
.header-date {
  font-size: 22px;
  font-weight: 600;
  color: #333;
  margin: 0;
}
.calendar-content-area {
  position: relative;
  flex-grow: 1;
}
.calendar-sidebar-container {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 100;
}
.calendar-sidebar {
  background: white;
  box-shadow: 0 5px 15px rgba(0,0,0,0.15);
  border-radius: 8px;
  padding: 5px;
}
hr {
  border: none;
  border-top: 1px solid #eee;
  margin: 10px 0;
}
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #ccc;
  border-top-color: #888;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
