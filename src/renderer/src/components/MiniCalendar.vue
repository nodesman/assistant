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
  width: 280px;
  background-color: #fff;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.mini-calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding: 0 5px;
}
.mini-calendar-header span {
  font-weight: 600;
  font-size: 16px;
  color: #333;
}
.mini-calendar-header button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 20px;
  color: #888;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color 0.2s;
}
.mini-calendar-header button:hover {
  background-color: #f0f0f0;
}
.mini-calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
}
.mini-day-header {
  text-align: center;
  font-weight: 600;
  font-size: 12px;
  color: #999;
}
.mini-day-cell {
  text-align: center;
  cursor: pointer;
  padding: 6px 0;
  border-radius: 50%;
  font-size: 14px;
  transition: background-color 0.2s, color 0.2s;
}
.mini-day-cell:hover {
  background-color: #f0f0f0;
}
.is-selected {
  background-color: #007bff;
  color: white;
  font-weight: bold;
}
</style>
