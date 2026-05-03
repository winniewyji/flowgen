<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
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
const showEditor = ref(false);

// AI 分析结果
const analysisResult = ref<{
  success: boolean;
  results?: Array<{ filename: string; success: boolean; content?: string; type: string; error?: string }>;
  structuredOutput?: string;
  content?: { title: string; content: string };
} | null>(null);

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
  analysisResult.value = null;

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

// 处理文件上传
async function handleFileUpload(files: File[]) {
  isLoading.value = true;
  status.value = { type: 'loading', message: `📤 正在处理 ${files.length} 个文件...` };
  analysisResult.value = null;
  diagramGenerated.value = false;

  try {
    // 转换为 base64
    const fileDataList = await Promise.all(
      files.map(file => {
        return new Promise<{ name: string; data: string; mimeType: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              name: file.name,
              data: reader.result as string,
              mimeType: file.type
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      })
    );

    const response = await fetch('/api/upload/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: fileDataList,
        prompt: '请提取文档中的关键信息',
        outputFormat: 'text',
        model: 'minimax'
      })
    });

    const result = await response.json();

    if (result.success) {
      analysisResult.value = result;
      
      // 如果有结构化输出（流程图等），显示它
      if (result.structuredOutput && result.structuredOutput.includes('flowchart')) {
        mermaidCode.value = result.structuredOutput;
        diagramGenerated.value = true;
        status.value = { type: 'success', message: '📊 已生成流程图！' };
        await nextTick();
        await renderMermaid();
      } else if (result.results && result.results.length > 0) {
        status.value = { type: 'success', message: `📝 已分析 ${result.results.length} 个文件` };
      } else {
        status.value = { type: 'success', message: '✨ 文件处理完成！' };
      }
    } else {
      status.value = { type: 'error', message: result.error || '处理失败' };
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

// 处理 Confluence 拉取
async function handleConfluenceFetch(data: { url: string; prompt: string; outputFormat: string }) {
  isLoading.value = true;
  status.value = { type: 'loading', message: '🔍 正在获取 Confluence 内容...' };
  analysisResult.value = null;
  diagramGenerated.value = false;

  try {
    const response = await fetch('/api/confluence/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.success) {
      analysisResult.value = result;

      // 如果生成的结构化输出是流程图，显示它
      if (result.structuredOutput) {
        // 检测是否是 Mermaid 代码
        if (result.structuredOutput.includes('flowchart') || 
            result.structuredOutput.includes('sequenceDiagram') ||
            result.structuredOutput.includes('gantt')) {
          mermaidCode.value = result.structuredOutput;
          diagramGenerated.value = true;
          status.value = { type: 'success', message: '📊 流程图已生成！' };
          await nextTick();
          await renderMermaid();
        } else {
          status.value = { type: 'success', message: '✨ Confluence 内容已获取并分析！' };
        }
      } else if (result.content) {
        status.value = { type: 'success', message: '📄 已获取 Confluence 页面内容！' };
      } else {
        status.value = { type: 'success', message: '✨ 处理完成！' };
      }
    } else {
      status.value = { type: 'error', message: result.error || '获取失败' };
    }
  } catch (error) {
    status.value = { 
      type: 'error', 
      message: error instanceof Error ? error.message : '获取失败' 
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
  analysisResult.value = null;
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

// 复制分析结果
function copyAnalysisResult(content: string) {
  navigator.clipboard.writeText(content);
  status.value = { type: 'success', message: '📋 已复制到剪贴板！' };
}
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>🚀 FlowGen</h1>
      <p>AI驱动的智能文档分析器 - 上传文件或连接 Confluence，生成流程图、摘要、表格</p>
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
          @confluence="handleConfluenceFetch"
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
            v-if="diagramGenerated || analysisResult" 
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

        <!-- 分析结果展示 -->
        <div v-if="analysisResult && analysisResult.structuredOutput" class="result-section">
          <div class="result-header">
            <span>✨ AI 生成的输出</span>
          </div>
          <div v-if="analysisResult.structuredOutput.includes('flowchart') || analysisResult.structuredOutput.includes('sequenceDiagram')" class="mermaid-wrapper">
            <div id="mermaid-container" class="mermaid"></div>
          </div>
          <pre class="result-content">{{ analysisResult.structuredOutput }}</pre>
        </div>

        <!-- 预览模式 -->
        <template v-else-if="!analysisResult">
          <div v-if="!diagramGenerated" class="empty-state">
            <div class="icon">📊</div>
            <p>输入描述，上传文件，或连接 Confluence</p>
            <p>AI 将为你生成图表、摘要、表格等</p>
            <p style="margin-top: 12px; font-size: 0.8rem; color: #94a3b8;">
              支持文件：PDF, Excel, Word, CSV, 图片<br>
              支持输出：流程图、摘要、表格、大纲、思维导图
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

        <!-- 文件分析结果列表 -->
        <div v-if="analysisResult?.results?.length" class="analysis-results">
          <div class="results-header">📄 文件分析结果</div>
          <div v-for="(r, idx) in analysisResult.results" :key="idx" class="result-item">
            <div class="result-item-header">
              <span class="result-icon">📄</span>
              <span class="result-filename">{{ r.filename }}</span>
              <span :class="['result-status', r.success ? 'success' : 'error']">
                {{ r.success ? '✓' : '✗' }}
              </span>
            </div>
            <div v-if="r.success && r.content" class="result-body">
              <pre class="result-text">{{ r.content }}</pre>
              <button class="copy-btn" @click="copyAnalysisResult(r.content!)">📋 复制</button>
            </div>
            <div v-if="r.error" class="result-error">{{ r.error }}</div>
          </div>
        </div>
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

.result-section {
  margin-top: 16px;
}

.result-header {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #eef2ff;
  border-radius: 6px;
}

.mermaid-wrapper {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.result-content {
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre-wrap;
}

.analysis-results {
  margin-top: 16px;
}

.results-header {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 12px;
}

.result-item {
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid var(--border);
}

.result-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.result-icon {
  font-size: 1rem;
}

.result-filename {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
}

.result-status {
  font-size: 0.875rem;
}

.result-status.success {
  color: #10b981;
}

.result-status.error {
  color: #ef4444;
}

.result-body {
  position: relative;
}

.result-text {
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
  font-size: 0.8rem;
  line-height: 1.5;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
}

.copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: white;
  font-size: 0.7rem;
  cursor: pointer;
}

.copy-btn:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.result-error {
  padding: 8px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 4px;
  font-size: 0.75rem;
}
</style>