<template>
  <div class="selection-card">
    <div class="card-header">
      <strong>Clarification Needed</strong>
    </div>
    <div class="card-body">
      <p>{{ plan.summary }}</p>
      <div class="form-group">
        <label for="calendar-select">Please select a calendar:</label>
        <select id="calendar-select" v-model="selectedCalendarId">
          <option disabled value="">-- Choose one --</option>
          <option v-for="calendar in plan.calendars" :key="calendar.id" :value="calendar.id">
            {{ calendar.summary }}
          </option>
        </select>
      </div>
    </div>
    <div class="card-footer">
      <button @click="dismiss" class="button-secondary">Cancel</button>
      <button @click="submit" class="button-primary" :disabled="!selectedCalendarId">Continue</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue';
import { CalendarSelectionRequest } from '../../../types';

const props = defineProps<{
  plan: CalendarSelectionRequest;
}>();

const emit = defineEmits(['submit', 'dismiss']);

const selectedCalendarId = ref('');

const submit = () => {
  if (selectedCalendarId.value) {
    emit('submit', {
      originalPrompt: props.plan.originalPrompt,
      selectedCalendarId: selectedCalendarId.value,
    });
  }
};

const dismiss = () => {
  emit('dismiss');
};
</script>

<style scoped>
.selection-card {
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
}
.card-body p {
  margin-top: 0;
}
.form-group {
  margin-top: 15px;
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
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
