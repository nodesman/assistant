<template>
  <div class="mini-calendar">
    <div class="mini-calendar-header">
      <button @click="prevMonth">&lt;</button>
      <span>{{ currentMonth.format('MMM YYYY') }}</span>
      <button @click="nextMonth">&gt;</button>
    </div>
    <div class="mini-calendar-grid">
      <div class="mini-day-header" v-for="day in daysOfWeek" :key="day">{{ day }}</div>
      <div
        class="mini-day-cell"
        v-for="day in calendarDays"
        :key="day.date.toString()"
        :class="{ 'is-selected': isSelected(day.date) }"
        @click="selectDate(day.date)"
      >
        {{ day.date.date() }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineEmits } from 'vue';
import moment from 'moment';

const props = defineProps({
  selectedDate: Object,
});

const emit = defineEmits(['date-selected']);

const currentMonth = ref(moment());
const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const calendarDays = computed(() => {
  const startOfMonth = currentMonth.value.clone().startOf('month');
  const startDate = startOfMonth.clone().startOf('week');
  const endOfMonth = currentMonth.value.clone().endOf('month');
  const endDate = endOfMonth.clone().endOf('week');

  const days = [];
  let day = startDate.clone();

  while (day.isSameOrBefore(endDate)) {
    days.push({ date: day.clone() });
    day.add(1, 'day');
  }
  return days;
});

const isSelected = (date) => {
  return date.isSame(props.selectedDate, 'day');
};

const selectDate = (date) => {
  emit('date-selected', date);
};

const prevMonth = () => {
  currentMonth.value = currentMonth.value.clone().subtract(1, 'month');
};

const nextMonth = () => {
  currentMonth.value = currentMonth.value.clone().add(1, 'month');
};
</script>

<style scoped>
.mini-calendar {
  width: 250px;
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 5px;
}
.mini-calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.mini-calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
}
.mini-day-header {
  text-align: center;
  font-weight: bold;
  font-size: 12px;
}
.mini-day-cell {
  text-align: center;
  cursor: pointer;
  padding: 5px 0;
  border-radius: 50%;
}
.mini-day-cell:hover {
  background-color: #f0f0f0;
}
.is-selected {
  background-color: #007bff;
  color: white;
}
</style>
