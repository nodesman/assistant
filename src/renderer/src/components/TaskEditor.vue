<template>
  <div class="editor-container">
    <VueEditor :editor="editor" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Editor, rootCtx, defaultValueCtx, editorViewCtx, serializerCtx, parserCtx } from '@milkdown/core';
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

// This watcher synchronizes changes from the parent to the editor
watch(() => props.modelValue, (newValue) => {
  const editorInstance = editor.value;
  if (!editorInstance) return;

  editorInstance.action(ctx => {
    const view = ctx.get(editorViewCtx);
    const currentDoc = view.state.doc;
    const serializer = ctx.get(serializerCtx);
    const currentMarkdown = serializer(currentDoc);

    if (newValue !== currentMarkdown) {
      const parser = ctx.get(parserCtx);
      const doc = parser(newValue);
      if (doc) {
        const tr = view.state.tr.replaceWith(0, currentDoc.content.size, doc);
        view.dispatch(tr);
      }
    }
  });
});

// Synchronize editor changes to the parent modelValue by monkey-patching dispatch
// This watcher synchronizes changes from the editor to the parent
watch(
  () => editor.value,
  (editorInstance) => {
    if (!editorInstance) return;

    editorInstance.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const serializer = ctx.get(serializerCtx);

      // Monkey patch the dispatch function to get updates
      const originalDispatch = view.dispatch;
      view.dispatch = (tr) => {
        originalDispatch(tr);
        if (tr.docChanged) {
          const markdown = serializer(view.state.doc);
          if (props.modelValue !== markdown) {
            emit('update:modelValue', markdown);
          }
        }
      };
    });
  },
  { once: true } // Ensure this setup runs only once when the editor is created
);
</script>

<style>
.editor-container {
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 5px;
}
.milkdown {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
}
</style>
