<template>
  <div class="calendar-list">
    <div class="list-header">
      <h4>My Calendars</h4>
      <div class="header-actions">
        <span v-if="isLoading" class="spinner"></span>
        <span v-if="showUpdatedMessage" class="updated-message">Updated!</span>
        <button @click="refreshCalendars" class="refresh-btn" title="Refresh Calendars" :disabled="isLoading">↻</button>
      </div>
    </div>
    <ul>
      <li v-for="calendar in calendars" :key="calendar.id">
        <input
          type="checkbox"
          :checked="isCalendarVisible(calendar.id)"
          @change="toggleCalendarVisibility(calendar.id)"
        />
        <span class="color-swatch" :style="{ backgroundColor: calendar.backgroundColor }"></span>
        <label>{{ calendar.summary }}</label>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineEmits, defineProps, watch } from 'vue';

const props = defineProps({
  visibleCalendars: Array,
});

const emit = defineEmits(['visibility-changed', 'refresh']);

const calendars = ref([]);
const localVisibleCalendars = ref(new Set(props.visibleCalendars));
const isLoading = ref(false);
const showUpdatedMessage = ref(false);

const fetchCalendars = async () => {
  isLoading.value = true;
  try {
    calendars.value = await window.api.getCalendarList();
    // When fetching for the first time, make all calendars visible.
    if (props.visibleCalendars.length === 0) {
      calendars.value.forEach(cal => localVisibleCalendars.value.add(cal.id));
      emit('visibility-changed', Array.from(localVisibleCalendars.value));
    }
    showUpdatedMessage.value = true;
    setTimeout(() => showUpdatedMessage.value = false, 2000);
  } catch (error) {
    console.error('Failed to fetch calendar list:', error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchCalendars);

watch(() => props.visibleCalendars, (newVal) => {
  localVisibleCalendars.value = new Set(newVal);
});

const isCalendarVisible = (calendarId) => {
  return localVisibleCalendars.value.has(calendarId);
};

const toggleCalendarVisibility = (calendarId) => {
  if (localVisibleCalendars.value.has(calendarId)) {
    localVisibleCalendars.value.delete(calendarId);
  } else {
    localVisibleCalendars.value.add(calendarId);
  }
  emit('visibility-changed', Array.from(localVisibleCalendars.value));
};

const refreshCalendars = () => {
  fetchCalendars();
};
</script>

<style scoped>
.calendar-list {
  padding: 10px;
}
.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.refresh-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  color: #888;
  padding: 5px;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.refresh-btn:hover {
  background-color: #f0f0f0;
}
.refresh-btn:disabled {
  cursor: not-allowed;
  color: #ccc;
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
.updated-message {
  font-size: 12px;
  color: #007bff;
  font-weight: 500;
}
ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
li {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}
.color-swatch {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  margin: 0 8px;
}
input[type="checkbox"] {
  margin-right: 5px;
}
</style>
