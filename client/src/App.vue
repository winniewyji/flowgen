<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import ModelSelector from './components/ModelSelector.vue';
import PromptInput from './components/PromptInput.vue';
import DiagramEditor from './components/DiagramEditor.vue';
import ChartTypeSelector from './components/ChartTypeSelector.vue';

const mermaidCode = ref('');
const isLoading = ref(false);
const status = ref<{ type: 'success' | 'error' | 'loading' | ''; message: string }>({
  type: '',
  message: ''
});
const selectedModel = ref('minimax');
const selectedChartType = ref('flowchart');
const diagramGenerated = ref(false);

// 动态导入 mermaid
let mermaid: any = null;

onMounted(async () => {
  const module = await import('mermaid');
  mermaid = module.default;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose'
  });
});

async function handleGenerate(data: { prompt: string; model: string }) {
  isLoading.value = true;
  status.value = { type: 'loading', message: '🤖 AI 正在生成图表...' };
  diagramGenerated.value = false;

  try {
    const response = await fetch('/api/diagram/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: data.prompt,
        chartType: selectedChartType.value,
        model: data.model || selectedModel.value
      })
    });

    const result = await response.json();

    if (result.success && result.code) {
      mermaidCode.value = result.code;
      status.value = { type: 'success', message: '✨ 图表生成成功！' };
      diagramGenerated.value = true;
      
      // 等待 DOM 更新后渲染
      await nextTick();
      await renderMermaid();
    } else {
      status.value = { type: 'error', message: result.error || '生成失败' };
    }
  } catch (error) {
    status.value = { 
      type: 'error', 
      message: error instanceof Error ? error.message : '网络请求失败' 
    };
  } finally {
    isLoading.value = false;
  }
}

async function renderMermaid() {
  if (!mermaid || !mermaidCode.value) return;
  
  const container = document.getElementById('mermaid-container');
  if (!container) return;
  
  try {
    const id = 'mermaid-' + Date.now();
    const { svg } = await mermaid.render(id, mermaidCode.value);
    container.innerHTML = svg;
  } catch (error) {
    console.error('Mermaid render error:', error);
  }
}

function handleCopyCode() {
  navigator.clipboard.writeText(mermaidCode.value);
  status.value = { type: 'success', message: '📋 代码已复制！' };
}

function handleClear() {
  mermaidCode.value = '';
  diagramGenerated.value = false;
  status.value = { type: '', message: '' };
}
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>🚀 FlowGen</h1>
      <p>AI驱动的智能图表生成器 - 输入描述，自动生成流程图、时序图等</p>
    </header>

    <div class="main-layout">
      <aside class="panel">
        <ModelSelector v-model="selectedModel" />
        <ChartTypeSelector v-model="selectedChartType" />
        <PromptInput 
          :is-loading="isLoading"
          @generate="handleGenerate"
        />
        
        <div v-if="status.message" :class="['status', status.type]">
          {{ status.message }}
        </div>
      </aside>

      <main class="diagram-container">
        <div class="toolbar">
          <button 
            v-if="diagramGenerated" 
            @click="handleCopyCode"
            class="copy-btn"
          >
            📋 复制代码
          </button>
          <button 
            v-if="diagramGenerated" 
            @click="handleClear"
          >
            🗑️ 清除
          </button>
        </div>

        <div v-if="!diagramGenerated" class="empty-state">
          <div class="icon">📊</div>
          <p>输入描述，点击生成按钮</p>
          <p>AI 将为你创建 Mermaid 图表</p>
          <p style="margin-top: 12px; font-size: 0.8rem; color: #94a3b8;">
            支持：流程图、时序图、甘特图、类图、状态图、ER图
          </p>
        </div>

        <div 
          v-show="diagramGenerated" 
          id="mermaid-container" 
          class="mermaid"
        ></div>

        <pre 
          v-if="mermaidCode && diagramGenerated" 
          style="margin-top: 16px; font-size: 12px;"
        >{{ mermaidCode }}</pre>
      </main>
    </div>
  </div>
</template>