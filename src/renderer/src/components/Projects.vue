<template>
  <div>
    <h2>Projects</h2>
    <button @click="fetchProjects">Refresh</button>
    <div v-for="project in projects" :key="project.id" class="project">
      <h3>{{ project.title }}</h3>
      <p>{{ project.body }}</p>
      <button @click="openAddTaskModal(project.id)">Add Task</button>
      <ul>
        <li v-for="task in project.tasks" :key="task.id">
          {{ task.title }} - {{ task.status }}
          <button @click="openEditTaskModal(task)">Edit</button>
          <button @click="deleteTask(task.id)">Delete</button>
        </li>
      </ul>
    </div>

    <div v-if="isModalOpen" class="modal">
      <div class="modal-content">
        <h3>{{ editingTask ? 'Edit Task' : 'Add Task' }}</h3>
        <input v-model="taskForm.title" placeholder="Task Title" />
        <TaskEditor v-model="taskForm.body" />
        <select v-model="taskForm.status">
          <option>To Do</option>
          <option>In Progress</option>
          <option>Done</option>
        </select>
        <button @click="saveTask">Save</button>
        <button @click="closeModal">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Project, Task } from '../../../types';
import TaskEditor from './TaskEditor.vue';

const projects = ref<Project[]>([]);
const isModalOpen = ref(false);
const editingTask = ref<Task | null>(null);
const currentProjectId = ref<string | null>(null);

const taskForm = ref({
  title: '',
  body: '',
  status: 'To Do',
});

const fetchProjects = async () => {
  try {
    projects.value = await window.api.getProjects();
  } catch (error) {
    console.error('Error fetching projects:', error);
  }
};

const openAddTaskModal = (projectId: string) => {
  editingTask.value = null;
  currentProjectId.value = projectId;
  taskForm.value = { title: '', body: '', status: 'To Do' };
  isModalOpen.value = true;
};

const openEditTaskModal = (task: Task) => {
  editingTask.value = task;
  taskForm.value = { ...task };
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
};

const saveTask = async () => {
  // Convert the reactive Vue object to a plain JavaScript object before sending
  const taskData = { ...taskForm.value };

  if (editingTask.value) {
    await window.api.updateTask(editingTask.value.id, taskData);
  } else {
    await window.api.addTask(currentProjectId.value, taskData);
  }
  fetchProjects();
  closeModal();
};

const deleteTask = async (taskId: string) => {
  if (confirm('Are you sure you want to delete this task?')) {
    await window.api.deleteTask(taskId);
    fetchProjects();
  }
};

onMounted(() => {
  fetchProjects();
});
</script>

<style scoped>
.project {
  border: 1px solid #ccc;
  padding: 10px;
  margin-bottom: 10px;
}
li {
  margin-bottom: 5px;
}
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}
.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 5px;
}
</style>
