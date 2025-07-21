<template>
  <div class="kanban-board">
    <div
      v-for="status in statuses"
      :key="status"
      class="kanban-column"
      @dragover.prevent
      @drop="onDrop($event, status)"
    >
      <h3 class="column-title">{{ status }}</h3>
      <div class="column-content">
        <div
          v-for="task in tasksByStatus(status)"
          :key="task.id"
          class="kanban-card"
          draggable="true"
          @dragstart="onDragStart($event, task)"
          @click="selectTask(task)"
        >
          <p class="card-title">{{ task.title }}</p>
        </div>
        <button
          v-if="status !== 'Done'"
          @click="addTask(status)"
          class="add-task-button"
        >
          + Add Task
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import { Task } from '../../../types';

const props = defineProps<{
  tasks: Task[];
}>();

const emit = defineEmits(['select-task', 'update-task-status', 'add-task']);

const statuses = ['To Do', 'In Progress', 'Done'];

const tasksByStatus = (status: string) => {
  return props.tasks.filter(task => task.status === status);
};

const onDragStart = (event: DragEvent, task: Task) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', task.id);
    event.dataTransfer.effectAllowed = 'move';
  }
};

const onDrop = (event: DragEvent, newStatus: string) => {
  if (event.dataTransfer) {
    const taskId = event.dataTransfer.getData('text/plain');
    const task = props.tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      emit('update-task-status', { taskId, newStatus });
    }
  }
};

const selectTask = (task: Task) => {
  emit('select-task', task);
};

const addTask = (status: string) => {
  emit('add-task', status);
};
</script>

<style scoped>
.kanban-board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  height: 100%;
  overflow-x: auto;
  padding-top: 1rem;
}
.kanban-column {
  background-color: var(--background-primary);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.column-title {
  padding: 1rem;
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  border-bottom: 1px solid var(--border-color);
}
.column-content {
  flex-grow: 1;
  padding: 0.5rem;
  overflow-y: auto;
}
.kanban-card {
  background-color: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 1rem;
  margin: 0.5rem;
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s;
}
.kanban-card:hover {
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  border-color: var(--accent-primary);
}
.card-title {
  margin: 0;
  font-weight: 500;
}
.add-task-button {
  background: none;
  border: 1px dashed var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  display: block;
  width: calc(100% - 1rem);
  margin: 0.5rem;
  padding: 0.75rem;
  text-align: center;
  font-weight: 500;
  transition: background-color 0.2s, color 0.2s;
}
.add-task-button:hover {
  background-color: var(--accent-primary);
  color: white;
  border-color: var(--accent-primary);
}
</style>
