
<template>
  <div v-if="visible" class="dialog-overlay">
    <div class="dialog-content">
      <h3>{{ title }}</h3>
      <form @submit.prevent="handleSubmit">
        <div v-for="param in params" :key="param.name" class="form-group">
          <label :for="param.name">{{ param.label }}</label>
          <input
            v-if="param.type === 'text'"
            :id="param.name"
            v-model="formValues[param.name]"
            type="text"
            :placeholder="param.placeholder"
          />
          <input
            v-if="param.type === 'date'"
            :id="param.name"
            v-model="formValues[param.name]"
            type="date"
          />
          <select
            v-if="param.type === 'select'"
            :id="param.name"
            v-model="formValues[param.name]"
          >
            <option v-for="option in param.options" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <select
            v-if="param.type === 'async-select'"
            :id="param.name"
            v-model="formValues[param.name]"
          >
            <option v-for="option in asyncOptions[param.name]" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
        <div class="dialog-actions">
          <button type="button" @click="handleCancel">Cancel</button>
          <button type="submit">Confirm</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits } from 'vue';

const props = defineProps({
  visible: Boolean,
  title: String,
  params: Array,
  getEvents: Function,
});

const emit = defineEmits(['submit', 'close']);

const formValues = ref({});
const asyncOptions = ref({});

watch(() => props.params, (newParams) => {
  formValues.value = (newParams || []).reduce((acc, param) => {
    acc[param.name] = param.defaultValue || '';
    return acc;
  }, {});
}, { immediate: true });

watch(formValues, async (newValues, oldValues) => {
  for (const param of props.params) {
    if (param.type === 'async-select' && newValues[param.dependsOn] !== oldValues[param.dependsOn]) {
      const events = await props.getEvents(newValues[param.dependsOn]);
      asyncOptions.value[param.name] = events.map(e => ({ label: e.summary, value: e.id }));
    }
  }
}, { deep: true });

const handleSubmit = () => {
  emit('submit', { ...formValues.value });
  emit('close');
};

const handleCancel = () => {
  emit('close');
};
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}
.dialog-content {
  background-color: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  min-width: 400px;
}
.form-group {
  margin-bottom: 1rem;
}
.form-group label {
  display: block;
  margin-bottom: 0.5rem;
}
.form-group input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.dialog-actions {
  text-align: right;
  margin-top: 2rem;
}
</style>
