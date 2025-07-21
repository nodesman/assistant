<template>
  <div class="calendar-grid">
    <div class="day-header" v-for="day in daysOfWeek" :key="day">{{ day }}</div>
    <div class="day-cell" v-for="day in calendarDays" :key="day.date.toString()" :class="{ 'is-today': day.isToday, 'is-current-month': day.isCurrentMonth }">
      <div class="day-number">{{ day.date.date() }}</div>
      <div class="events">
        <div class="event" v-for="event in day.events" :key="event.id">{{ event.summary }}</div>
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

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const calendarDays = computed(() => {
  const startOfMonth = props.currentDate.clone().startOf('month');
  const endOfMonth = props.currentDate.clone().endOf('month');
  const startDate = startOfMonth.clone().startOf('week');
  const endDate = endOfMonth.clone().endOf('week');

  const days = [];
  let day = startDate.clone();

  while (day.isSameOrBefore(endDate)) {
    days.push({
      date: day.clone(),
      isToday: day.isSame(moment(), 'day'),
      isCurrentMonth: day.isSame(props.currentDate, 'month'),
      events: props.events.filter(event => moment(event.start.dateTime).isSame(day, 'day')),
    });
    day.add(1, 'day');
  }
  return days;
});
</script>

<style scoped>
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
}
.day-header {
  text-align: center;
  font-weight: bold;
}
.day-cell {
  border: 1px solid #ccc;
  height: 120px;
  padding: 5px;
  overflow-y: auto;
}
.is-today {
  background-color: #f0f0f0;
}
.is-current-month {
  font-weight: bold;
}
.day-number {
  text-align: right;
}
.events {
  margin-top: 5px;
}
.event {
  background-color: #e0e0ff;
  border-radius: 3px;
  padding: 2px 4px;
  margin-bottom: 2px;
  font-size: 12px;
}
</style>
