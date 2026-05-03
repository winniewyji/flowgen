<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import ModelSelector from './components/ModelSelector.vue';
import PromptInput from './components/PromptInput.vue';
import DiagramEditor from './components/DiagramEditor.vue';
import ChartTypeSelector from './components/ChartTypeSelector.vue';
import FileUploader from './components/FileUploader.vue';

const mermaidCode = ref('');
const isLoading = ref(false);
const status = ref<{ type: 'success' | 'error' | 'loading' | ''; message: string }>({
  type: '',
  message: ''
});
const selectedModel = ref('minimax');
const selectedChartType = ref('flowchart');
const diagramGenerated = ref(false);
const extractedCode = ref('');  // 从图片提取的代码
const showEditor = ref(false);

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

async function handleFileAnalysis(imageData: string) {
  isLoading.value = true;
  status.value = { type: 'loading', message: '🔍 AI 正在分析图片...' };

  try {
    const response = await fetch('/api/upload/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageData,
        action: 'extract-diagram',
        model: 'openai'  // 流程图提取需要 GPT-4o
      })
    });

    const result = await response.json();

    if (result.success && result.diagramCode) {
      extractedCode.value = result.diagramCode;
      mermaidCode.value = result.diagramCode;
      diagramGenerated.value = true;
      status.value = { type: 'success', message: '📊 流程图已提取！可以编辑了。' };
      
      await nextTick();
      await renderMermaid();
    } else if (result.success && result.text) {
      status.value = { type: 'success', message: '📝 ' + (result.text.substring(0, 100) + '...') };
    } else {
      status.value = { type: 'error', message: result.error || '图片分析失败' };
    }
  } catch (error) {
    status.value = { 
      type: 'error', 
      message: error instanceof Error ? error.message : '分析失败' 
    };
  } finally {
    isLoading.value = false;
  }
}

async function handleFileUpload(file: File) {
  isLoading.value = true;
  status.value = { type: 'loading', message: `📤 正在处理 ${file.name}...` };

  try {
    // 读取文件
    const reader = new FileReader();
    const imageData = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // 如果是图片，尝试提取流程图
    if (file.type.startsWith('image/')) {
      await handleFileAnalysis(imageData);
    } else {
      status.value = { type: 'error', message: '目前只支持图片文件分析' };
    }
  } catch (error) {
    status.value = { 
      type: 'error', 
      message: error instanceof Error ? error.message : '文件处理失败' 
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
  extractedCode.value = '';
  diagramGenerated.value = false;
  status.value = { type: '', message: '' };
}

function toggleEditor() {
  showEditor.value = !showEditor.value;
}

async function handleCodeUpdate(newCode: string) {
  mermaidCode.value = newCode;
  await nextTick();
  await renderMermaid();
}
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>🚀 FlowGen</h1>
      <p>AI驱动的智能图表生成器 - 输入描述，上传图片，一键生成流程图</p>
    </header>

    <div class="main-layout">
      <aside class="panel">
        <ModelSelector v-model="selectedModel" />
        <ChartTypeSelector v-model="selectedChartType" />
        <PromptInput 
          :is-loading="isLoading"
          @generate="handleGenerate"
        />

        <FileUploader 
          :is-loading="isLoading"
          @upload="handleFileUpload"
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
            class="tool-btn"
          >
            📋 复制代码
          </button>
          <button 
            v-if="diagramGenerated" 
            @click="toggleEditor"
            :class="['tool-btn', { active: showEditor }]"
          >
            ✏️ {{ showEditor ? '预览' : '编辑' }}
          </button>
          <button 
            v-if="diagramGenerated" 
            @click="handleClear"
            class="tool-btn"
          >
            🗑️ 清除
          </button>
        </div>

        <!-- 编辑模式 -->
        <div v-if="showEditor && diagramGenerated" class="editor-wrapper">
          <DiagramEditor 
            :code="mermaidCode"
            @update="handleCodeUpdate"
          />
        </div>

        <!-- 预览模式 -->
        <template v-else>
          <div v-if="!diagramGenerated" class="empty-state">
            <div class="icon">📊</div>
            <p>输入描述，或上传图片</p>
            <p>AI 将为你创建 Mermaid 图表</p>
            <p style="margin-top: 12px; font-size: 0.8rem; color: #94a3b8;">
              支持：流程图、时序图、甘特图、类图、状态图、ER图<br>
              上传图片可自动识别流程图并转换为可编辑版本
            </p>
          </div>

          <div 
            v-show="diagramGenerated" 
            id="mermaid-container" 
            class="mermaid"
          ></div>

          <pre 
            v-if="mermaidCode && diagramGenerated" 
            class="code-preview"
          >{{ mermaidCode }}</pre>
        </template>
      </main>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.tool-btn {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.tool-btn:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.tool-btn.active {
  background: #4f46e5;
  color: white;
  border-color: #4f46e5;
}

.editor-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.code-preview {
  margin-top: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
}
</style>