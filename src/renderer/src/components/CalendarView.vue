<template>
  <div>
    <!-- View switcher will go here -->
    <component :is="activeView" :events="events" :current-date="currentDate" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import moment from 'moment';
import MonthView from './MonthView.vue';
// import WeekView from './WeekView.vue';
// import DayView from './DayView.vue';

const events = ref([]);
const currentDate = ref(moment());
const activeViewName = ref('Month'); // Default view

onMounted(async () => {
  events.value = await window.api.getCalendarEvents();
});

const activeView = computed(() => {
  switch (activeViewName.value) {
    // case 'Week':
    //   return WeekView;
    // case 'Day':
    //   return DayView;
    default:
      return MonthView;
  }
});
</script>
