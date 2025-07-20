<template>
  <div>
    <h2>Goals</h2>
    <button @click="fetchGoals">Refresh</button>
    <div>
      <h3>Purpose</h3>
      <p>{{ horizons.purpose.purpose }}</p>
      <h4>Principles</h4>
      <ul>
        <li v-for="principle in horizons.purpose.principles" :key="principle">
          {{ principle }}
        </li>
      </ul>
    </div>
    <div>
      <h3>Goals</h3>
      <ul>
        <li v-for="goal in horizons.goals" :key="goal.title">
          <h4>{{ goal.title }}</h4>
          <p>{{ goal.description }}</p>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Horizons } from '../../../types';

const horizons = ref<Horizons>({
  purpose: { purpose: '', principles: [] },
  goals: [],
});

const fetchGoals = async () => {
  try {
    horizons.value = await window.api.getGoals();
  } catch (error) {
    console.error('Error fetching goals:', error);
  }
};

onMounted(() => {
  fetchGoals();
});
</script>
