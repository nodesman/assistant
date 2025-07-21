<template>
  <div class="confirmation-container">
    <h4>Import Confirmation</h4>
    <p>The following projects and tasks have been detected. Please review before importing.</p>
    
    <div v-for="project in data.projects" :key="project.title" class="project-accordion">
      <button @click="toggleProject(project.title)" class="accordion-header">
        <strong>Project:</strong> {{ project.title }}
      </button>
      <div v-if="isOpen(project.title)" class="accordion-content">
        <ul>
          <li 
            v-for="task in getTasksForProject(project.title)" 
            :key="task.title" 
            class="task-item"
            @mouseover="showTooltip($event, task)"
            @mouseleave="hideTooltip"
            @mousemove="updateTooltipPosition"
          >
            {{ task.title }}
          </li>
        </ul>
      </div>
    </div>

    <div class="confirmation-buttons">
      <button @click="$emit('confirm', data)">Confirm & Import All</button>
      <button @click="$emit('cancel')">Cancel</button>
    </div>

    <Tooltip :visible="tooltip.visible" :content="tooltip.content" :x="tooltip.x" :y="tooltip.y" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Project, Task } from '../../../types';
import Tooltip from './Tooltip.vue';

const props = defineProps<{
  data: {
    projects: Project[];
    tasks: Task[];
  };
}>();

const openProjects = ref<string[]>([]);
const tooltip = ref({
  visible: false,
  content: '',
  x: 0,
  y: 0,
});

const toggleProject = (projectName: string) => {
  if (openProjects.value.includes(projectName)) {
    openProjects.value = openProjects.value.filter(p => p !== projectName);
  } else {
    openProjects.value.push(projectName);
  }
};

const isOpen = (projectName: string) => {
  return openProjects.value.includes(projectName);
};

const getTasksForProject = (projectName: string) => {
  return props.data.tasks.filter(t => t.projectName === projectName);
};

const showTooltip = (event: MouseEvent, task: Task) => {
  tooltip.value = {
    visible: true,
    content: `Description: ${task.body}\nStatus: ${task.status || 'To Do'}`, 
    x: event.clientX + 15,
    y: event.clientY + 15,
  };
};

const hideTooltip = () => {
  tooltip.value.visible = false;
};

const updateTooltipPosition = (event: MouseEvent) => {
  if (tooltip.value.visible) {
    tooltip.value.x = event.clientX + 15;
    tooltip.value.y = event.clientY + 15;
  }
};
</script>

<style scoped>
.confirmation-container {
  border: 1px solid #007bff;
  padding: 15px;
  border-radius: 8px;
  margin: 10px 0;
  background-color: #f0f8ff;
}
.project-accordion {
  margin-bottom: 5px;
}
.accordion-header {
  width: 100%;
  text-align: left;
  background-color: #e7f3ff;
  border: 1px solid #cce5ff;
  padding: 10px;
  cursor: pointer;
}
.accordion-content {
  padding: 10px;
  border: 1px solid #cce5ff;
  border-top: none;
}
.task-item {
  cursor: help;
  padding: 2px 5px;
}
.confirmation-buttons {
  margin-top: 15px;
}
</style>