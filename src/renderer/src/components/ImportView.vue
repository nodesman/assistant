<template>
  <div class="import-view">
    <header class="view-header">
      <h1>Import Projects</h1>
    </header>
    <div class="import-content">
      <div class="import-card">
        <h3>Import from File</h3>
        <p class="description">Select a file and provide a prompt to extract projects and tasks.</p>
        
        <div class="form-group">
          <label>File</label>
          <div class="file-input-container">
            <label for="file-upload" class="button-secondary">
              Choose File
            </label>
            <input id="file-upload" type="file" @change="handleFileUpload" />
            <span v-if="fileName" class="file-name">{{ fileName }}</span>
          </div>
        </div>

        <div class="form-group">
          <label for="prompt-textarea">Prompt</label>
          <textarea id="prompt-textarea" v-model="prompt" placeholder="e.g., 'Extract projects and tasks from the content above.'"></textarea>
        </div>

        <div class="dialog-actions">
          <button @click="startImport" :disabled="!fileContent || !prompt || isImporting" class="button-primary">
            {{ isImporting ? 'Importing...' : 'Start Import' }}
          </button>
        </div>
      </div>

      <div v-if="importLogs.length > 0" class="logs-card">
        <h3>Import Log</h3>
        <pre class="logs-container">
          <div v-for="(log, index) in importLogs" :key="index">{{ log }}</div>
        </pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const fileContent = ref<string | null>(null);
const fileName = ref<string | null>(null);
const prompt = ref<string>('Extract projects and tasks from this file.');
const importLogs = ref<string[]>([]);
const isImporting = ref(false);

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    fileName.value = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      fileContent.value = e.target?.result as string;
      if (fileContent.value.length > 1000000 * 4) {
        alert('File is too large for the 1 million token limit.');
        fileContent.value = null;
        fileName.value = null;
      }
    };
    reader.readAsText(file);
  }
};

const startImport = async () => {
  if (!fileContent.value || !prompt.value) return;
  importLogs.value = [];
  isImporting.value = true;
  try {
    await window.api.extractProjectsAndTasks(fileContent.value, prompt.value);
  } catch (error) {
    console.error('Error starting import:', error);
    importLogs.value.push(`ERROR: ${error.message}`);
  } finally {
    isImporting.value = false;
  }
};

const handleLogMessage = (log: string) => {
  importLogs.value.push(log);
};

onMounted(() => {
  window.api.onReceiveMessage('import-log', handleLogMessage);
});

onUnmounted(() => {
  // Placeholder for cleanup
});
</script>

<style scoped>
.import-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.view-header {
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.view-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.import-content {
  padding-top: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.import-card, .logs-card {
  background-color: var(--background-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  padding: 1.5rem;
}

.import-card h3, .logs-card h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  font-size: 1.25rem;
}

.import-card .description {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: var(--text-secondary);
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

.file-input-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

input[type="file"] {
  display: none;
}

.file-name {
  font-style: italic;
  color: var(--text-secondary);
}

textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 1rem;
  background-color: #fdfdfd;
  transition: border-color 0.2s, box-shadow 0.2s;
  resize: vertical;
  min-height: 100px;
}
textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

.dialog-actions {
  display: flex;
  justify-content: flex-start;
  margin-top: 1rem;
}

.logs-container {
  background-color: #f8f9fa;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 1rem;
  max-height: 300px;
  overflow-y: auto;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  font-family: monospace;
  font-size: 0.875rem;
}

/* Button Styles */
button {
  padding: 10px 20px;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease;
}

.button-primary {
  background-color: var(--accent-primary);
  color: white;
  border-color: var(--accent-primary);
}
.button-primary:hover:not(:disabled) {
  opacity: 0.9;
}
.button-primary:disabled {
  background-color: #a0c7e4;
  border-color: #a0c7e4;
  cursor: not-allowed;
}

.button-secondary {
  background-color: #f9f9f9;
  color: #555;
  border-color: #e0e0e0;
}
.button-secondary:hover {
  background-color: #f0f0f0;
  border-color: #dcdcdc;
}
</style>
