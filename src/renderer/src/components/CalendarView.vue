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
          <button @click="fetchEvents" class="nav-button refresh-button">Refresh</button>
        </div>
      </div>
      <component
        :is="activeView"
        :events="events"
        :current-date="currentDate"
        @event-modified="fetchEvents"
      />
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

const isAuthenticated = ref(false);
const events = ref([]);
const currentDate = ref(moment());
const activeViewName = ref('Month'); // Default view

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
  try {
    events.value = await window.api.getCalendarEvents();
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
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
    await fetchEvents();
  }
  if (window.api?.onReceiveMessage) {
    window.api.onReceiveMessage('google-auth-success', async () => {
      await checkAuthStatus();
    });
  }
});

watch(isAuthenticated, (isAuth) => {
  if (isAuth) {
    fetchEvents();
  } else {
    events.value = [];
  }
});

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
