<script setup lang="ts">
defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const chartTypes = [
  { id: 'flowchart', name: '流程图', icon: '📝' },
  { id: 'sequence', name: '时序图', icon: '📨' },
  { id: 'gantt', name: '甘特图', icon: '📅' },
  { id: 'class', name: '类图', icon: '🏗️' },
  { id: 'state', name: '状态图', icon: '🔄' },
  { id: 'er', name: 'ER图', icon: '🗄️' }
];
</script>

<template>
  <div class="form-group">
    <div class="panel-title" style="margin-bottom: 8px;">📊 图表类型</div>
    <div class="chart-types">
      <button
        v-for="ct in chartTypes"
        :key="ct.id"
        :class="['chart-type-btn', { active: modelValue === ct.id }]"
        @click="emit('update:modelValue', ct.id)"
      >
        {{ ct.icon }}<br>{{ ct.name }}
      </button>
    </div>
  </div>
</template>