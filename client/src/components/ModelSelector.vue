<script setup lang="ts">
defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const models = [
  { id: 'minimax', name: 'MiniMax', icon: '🤖' },
  { id: 'openai', name: 'ChatGPT', icon: '🧠' }
];
</script>

<template>
  <div class="model-selector">
    <div class="panel-title">🤖 AI 模型</div>
    <button
      v-for="m in models"
      :key="m.id"
      :class="['model-btn', { active: modelValue === m.id }]"
      @click="emit('update:modelValue', m.id)"
    >
      {{ m.icon }} {{ m.name }}
    </button>
  </div>
</template>