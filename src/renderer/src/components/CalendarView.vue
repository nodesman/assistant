<template>
  <div class="calendar-view">
    <div v-if="!isAuthenticated" class="auth-prompt">
      <h2>Connect your Google Account</h2>
      <p>To see and manage your calendar events, you need to connect your Google account.</p>
      <button @click="authorize" class="auth-button">Connect Google Account</button>
    </div>
    <div v-else class="calendar-container">
      <div class="calendar-header">
        <div class="header-left">
          <button @click="toggleMiniCalendar" class="icon-button" title="Toggle Calendar & Calendars">
            <i class="fas fa-calendar-alt"></i>
          </button>
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
          <button @click="refreshEvents" :disabled="isFetchingEvents" class="icon-button refresh-button" title="Refresh events">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{ spinning: isFetchingEvents }">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="calendar-content-area">
        <div class="calendar-sidebar-container">
          <div class="calendar-sidebar" v-if="!isMiniCalendarCollapsed">
            <MiniCalendar :selected-date="currentDate" @date-selected="handleDateSelected" />
            <hr>
            <CalendarList :calendars="calendars" :visible-calendars="visibleCalendarIds" @visibility-changed="handleVisibilityChange" />
          </div>
        </div>
        <component
          :is="activeView"
          :events="filteredEvents"
          :current-date="currentDate"
          @event-modified="fetchEvents"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import moment from 'moment';
import MonthView from './MonthView.vue';
import WeekView from './WeekView.vue';
import DayView from './DayView.vue';
import ViewSwitcher from './ViewSwitcher.vue';
import CalendarList from './CalendarList.vue';
import MiniCalendar from './MiniCalendar.vue';

const isAuthenticated = ref(false);
const events = ref([]);
const calendars = ref([]);
const visibleCalendarIds = ref<string[]>([]);
const currentDate = ref(moment());
const activeViewName = ref('Month');
const isMiniCalendarCollapsed = ref(true);
const isFetchingEvents = ref(false);

const toggleMiniCalendar = () => {
  isMiniCalendarCollapsed.value = !isMiniCalendarCollapsed.value;
};

const checkAuthStatus = async () => {
  try {
    const user = await window.api.getAuthorizedUser();
    isAuthenticated.value = !!user;
  } catch (error) {
    console.error('Error checking auth status:', error);
    isAuthenticated.value = false;
  }
};

const fetchEvents = async () => {
  if (!isAuthenticated.value || isFetchingEvents.value) return;
  isFetchingEvents.value = true;
  try {
    console.log('Fetching events for calendars:', JSON.stringify(visibleCalendarIds.value));
    const view = activeViewName.value.toLowerCase();
    const timeMin = currentDate.value.clone().startOf(view).toISOString();
    const timeMax = currentDate.value.clone().endOf(view).toISOString();
    events.value = await window.api.getCalendarEvents(
      timeMin,
      timeMax,
      [...visibleCalendarIds.value]
    );
    console.log(`Fetched ${events.value.length} events.`);
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
  } finally {
    isFetchingEvents.value = false;
  }
};

const refreshEvents = () => {
  fetchEvents();
};

const fetchCalendars = async () => {
  if (!isAuthenticated.value) return;
  try {
    calendars.value = await window.api.getCalendarList();
    if (visibleCalendarIds.value.length === 0 && calendars.value.length > 0) {
      visibleCalendarIds.value = calendars.value.map(c => c.id);
    }
  } catch (error) {
    console.error('Failed to fetch calendar list:', error);
  }
};

const authorize = async () => {
  try {
    await window.api.authorizeGoogleAccount();
    await checkAuthStatus();
  } catch (error) {
    console.error('Google Authorization failed:', error);
  }
};

onMounted(async () => {
  await checkAuthStatus();
  if (isAuthenticated.value) {
    await fetchCalendars();
    await fetchEvents();
  }
  if (window.api?.onReceiveMessage) {
    window.api.onReceiveMessage('google-auth-success', async () => {
      await checkAuthStatus();
      if (isAuthenticated.value) {
        await fetchCalendars();
        await fetchEvents();
      }
    });
  }
});

watch(isAuthenticated, (isAuth) => {
  if (isAuth) {
    fetchCalendars();
    fetchEvents();
  } else {
    events.value = [];
    calendars.value = [];
    visibleCalendarIds.value = [];
  }
});

watch(visibleCalendarIds, () => {
  if (isAuthenticated.value) {
    fetchEvents();
  }
});
// re-fetch when date or view changes
watch([currentDate, activeViewName], () => {
  if (isAuthenticated.value) {
    fetchEvents();
  }
});

const activeView = computed(() => {
  switch (activeViewName.value) {
    case 'Week': return WeekView;
    case 'Day': return DayView;
    default: return MonthView;
  }
});

const filteredEvents = computed(() => {
  if (visibleCalendarIds.value.length === 0) {
    return events.value;
  }
  return events.value.filter(event => visibleCalendarIds.value.includes(event.calendarId));
});

const formattedCurrentDate = computed(() => {
  switch (activeViewName.value) {
    case 'Month':
      return currentDate.value.format('MMMM YYYY');
    case 'Week': {
      const startOfWeek = currentDate.value.clone().startOf('week').format('MMM D');
      const endOfWeek = currentDate.value.clone().endOf('week').format('MMM D, YYYY');
      return `${startOfWeek} - ${endOfWeek}`;
    }
    case 'Day':
      return currentDate.value.format('dddd, MMMM D, YYYY');
    default:
      return '';
  }
});

const handleViewChange = (viewName) => {
  activeViewName.value = viewName;
};

const handleVisibilityChange = (newVisibleIds: string[]) => {
  visibleCalendarIds.value = newVisibleIds;
};

const handleDateSelected = (date) => {
  currentDate.value = date;
  // Also close the sidebar when a date is picked from the mini calendar
  isMiniCalendarCollapsed.value = true;
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

.auth-prompt {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  text-align: center;
  background-color: #fff;
  border-radius: 8px;
  padding: 40px;
}

.auth-prompt h2 {
  font-size: 24px;
  margin-bottom: 16px;
}

.auth-prompt p {
  font-size: 16px;
  color: #666;
  margin-bottom: 24px;
}

.auth-button {
  background-color: #4285F4;
  color: white;
  border: none;
  padding: 12px 24px;
  font-size: 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.auth-button:hover {
  background-color: #357ae8;
}

.calendar-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

/* Layout header sections and center the view-switcher */
.header-left, .header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left {
  justify-content: flex-start;
}

.header-center {
  /* No absolute positioning needed */
}

.header-right {
  justify-content: flex-end;
}

.nav-button, .today-button, .icon-button {
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

.nav-button:hover, .today-button:hover, .icon-button:hover {
  background-color: #f0f0f0;
  border-color: #dcdcdc;
}

.today-button {
  padding: 8px 16px;
  border-radius: 8px;
  flex-shrink: 0;
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

.icon-button {
  width: 36px;
  height: 36px;
  padding: 0;
  font-size: 16px;
  border-radius: 50%;
}

.current-date {
  font-size: 22px;
  font-weight: 600;
  color: #333;
  margin: 0;
  padding-left: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.calendar-content-area {
  position: relative;
  flex-grow: 1;
  /* allow scrolling for views taller than the viewport (e.g., full-day timeline) */
  overflow: auto;
}
.calendar-sidebar-container {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 100;
  height: 100%;
}
.calendar-sidebar {
  background: white;
  box-shadow: 0 5px 15px rgba(0,0,0,0.15);
  border-radius: 8px;
  padding: 5px;
  height: 100%;
  overflow-y: auto;
}
hr {
  border: none;
  border-top: 1px solid #eee;
  margin: 10px 0;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinning {
  animation: spin 1s linear infinite;
}
</style>
