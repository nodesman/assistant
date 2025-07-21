<template>
  <div class="calendar-view">
    <div class="calendar-header">
      <div class="header-left">
        <button @click="goToToday" class="nav-button today-button">Today</button>
        <div class="nav-button-group">
          <button @click="changeDate(-1)" class="nav-button">&lt;</button>
          <button @click="changeDate(1)" class="nav-button">&gt;</button>
        </div>
        <h2 class="current-date">{{ formattedCurrentDate }}</h2>
      </div>
      <div class="header-center">
        <ViewSwitcher :current-view="activeViewName" @view-changed="handleViewChange" />
      </div>
      <div class="header-right">
        <!-- Placeholder for future elements like a search bar or settings -->
      </div>
    </div>
    <component
      :is="activeView"
      :events="events"
      :current-date="currentDate"
      @event-modified="fetchEvents"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import moment from 'moment';
import MonthView from './MonthView.vue';
import WeekView from './WeekView.vue';
import DayView from './DayView.vue';
import ViewSwitcher from './ViewSwitcher.vue';

const events = ref([]);
const currentDate = ref(moment());
const activeViewName = ref('Month'); // Default view

const fetchEvents = async () => {
  try {
    events.value = await window.api.getCalendarEvents();
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
  }
};

onMounted(fetchEvents);

const activeView = computed(() => {
  switch (activeViewName.value) {
    case 'Week':
      return WeekView;
    case 'Day':
      return DayView;
    case 'Month':
    default:
      return MonthView;
  }
});

const formattedCurrentDate = computed(() => {
  return currentDate.value.format('MMMM YYYY');
});

const handleViewChange = (viewName) => {
  activeViewName.value = viewName;
};

const changeDate = (amount) => {
  const view = activeViewName.value.toLowerCase();
  currentDate.value = currentDate.value.clone().add(amount, view);
};

const goToToday = () => {
  currentDate.value = moment();
};

</script>

<style scoped>
.calendar-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 20px;
  background-color: #f9f9f9;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left, .header-center, .header-right {
  display: flex;
  align-items: center;
}

.header-left {
  flex: 1;
  justify-content: flex-start;
  gap: 12px;
}

.header-center {
  flex: 1;
  justify-content: center;
}

.header-right {
  flex: 1;
  justify-content: flex-end;
}

.nav-button, .today-button {
  background: none;
  border: 1px solid #e0e0e0;
  cursor: pointer;
  font-weight: 600;
  color: #555;
  transition: all 0.2s ease;
  display: flex;
  justify-content: center;
  align-items: center;
}

.nav-button:hover, .today-button:hover {
  background-color: #f0f0f0;
  border-color: #dcdcdc;
}

.today-button {
  padding: 8px 16px;
  border-radius: 8px;
}

.nav-button-group {
  display: flex;
  align-items: center;
}

.nav-button-group .nav-button {
  width: 36px;
  height: 36px;
  padding: 0;
  font-size: 20px;
  line-height: 36px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  margin: 0 4px;
}

.current-date {
  font-size: 22px;
  font-weight: 600;
  color: #333;
  margin: 0;
  padding-left: 12px;
}
</style>
