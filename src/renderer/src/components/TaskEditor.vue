<template>
  <div class="editor-container">
    <textarea v-model="content" @input="updateModelValue" class="text-area"></textarea>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits(['update:modelValue']);

const content = ref(props.modelValue);

watch(() => props.modelValue, (newValue) => {
  content.value = newValue;
});

const updateModelValue = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  emit('update:modelValue', target.value);
};
</script>

<style>
.editor-container {
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 5px;
  height: 100%;
}
.text-area {
  width: 100%;
  height: 100%;
  border: none;
  resize: none;
  background: #f8f9fa;
}
</style>