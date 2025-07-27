<template>
  <div class="confirmation-card">
    <div class="card-header">
      <strong>Action Plan:</strong> {{ plan.summary }}
    </div>
    <div class="card-body">
      <div class="form-group">
        <label for="calendar-select">Target Calendar:</label>
        <select id="calendar-select" v-model="selectedCalendarId">
          <option v-for="calendar in calendars" :key="calendar.id" :value="calendar.id">
            {{ calendar.summary }}
          </option>
        </select>
      </div>
      <div v-if="isLoading" class="loading-overlay">
        <p>Re-evaluating plan...</p>
      </div>
      <div v-else class="event-list">
        <strong>Events to be {{ plan.action === 'create' ? 'created' : 'deleted' }}:</strong>
        <ul>
          <li v-for="(event, index) in plan.events" :key="index">
            <strong>{{ event.summary }}</strong> on {{ formatEventDate(event.startTime) }}
          </li>
        </ul>
      </div>
    </div>
    <div class="card-footer">
      <button @click="dismiss" class="button-secondary">Dismiss</button>
      <button @click="approve" class="button-primary" :disabled="isLoading">Approve</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, defineProps, defineEmits } from 'vue';
import { CalendarActionPlan } from '../../../types';
import moment from 'moment';

const props = defineProps<{
  plan: CalendarActionPlan;
}>();

const emit = defineEmits(['approve', 'dismiss', 're-evaluate']);

const calendars = ref([]);
const selectedCalendarId = ref(props.plan.targetCalendarId);
const isLoading = ref(false);

const fetchCalendars = async () => {
  try {
    calendars.value = await window.api.getCalendarList();
  } catch (error) {
    console.error("Error fetching calendar list:", error);
  }
};



const approve = () => {
  const updatedPlan = { ...props.plan, targetCalendarId: selectedCalendarId.value };
  emit('approve', updatedPlan);
};

const dismiss = () => {
  emit('dismiss');
};

const formatEventDate = (dateString: string) => {
  return moment(dateString).format('MMM D, YYYY @ h:mm A');
};

onMounted(() => {
  fetchCalendars();
});
</script>

<style scoped>
.confirmation-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #f9f9f9;
  margin: 10px 0;
  font-size: 0.9rem;
}
.card-header {
  padding: 10px 15px;
  background-color: #f1f1f1;
  border-bottom: 1px solid #e0e0e0;
  font-weight: 500;
}
.card-body {
  padding: 15px;
  position: relative;
}
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
}
.form-group {
  margin-bottom: 15px;
}
.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}
select {
  width: 100%;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
}
.event-list ul {
  list-style-type: none;
  padding-left: 0;
  margin-top: 5px;
}
.event-list li {
  padding: 5px 0;
}
.card-footer {
  padding: 10px 15px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
button {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  font-weight: 500;
}
.button-primary {
  background-color: var(--accent-primary);
  color: white;
}
.button-secondary {
  background-color: #e0e0e0;
  color: #333;
}
</style>
