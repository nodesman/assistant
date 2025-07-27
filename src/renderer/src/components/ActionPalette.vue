<template>
  <div :class="['action-palette', { 'is-collapsed': isCollapsed }]">
    <div class="palette-toggle" @click="toggleCollapse">
      <svg v-if="isCollapsed" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
    </div>
    <div class="palette-content">
      <h3 class="palette-title">Action Palette</h3>
      <div v-for="category in actionCategories" :key="category.name" class="action-category">
        <h4>{{ category.name }}</h4>
        <ul>
          <li v-for="action in category.actions" :key="action.name">
            <button @click="handleActionClick(action)">
              <span class="action-icon">{{ action.icon }}</span>
              <span class="action-name">{{ action.name }}</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
    <ActionDialog
      :visible="isDialogVisible"
      :title="dialogTitle"
      :params="dialogParams"
      :get-events="getEvents"
      @submit="handleDialogSubmit"
      @close="handleDialogClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, defineEmits, onMounted } from 'vue';
import ActionDialog from './ActionDialog.vue';

const isCollapsed = ref(false);
const emit = defineEmits(['action-clicked', 'update:collapsed']);

const isDialogVisible = ref(false);
const dialogTitle = ref('');
const dialogParams = ref([]);
const activeAction = ref(null);
const projects = ref([]);

const getEvents = async (date) => {
  const timeMin = new Date(date).toISOString();
  const timeMax = new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000).toISOString();
  // @ts-ignore
  return await window.api.getCalendarEvents(timeMin, timeMax);
};

onMounted(async () => {
  // @ts-ignore
  projects.value = await window.api.getAllProjects();
  updateActionParams();
});

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
  emit('update:collapsed', isCollapsed.value);
};

const handleActionClick = (action) => {
  if (action.params) {
    activeAction.value = action;
    dialogTitle.value = action.name;
    dialogParams.value = action.params;
    isDialogVisible.value = true;
  } else {
    emit('action-clicked', action.prompt);
  }
};

const handleDialogSubmit = (values) => {
  let prompt = activeAction.value.prompt;
  for (const key in values) {
    prompt = prompt.replace(`{${key}}`, values[key]);
  }
  emit('action-clicked', prompt);
  isDialogVisible.value = false;
};

const handleDialogClose = () => {
  isDialogVisible.value = false;
};

const actionCategories = ref([]);

const updateActionParams = () => {
  actionCategories.value = [
    {
      name: 'Agenda & Planning',
      actions: [
        { name: 'What is my day like?', icon: '📅', prompt: "What's on my agenda for today?" },
        { name: 'Plan my day', icon: '🗺️', prompt: 'Based on my calendar and tasks, can you help me plan my day?' },
        { name: 'Any upcoming deadlines?', icon: '⌛', prompt: 'What are my upcoming task deadlines?' },
        { name: 'Suggest a focus for today', icon: '🎯', prompt: 'What is the most important thing I should focus on today?' },
      ],
    },
    {
      name: 'Projects',
      actions: [
        { name: 'Create new project', icon: '➕', prompt: 'Create a new project called "{projectName}"', params: [{ name: 'projectName', label: 'Project Name', type: 'text', placeholder: 'Enter project name' }] },
        { name: 'List all projects', icon: '📚', prompt: 'List all my projects' },
        { name: 'Summarize a project', icon: '📝', prompt: 'Give me a summary of the "{projectName}" project.', params: [{ name: 'projectName', label: 'Project Name', type: 'text', placeholder: 'Enter project name' }] },
        { name: 'Show active projects', icon: '🚀', prompt: 'Which projects are currently active?' },
      ],
    },
    {
      name: 'Tasks',
      actions: [
        { name: 'Add a new task', icon: '✅', prompt: 'Add a new task: {taskDescription} to project {projectName}', params: [{ name: 'projectName', label: 'Project', type: 'select', options: projects.value.map(p => ({ label: p.name, value: p.name })) }, { name: 'taskDescription', label: 'Task Description', type: 'text', placeholder: 'Enter task description' }] },
        { name: 'Show my tasks', icon: '📋', prompt: 'Show me all my tasks' },
        { name: 'What are my overdue tasks?', icon: '❗', prompt: 'What are my overdue tasks?' },
        { name: 'Mark a task complete', icon: '✔️', prompt: 'Mark task "{taskName}" as complete', params: [{ name: 'taskName', label: 'Task Name', type: 'text', placeholder: 'Enter task name' }] },
      ],
    },
    {
      name: 'Calendar',
      actions: [
        { name: 'Schedule an event', icon: '🗓️', prompt: 'Schedule a meeting on {date} to {eventTitle}', params: [{ name: 'eventTitle', label: 'Event Title', type: 'text', placeholder: 'Enter event title' }, { name: 'date', label: 'Date', type: 'date' }] },
        { name: 'Show this week\'s calendar', icon: '📆', prompt: 'Show my calendar for this week' },
        { name: 'Find free time', icon: '🔍', prompt: 'When am I free next week for a {duration} meeting?', params: [{ name: 'duration', label: 'Duration', type: 'text', placeholder: 'e.g., 1-hour' }] },
        { name: 'Cancel an event', icon: '❌', prompt: 'Cancel my meeting on {date}', params: [{ name: 'date', label: 'Date', type: 'date' }, { name: 'eventId', label: 'Event', type: 'async-select', dependsOn: 'date' }] },
      ],
    },
  ];
};
</script>


<style scoped>
.action-palette {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 280px;
  background-color: #f8f9fa;
  border-left: 1px solid #e0e0e0;
  transition: transform 0.3s ease-in-out;
  z-index: 1010;
  display: flex;
  flex-direction: column;
}
.action-palette.is-collapsed {
  transform: translateX(calc(100% - 40px));
}
.palette-toggle {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%) translateX(-100%);
  width: 25px;
  height: 50px;
  background-color: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-right: none;
  border-radius: 8px 0 0 8px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #555;
}
.palette-toggle:hover {
  background-color: #f1f3f5;
}
.palette-content {
  padding: 1.25rem;
  overflow-y: auto;
  flex-grow: 1;
}
.palette-title {
  margin-top: 0;
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}
.action-category {
  margin-bottom: 1.5rem;
}
.action-category h4 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.action-category ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.action-category li button {
  width: 100%;
  background-color: #fff;
  border: 1px solid #dcdcdc;
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: background-color 0.2s, box-shadow 0.2s;
}
.action-category li button:hover {
  background-color: #fdfdfd;
  border-color: #c0c0c0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.action-icon {
  font-size: 1.2rem;
}
.action-name {
  font-weight: 500;
  color: #333;
}
</style>
