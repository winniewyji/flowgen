<script setup lang="ts">
// 图表编辑器组件 - 预留扩展用
// 当前版本中，编辑功能主要通过生成的 Mermaid 代码进行
// 后续可以集成更多的拖拽编辑功能

defineProps<{
  code: string;
}>();

const emit = defineEmits<{
  (e: 'update', code: string): void;
}>();
</script>

<template>
  <div class="diagram-editor">
    <div class="editor-toolbar">
      <span>📝 代码编辑模式</span>
    </div>
    <textarea
      :value="code"
      @input="emit('update', ($event.target as HTMLTextAreaElement).value)"
      class="code-editor"
      placeholder="编辑 Mermaid 代码..."
    ></textarea>
  </div>
</template>

<style scoped>
.diagram-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-toolbar {
  padding: 8px 12px;
  background: #f1f5f9;
  border-radius: 8px 8px 0 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.code-editor {
  flex: 1;
  padding: 16px;
  border: none;
  border-top: 1px solid var(--border);
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
  background: #f8fafc;
}

.code-editor:focus {
  outline: none;
  background: #fff;
}
</style>