<template>
  <div class="projects-container">
    <!-- View: All Projects -->
    <div v-if="!selectedProject" class="projects-list-view">
      <header class="view-header">
        <h1>Projects</h1>
        <button @click="fetchProjects" class="icon-button" title="Refresh Projects">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L22 10M2 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        </button>
      </header>
      <ul class="projects-list">
        <li v-for="project in projects" :key="project.id" @click="selectProject(project)">
          <span class="project-title">{{ project.title }}</span>
          <span class="task-count">{{ project.tasks.length }} Tasks</span>
        </li>
      </ul>
    </div>

    <!-- View: Single Project (Master-Detail) -->
    <div v-else class="project-detail-view">
      <header class="view-header breadcrumb">
        <button @click="goBackToProjects" class="back-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          <span>Projects</span>
        </button>
        <span class="breadcrumb-separator">/</span>
        <h1 class="project-title-header">{{ selectedProject.title }}</h1>
        <div class="view-switcher">
          <button @click="currentTaskView = 'List'" :class="{ active: currentTaskView === 'List' }">List</button>
          <button @click="currentTaskView = 'Kanban'" :class="{ active: currentTaskView === 'Kanban' }">Kanban</button>
        </div>
        <button @click="addNewTask()" class="icon-button add-task-button" title="Add New Task">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </header>
      <div class="master-detail-content" :class="{ 'details-visible': selectedTask }">
        <!-- Master Content (List or Kanban) -->
        <div class="master-container">
            <div v-if="currentTaskView === 'List'" class="tasks-list-container">
              <ul class="tasks-list">
                <li v-for="task in selectedProject.tasks" :key="task.id" @click="selectTask(task)" :class="{ active: selectedTask && selectedTask.id === task.id }">
                  <span class="task-title">{{ task.title }}</span>
                  <span class="task-status" :data-status="task.status">{{ task.status }}</span>
                </li>
              </ul>
            </div>
            <KanbanBoard
                v-if="currentTaskView === 'Kanban'"
                :tasks="selectedProject.tasks"
                @select-task="selectTask"
                @update-task-status="updateTaskStatus"
                @add-task="addNewTask"
            />
        </div>
        <!-- Task Details (Detail Panel) -->
        <div class="task-details-container" v-if="selectedTask">
           <header class="view-header">
              <h3>{{ selectedTask.id.startsWith('temp-') ? 'New Task' : 'Task Details' }}</h3>
              <div>
                <button @click="saveSelectedTask" class="icon-button" title="Save Changes">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
                </button>
                <button v-if="!selectedTask.id.startsWith('temp-')" @click="requestDeleteTask(selectedTask.id)" class="icon-button-danger" title="Delete Task">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
                 <button @click="deselectTask" class="icon-button" title="Close">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </header>
            <div class="task-form">
              <div class="form-group">
                <label>Title</label>
                <input type="text" v-model="selectedTask.title" />
              </div>
              <div class="form-group">
                <label>Status</label>
                <select v-model="selectedTask.status">
                  <option>To Do</option>
                  <option>In Progress</option>
                  <option>Done</option>
                </select>
              </div>
              <div class="form-group">
                <label>Description</label>
                <div class="editor-tabs">
                    <button :class="{ active: currentTab === 'edit' }" @click="currentTab = 'edit'">Edit</button>
                    <button :class="{ active: currentTab === 'preview' }" @click="currentTab = 'preview'">Preview</button>
                </div>
                <div v-if="currentTab === 'edit'">
                    <textarea v-model="selectedTask.body" rows="10"></textarea>
                </div>
                <div v-else class="markdown-preview" v-html="renderedBody"></div>
              </div>
            </div>
        </div>
      </div>
    </div>
    <GenericConfirmationDialog
      v-if="showDeleteConfirmation"
      title="Confirm Deletion"
      message="Are you sure you want to delete this task?"
      @confirm="handleDeleteConfirm"
      @cancel="showDeleteConfirmation = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Project, Task } from '../../../types';
import { marked } from 'marked';
import GenericConfirmationDialog from './GenericConfirmationDialog.vue';
import KanbanBoard from './KanbanBoard.vue';

const projects = ref<Project[]>([]);
const selectedProject = ref<Project | null>(null);
const selectedTask = ref<Task | null>(null);
const showDeleteConfirmation = ref(false);
const taskToDeleteId = ref<string | null>(null);
const currentTab = ref<'edit' | 'preview'>('edit');
const currentTaskView = ref<'List' | 'Kanban'>('List');

const renderedBody = computed(() => selectedTask.value ? marked(selectedTask.value.body || '') : '');

const fetchProjects = async (selectLastProject = false) => {
  const lastProjectId = selectedProject.value?.id;
  try {
    projects.value = await window.api.getProjects();
    if (selectLastProject && lastProjectId) {
        const projectToSelect = projects.value.find(p => p.id === lastProjectId);
        if(projectToSelect) {
            selectedProject.value = projectToSelect;
        }
    }
  } catch (error) {
    console.error('Error fetching projects:', error);
  }
};

const selectProject = (project: Project) => {
  selectedProject.value = project;
  selectedTask.value = null;
  currentTaskView.value = 'List';
};

const goBackToProjects = () => {
  selectedProject.value = null;
  selectedTask.value = null;
};

const selectTask = (task: Task) => {
  selectedTask.value = { ...task }; // Use a copy for editing
  currentTab.value = 'edit';
};

const deselectTask = () => {
    selectedTask.value = null;
}

const addNewTask = (status: string = 'To Do') => {
  if (!selectedProject.value) return;
  const newTask: Task = {
    id: `temp-${Date.now()}`,
    title: 'New Task',
    body: '',
    status: status,
    projectId: selectedProject.value.id,
  };
  selectTask(newTask);
};

const saveSelectedTask = async () => {
  if (!selectedTask.value || !selectedProject.value) return;
  const taskData = { ...selectedTask.value };

  try {
    if (taskData.id.startsWith('temp-')) {
      const { id, ...taskToCreate } = taskData;
      await window.api.addTask(selectedProject.value.id, taskToCreate);
    } else {
      await window.api.updateTask(taskData.id, taskData);
    }
    await fetchProjects(true);
    deselectTask();
  } catch (error)
  {
    console.error('Error saving task:', error);
  }
};

const updateTaskStatus = async ({ taskId, newStatus }: { taskId: string, newStatus: string }) => {
    const task = selectedProject.value?.tasks.find(t => t.id === taskId);
    if (task) {
        const updatedTask = { ...task, status: newStatus };
        await window.api.updateTask(taskId, updatedTask);
        await fetchProjects(true);
    }
};

const requestDeleteTask = (taskId: string) => {
  taskToDeleteId.value = taskId;
  showDeleteConfirmation.value = true;
};

const handleDeleteConfirm = async () => {
  if (taskToDeleteId.value) {
    await window.api.deleteTask(taskToDeleteId.value);
    await fetchProjects(true);
    deselectTask();
  }
  showDeleteConfirmation.value = false;
  taskToDeleteId.value = null;
};

onMounted(fetchProjects);
</script>

<style scoped>
.projects-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.view-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.projects-list-view {
  background-color: var(--background-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.projects-list {
  list-style: none;
  padding: 0.5rem;
  margin: 0;
  overflow-y: auto;
}

.projects-list li {
  padding: 1rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  margin: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s, box-shadow 0.2s;
  border: 1px solid var(--border-color);
}

.projects-list li:hover {
  background-color: var(--background-primary);
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}

.project-title {
  font-weight: 500;
}

.task-count {
  font-size: 0.875rem;
  color: var(--text-secondary);
  background-color: var(--background-primary);
  padding: 4px 10px;
  border-radius: 12px;
}

.project-detail-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.breadcrumb {
  gap: 0.5rem;
  justify-content: flex-start;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  color: var(--accent-primary);
}

.breadcrumb-separator {
  color: var(--text-secondary);
}

.project-title-header {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.view-switcher {
  display: inline-flex;
  background-color: var(--background-primary);
  border-radius: 20px;
  padding: 4px;
  margin-left: 1.5rem;
}
.view-switcher button {
  padding: 6px 16px;
  border: none;
  background-color: transparent;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.3s ease;
  border-radius: 16px;
}
.view-switcher button.active {
  background-color: var(--background-secondary);
  color: var(--accent-primary);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.add-task-button {
  margin-left: auto;
}

.master-detail-content {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  flex-grow: 1;
  overflow: hidden;
  padding-top: 1rem;
  transition: grid-template-columns 0.3s ease-in-out;
}

.master-detail-content.details-visible {
  grid-template-columns: minmax(300px, 1.5fr) 2fr;
}

.master-container {
    background-color: var(--background-secondary);
    border-radius: 8px;
    border: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.tasks-list-container,
.task-details-container {
  background-color: var(--background-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tasks-list {
  list-style: none;
  padding: 0.5rem;
  margin: 0;
  overflow-y: auto;
}

.tasks-list li {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s;
}

.tasks-list li:hover {
  background-color: var(--background-primary);
}

.tasks-list li.active {
  background-color: var(--accent-primary);
  color: white;
  font-weight: 500;
}

.task-status {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
  text-transform: uppercase;
}
.task-status[data-status="To Do"] { background-color: #e0e0e0; color: #333; }
.task-status[data-status="In Progress"] { background-color: #dbeafe; color: #1e40af; }
.task-status[data-status="Done"] { background-color: #dcfce7; color: #166534; }

.task-form {
  padding: 1rem;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.form-group input, .form-group select, .form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 1rem;
  background-color: #fdfdfd;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.form-group input:focus, .form-group select:focus, .form-group textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

textarea {
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
}

.editor-tabs {
  display: flex;
  margin-bottom: -1px;
}
.editor-tabs button {
  padding: 8px 16px;
  cursor: pointer;
  border: 1px solid var(--border-color);
  background-color: var(--background-primary);
  border-bottom: 1px solid var(--border-color);
  position: relative;
  top: 1px;
  border-radius: 4px 4px 0 0;
}
.editor-tabs button.active {
  background-color: var(--background-secondary);
  border-bottom: 1px solid var(--background-secondary);
}
.markdown-preview {
  border: 1px solid var(--border-color);
  padding: 10px;
  border-radius: 0 6px 6px 6px;
  background-color: var(--background-secondary);
  min-height: 140px;
  max-height: 400px;
  overflow: auto;
}
textarea {
    border-radius: 0 6px 6px 6px;
}

.icon-button, .icon-button-danger {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s, color 0.2s;
}
.icon-button:hover {
  background-color: var(--background-primary);
  color: var(--text-primary);
}
.icon-button-danger {
    color: #ef4444;
}
.icon-button-danger:hover {
    background-color: #fee2e2;
    color: #b91c1c;
}
</style>