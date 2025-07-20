<template>
  <div>
    <h2>Projects</h2>
    <button @click="fetchProjects">Refresh</button>
    <div v-for="project in projects" :key="project.title">
      <h3>{{ project.title }}</h3>
      <p>{{ project.body }}</p>
      <ul>
        <li v-for="task in project.tasks" :key="task.title">
          {{ task.title }} - {{ task.status }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Project } from '../../../types';

const projects = ref<Project[]>([]);

const fetchProjects = async () => {
  try {
    projects.value = await window.api.getProjects();
  } catch (error) {
    console.error('Error fetching projects:', error);
  }
};

onMounted(() => {
  fetchProjects();
});
</script>
