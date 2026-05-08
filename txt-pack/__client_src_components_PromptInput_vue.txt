<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'generate', data: { prompt: string; model: string }): void;
}>();

const prompt = ref('');
const selectedModel = ref('minimax');

function handleSubmit() {
  if (!prompt.value.trim() || props.isLoading) return;
  emit('generate', { 
    prompt: prompt.value.trim(), 
    model: selectedModel.value 
  });
}

// Example prompts for users to try
const examples = [
  '用户登录流程',
  '电商下单流程',
  '用户注册并发送邮件验证',
  '微服务调用链路',
  '订单处理状态流转'
];

function useExample(ex: string) {
  prompt.value = ex;
}

declare const props: { isLoading: boolean };
</script>

<template>
  <div class="prompt-section">
    <div class="form-group">
      <label>💡 描述你想要生成的图表</label>
      <textarea
        v-model="prompt"
        placeholder="例如：生成一个用户登录的流程图，包含输入账号密码、验证、登录成功或失败"
        @keydown.ctrl.enter="handleSubmit"
      ></textarea>
    </div>

    <div class="examples">
      <span class="examples-label">试试：</span>
      <button 
        v-for="ex in examples" 
        :key="ex"
        class="example-btn"
        @click="useExample(ex)"
      >
        {{ ex }}
      </button>
    </div>

    <button 
      class="btn btn-primary" 
      :disabled="isLoading || !prompt.trim()"
      @click="handleSubmit"
    >
      {{ isLoading ? '⏳ 生成中...' : '🚀 生成图表' }}
    </button>
  </div>
</template>

<style scoped>
.prompt-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.examples {
  margin-bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.examples-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.example-btn {
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: white;
  cursor: pointer;
  font-size: 0.7rem;
  transition: all 0.2s;
}

.example-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}
</style>