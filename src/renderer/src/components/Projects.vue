<template>
  <div class="projects-container">
    <!-- View: All Projects -->
    <div v-if="!selectedProject" class="projects-list-view">
      <header class="view-header">
        <h1>Projects</h1>
        <div class="header-actions">
          <button @click="fetchProjects" class="icon-button" title="Refresh Projects">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L22 10M2 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>
          <button @click="showNewProjectDialog = true" class="button-primary" title="New Project">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            <span>New Project</span>
          </button>
        </div>
      </header>
      <div v-if="projects.length > 0" class="projects-list-container">
        <ul class="projects-list">
          <li v-for="project in projects" :key="project.id" @click="selectProject(project)">
            <span class="project-title">{{ project.title }}</span>
            <span class="task-count">{{ project.tasks.length }} Tasks</span>
          </li>
        </ul>
      </div>
      <div v-else class="empty-state">
        <h2>No Projects Yet</h2>
        <p>Get started by creating your first project.</p>
        <button @click="showNewProjectDialog = true" class="button-primary">Create Project</button>
      </div>
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
        <button @click="addNewTask()" class="button-primary add-task-button" title="Add New Task">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          <span>New Task</span>
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
              <div class="task-actions">
                <button @click="deselectTask" class="button-secondary">Cancel</button>
                <button @click="saveSelectedTask" class="button-primary">Save</button>
                <button v-if="!selectedTask.id.startsWith('temp-')" @click="requestDeleteTask(selectedTask.id)" class="icon-button-danger" title="Delete Task">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
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
                  <label for="duration">Duration (minutes)</label>
                  <input type="number" id="duration" v-model="selectedTask.duration" @change="validateMultipleOf15('duration')" list="duration-options" step="15" min="0">
                  <datalist id="duration-options">
                      <option value="15"></option>
                      <option value="30"></option>
                      <option value="45"></option>
                      <option value="60"></option>
                      <option value="90"></option>
                      <option value="120"></option>
                  </datalist>
              </div>
              <div class="form-group">
                  <label for="minChunk">Min Scheduling Time (minutes)</label>
                  <input type="number" id="minChunk" v-model="selectedTask.minChunk" @change="validateMultipleOf15('minChunk')" list="minChunk-options" step="15" min="0">
                  <datalist id="minChunk-options">
                      <option value="15"></option>
                      <option value="30"></option>
                      <option value="45"></option>
                      <option value="60"></option>
                  </datalist>
              </div>

              <div class="tab-container">
                <div class="editor-tabs">
                    <button :class="{ active: currentTab === 'description' }" @click="currentTab = 'description'">Description</button>
                    <button :class="{ active: currentTab === 'advanced' }" @click="currentTab = 'advanced'">Advanced</button>
                </div>

                <div v-if="currentTab === 'description'" class="tab-content">
                  <div class="editor-tabs nested-tabs">
                      <button :class="{ active: descriptionTab === 'edit' }" @click="descriptionTab = 'edit'">Edit</button>
                      <button :class="{ active: descriptionTab === 'preview' }" @click="descriptionTab = 'preview'">Preview</button>
                  </div>
                  <div v-if="descriptionTab === 'edit'" class="tab-content nested-content">
                      <textarea v-model="selectedTask.body" rows="10"></textarea>
                  </div>
                  <div v-else class="markdown-preview nested-content" v-html="renderedBody"></div>
                </div>

                <div v-if="currentTab === 'advanced'" class="tab-content">
                  <div class="form-group">
                    <label>Location</label>
                    <div class="location-input-group">
                      <input type="text" v-model="selectedTask.location" placeholder="e.g., Office, Home, 123 Main St" />
                      <button @click="getCurrentLocation" class="icon-button" title="Get Current Location">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                      </button>
                    </div>
                  </div>
                </div>
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
    <NewProjectDialog
      v-if="showNewProjectDialog"
      @confirm="handleCreateProject"
      @cancel="showNewProjectDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Project, Task } from '../../../types';
import { marked } from 'marked';
import NewProjectDialog from './NewProjectDialog.vue';
import KanbanBoard from './KanbanBoard.vue';

const projects = ref<Project[]>([]);
const selectedProject = ref<Project | null>(null);
const selectedTask = ref<Task | null>(null);
const showDeleteConfirmation = ref(false);
const showNewProjectDialog = ref(false);
const taskToDeleteId = ref<string | null>(null);
const currentTaskView = ref<'List' | 'Kanban'>('List');
const currentTab = ref<'description' | 'advanced'>('description');
const descriptionTab = ref<'edit' | 'preview'>('edit');

const renderedBody = computed(() => selectedTask.value ? marked(selectedTask.value.body || '') : '');

const fetchProjects = async (selectNewProject = false) => {
  const lastProjectId = selectedProject.value?.id;
  try {
    projects.value = await window.api.getProjects();
    if (selectNewProject) {
        const newProject = projects.value[projects.value.length - 1];
        if(newProject) {
            selectedProject.value = newProject;
        }
    } else if (lastProjectId) {
        const projectToSelect = projects.value.find(p => p.id === lastProjectId);
        if(projectToSelect) {
            selectedProject.value = projectToSelect;
        }
    }
  } catch (error) {
    console.error('Error fetching projects:', error);
  }
};

const handleCreateProject = async (title: string) => {
  if (!title) return;
  try {
    await window.api.createProject({ title });
    await fetchProjects(true); // Pass true to select the new project
    showNewProjectDialog.value = false;
  } catch (error) {
    console.error('Error creating project:', error);
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
  selectedTask.value = { ...task };
  currentTab.value = 'description';
  descriptionTab.value = 'edit';
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
    duration: 60,
    minChunk: 30,
    location: '',
  };
  selectTask(newTask);
};

const validateMultipleOf15 = (field: 'duration' | 'minChunk') => {
    if (selectedTask.value && selectedTask.value[field]) {
        const value = selectedTask.value[field] as number;
        if (value % 15 !== 0) {
            selectedTask.value[field] = Math.round(value / 15) * 15;
        }
    }
};

const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(async (position) => {
    const { latitude, longitude } = position.coords;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
      const data = await response.json();
      if (data.display_name && selectedTask.value) {
        selectedTask.value.location = data.display_name;
      } else {
        alert("Could not retrieve address for your location.");
      }
    } catch (error) {
      console.error("Error fetching address:", error);
      alert("An error occurred while fetching the address.");
    }
  }, (error) => {
    console.error("Geolocation error:", error);
    alert(`Could not get your location: ${error.message}`);
  });
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

.projects-list-container {
  overflow-y: auto;
  height: 100%;
}

.projects-list {
  list-style: none;
  padding: 0.5rem;
  margin: 0;
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

.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  text-align: center;
  padding: 2rem;
}

.empty-state h2 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
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
  margin-right: 1rem;
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

.tab-container {
    border: 1px solid var(--border-color);
    border-radius: 6px;
    margin-top: 1rem;
}

.editor-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
}
.editor-tabs.nested-tabs {
    border-top: none;
    border-bottom: 1px solid var(--border-color);
}

.editor-tabs button {
  padding: 8px 16px;
  cursor: pointer;
  border: none;
  border-right: 1px solid var(--border-color);
  background-color: var(--background-primary);
  font-weight: 500;
  flex-grow: 1;
}
.editor-tabs button:last-child {
    border-right: none;
}

.editor-tabs button.active {
  background-color: var(--background-secondary);
  color: var(--accent-primary);
}

.tab-content {
    padding: 1rem;
}
.tab-content.nested-content {
    padding: 0;
}

.markdown-preview {
  padding: 10px;
  background-color: var(--background-secondary);
  min-height: 140px;
  max-height: 400px;
  overflow: auto;
}

.tab-content.nested-content textarea {
    width: 100%;
    box-sizing: border-box; /*  Fix for overflow */
    padding: 10px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 1rem;
    background-color: #fdfdfd;
    transition: border-color 0.2s, box-shadow 0.2s;
    resize: vertical;
    min-height: 120px;
    font-family: inherit;
}
.tab-content.nested-content textarea:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

.location-input-group {
    display: flex;
    align-items: center;
}
.location-input-group input {
    flex-grow: 1;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
}
.location-input-group button {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border: 1px solid var(--border-color);
    border-left: none;
    padding: 6px;
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

.button-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--accent-primary);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}
.button-primary:hover {
  opacity: 0.9;
}

.button-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--background-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.button-secondary:hover {
  background-color: var(--background-primary);
}

.task-actions {
  display: flex;
  gap: 0.5rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-right: 1rem;
}
</style>

