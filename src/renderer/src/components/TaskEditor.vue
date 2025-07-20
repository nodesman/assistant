<template>
  <div class="editor-container">
    <VueEditor :editor="editor" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { VueEditor, useEditor } from '@milkdown/vue';
import { nord } from '@milkdown/theme-nord';
import { commonmark } from '@milkdown/preset-commonmark';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits(['update:modelValue']);

const { editor } = useEditor((root) =>
  Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root);
      ctx.set(defaultValueCtx, props.modelValue);
    })
    .use(nord)
    .use(commonmark)
);

watch(() => props.modelValue, (newValue) => {
  // This is a temporary workaround to update the editor content.
  // A more robust solution would involve a custom plugin.
  editor.value?.action((ctx) => {
    const editorView = ctx.get(editorViewCtx);
    const parser = ctx.get(parserCtx);
    const doc = parser(newValue);
    if (doc) {
      const state = editorView.state;
      const tr = state.tr.replaceWith(0, state.doc.content.size, doc);
      editorView.dispatch(tr);
    }
  });
});

onMounted(() => {
  editor.value?.action((ctx) => {
    const editorView = ctx.get(editorViewCtx);
    editorView.dispatch = (tr) => {
      editorView.updateState(editorView.state.apply(tr));
      if (tr.docChanged) {
        const serializer = ctx.get(serializerCtx);
        const markdown = serializer(editorView.state.doc);
        emit('update:modelValue', markdown);
      }
    };
  });
});
</script>

<style>
.editor-container {
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 5px;
}
</style>
