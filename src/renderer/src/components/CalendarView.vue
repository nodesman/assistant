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
          <button @click="toggleMiniCalendar" class="icon-button calendar-toggle-btn" title="Toggle Calendar">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/>
            </svg>
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
          <div class="popover-wrapper">
            <button @click="toggleSettingsPopover" class="nav-button settings-button" title="Calendar settings">
              <i class="fas fa-calendar-alt"></i>
            </button>
            <div v-if="isSettingsPopoverVisible" class="popover" v-click-outside="closeSettingsPopover">
              <MiniCalendar :selected-date="currentDate" @date-selected="handleDateSelected" />
              <hr class="popover-divider" />
              <CalendarList
                :calendars="calendars"
                :visible-calendars="visibleCalendarIds"
                @visibility-changed="handleVisibilityChange"
              />
            </div>
          </div>
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
const isSettingsPopoverVisible = ref(false);
const isMiniCalendarCollapsed = ref(true);

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
  if (!isAuthenticated.value) return;
  // Fetch events in the range for the active view (month/week/day)
  try {
    const view = activeViewName.value.toLowerCase();
    const timeMin = currentDate.value.clone().startOf(view).toISOString();
    const timeMax = currentDate.value.clone().endOf(view).toISOString();
    events.value = await window.api.getCalendarEvents(timeMin, timeMax, visibleCalendarIds.value);
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
  }
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
  isSettingsPopoverVisible.value = false;
};

const changeDate = (amount) => {
  const view = activeViewName.value.toLowerCase();
  currentDate.value = currentDate.value.clone().add(amount, view);
};

const goToToday = () => {
  currentDate.value = moment();
};

const toggleSettingsPopover = () => {
  isSettingsPopoverVisible.value = !isSettingsPopoverVisible.value;
};

const closeSettingsPopover = () => {
  isSettingsPopoverVisible.value = false;
};

const vClickOutside = {
  mounted(el, binding) {
    el.__ClickOutsideHandler__ = (event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event);
      }
    };
    document.body.addEventListener('click', el.__ClickOutsideHandler__);
  },
  unmounted(el) {
    document.body.removeEventListener('click', el.__ClickOutsideHandler__);
  },
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
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

/* Layout header sections and center the view-switcher */
.header-left, .header-center, .header-right {
  display: flex;
  align-items: center;
}

.header-left {
  flex: none;
  justify-content: flex-start;
  gap: 12px;
}

.header-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.header-right {
  flex: none;
  justify-content: flex-end;
  position: relative;
}

.nav-button, .today-button, .settings-button {
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

.nav-button:hover, .today-button:hover, .settings-button:hover {
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

.settings-button {
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
}

.popover-wrapper {
  position: relative;
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
.calendar-toggle-btn {
  border: 1px solid #e0e0e0;
}

.popover {
  position: absolute;
  top: 100%;
  right: 0;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  z-index: 1000;
  margin-top: 8px;
  width: 300px;
  padding: 10px 0;
}

.popover-divider {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 10px 0;
}
</style>
