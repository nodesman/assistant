<template>
  <div class="week-view">
    <div class="day-column" v-for="day in weekDays" :key="day.date.toString()">
      <div class="day-header">
        <h3>{{ day.date.format('ddd') }}</h3>
        <p>{{ day.date.format('MMM D') }}</p>
      </div>
      <div class="events">
        <div class="event" v-for="event in day.events" :key="event.id">
          {{ event.summary }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import moment from 'moment';

const props = defineProps({
  events: Array,
  currentDate: Object,
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
</script>

<style scoped>
.week-view {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
  border: 1px solid #ccc;
}
.day-column {
  border-right: 1px solid #ccc;
  padding: 10px;
}
.day-column:last-child {
  border-right: none;
}
.day-header {
  text-align: center;
  margin-bottom: 10px;
}
.event {
  background-color: #e0e0ff;
  border-radius: 3px;
  padding: 5px;
  margin-bottom: 5px;
  font-size: 12px;
}
</style>
