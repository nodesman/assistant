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
            <button @click="emitAction(action.prompt)">
              <span class="action-icon">{{ action.icon }}</span>
              <span class="action-name">{{ action.name }}</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineEmits } from 'vue';

const isCollapsed = ref(true);
const emit = defineEmits(['action-clicked', 'update:collapsed']);

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
  emit('update:collapsed', isCollapsed.value);
};

const emitAction = (prompt: string) => {
  emit('action-clicked', prompt);
};

const actionCategories = ref([
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
      { name: 'Create new project', icon: '➕', prompt: 'Create a new project called "New Project"' },
      { name: 'List all projects', icon: '📚', prompt: 'List all my projects' },
      { name: 'Summarize a project', icon: '📝', prompt: 'Give me a summary of the "Website Redesign" project.' },
      { name: 'Show active projects', icon: '🚀', prompt: 'Which projects are currently active?' },
    ],
  },
  {
    name: 'Tasks',
    actions: [
      { name: 'Add a new task', icon: '✅', prompt: 'Add a new task: ' },
      { name: 'Show my tasks', icon: '📋', prompt: 'Show me all my tasks' },
      { name: 'What are my overdue tasks?', icon: '❗', prompt: 'What are my overdue tasks?' },
      { name: 'Mark a task complete', icon: '✔️', prompt: 'Mark task "Design new homepage" as complete' },
    ],
  },
  {
    name: 'Calendar',
    actions: [
      { name: 'Schedule an event', icon: '🗓️', prompt: 'Schedule a meeting for tomorrow at 2pm to ' },
      { name: 'Show this week\'s calendar', icon: '📆', prompt: 'Show my calendar for this week' },
      { name: 'Find free time', icon: '🔍', prompt: 'When am I free next week for a 1-hour meeting?' },
      { name: 'Cancel an event', icon: '❌', prompt: 'Cancel my meeting tomorrow at 2pm' },
    ],
  },
]);
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
