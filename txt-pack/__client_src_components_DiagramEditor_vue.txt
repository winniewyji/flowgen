<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

const props = defineProps<{
  code: string;
}>();

const emit = defineEmits<{
  (e: 'update', code: string): void;
}>();

const localCode = ref(props.code);
const isDragging = ref(false);

// 监听外部代码变化
watch(() => props.code, (newCode) => {
  localCode.value = newCode;
});

function handleInput(e: Event) {
  const target = e.target as HTMLTextAreaElement;
  localCode.value = target.value;
  emit('update', localCode.value);
}

// 节点操作
function addNode(type: 'default' | 'decision' | 'subroutine') {
  const id = 'N' + Date.now().toString(36);
  let nodeCode = '';
  
  switch (type) {
    case 'decision':
      nodeCode = `\n    ${id}{判断节点}`;
      break;
    case 'subroutine':
      nodeCode = `\n    ${id}[子流程]`;
      break;
    default:
      nodeCode = `\n    ${id}[新节点]`;
  }
  
  localCode.value += nodeCode;
  emit('update', localCode.value);
}

// 添加连接
function addConnection(from: string, to: string, label?: string) {
  const conn = label 
    ? `\n    ${from} -->|"${label}"| ${to}`
    : `\n    ${from} --> ${to}`;
  
  localCode.value += conn;
  emit('update', localCode.value);
}

// 常用模板
const templates = [
  { name: '开始/结束', code: 'flowchart TD\n    A([开始]) --> B[处理]\n    B --> C([结束])' },
  { name: '判断流程', code: 'flowchart TD\n    A([开始]) --> B{判断?}\n    B -->|是| C[成功]\n    B -->|否| D[失败]\n    C --> E([结束])\n    D --> E' },
  { name: '并行流程', code: 'flowchart LR\n    A[任务A] -->|并行| B[任务B1]\n    A -->|并行| C[任务B2]\n    B --> D[合并]\n    C --> D\n    D --> E([结束])' }
];

function useTemplate(code: string) {
  localCode.value = code;
  emit('update', localCode.value);
}

// 快速格式化
function formatCode() {
  const lines = localCode.value.split('\n');
  const formatted = lines.map(line => {
    // 清理多余空格但保持结构
    return line.trim();
  }).filter(line => line.length > 0).join('\n');
  
  localCode.value = formatted;
  emit('update', localCode.value);
}
</script>

<template>
  <div class="diagram-editor">
    <div class="editor-header">
      <span>✏️ Mermaid 代码编辑器</span>
      <div class="editor-actions">
        <button class="action-btn" @click="formatCode" title="格式化">🔧 格式化</button>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-group">
        <span class="toolbar-label">添加节点：</span>
        <button class="toolbar-btn" @click="addNode('default')">📦 普通</button>
        <button class="toolbar-btn" @click="addNode('decision')">⬨ 判断</button>
        <button class="toolbar-btn" @click="addNode('subroutine')">📋 子流程</button>
      </div>
    </div>

    <!-- 模板快捷选择 -->
    <div class="template-section">
      <span class="template-label">📝 快捷模板：</span>
      <button 
        v-for="t in templates" 
        :key="t.name"
        class="template-btn"
        @click="useTemplate(t.code)"
      >
        {{ t.name }}
      </button>
    </div>

    <!-- 代码编辑区 -->
    <textarea
      :value="localCode"
      @input="handleInput"
      class="code-editor"
      placeholder="输入 Mermaid 代码，或使用上述工具添加节点..."
      spellcheck="false"
    ></textarea>

    <!-- 语法提示 -->
    <div class="syntax-help">
      <details>
        <summary>📖 Mermaid 语法提示</summary>
        <div class="help-content">
          <p><strong>节点形状：</strong></p>
          <ul>
            <li><code>A[文本]</code> - 圆角矩形 (过程)</li>
            <li><code>A(文本)</code> - 胶囊形 (开始/结束)</li>
            <li><code>A{文本}</code> - 菱形 (判断)</li>
            <li><code>A[[文本]]</code> - 矩形 (子程序)</li>
            <li><code>A((文本))</code> - 圆形 (连接器)</li>
          </ul>
          <p><strong>连接线：</strong></p>
          <ul>
            <li><code>--></code> - 实线箭头</li>
            <li><code>---</code> - 实线无箭头</li>
            <li><code>-.-></code> - 虚线箭头</li>
            <li><code>==></code> - 粗箭头</li>
            <li><code>|标签|</code> - 连接线上加标签</li>
          </ul>
          <p><strong>示例：</strong></p>
          <pre>flowchart TD
    A([开始]) --> B[输入数据]
    B --> C{验证成功?}
    C -->|是| D[处理]
    C -->|否| E[报错]
    D --> F([结束])
    E --> F</pre>
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
.diagram-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 400px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f1f5f9;
  border-radius: 8px 8px 0 0;
  font-size: 0.875rem;
  font-weight: 500;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: white;
  font-size: 0.75rem;
  cursor: pointer;
}

.action-btn:hover {
  background: var(--primary);
  color: white;
}

.editor-toolbar {
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  background: #f8fafc;
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.toolbar-btn {
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: white;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.template-section {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #fafafa;
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
  flex-wrap: wrap;
}

.template-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.template-btn {
  padding: 4px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: white;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s;
}

.template-btn:hover {
  background: #eef2ff;
  border-color: var(--primary);
  color: var(--primary);
}

.code-editor {
  flex: 1;
  padding: 16px;
  border: none;
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: none;
  background: #ffffff;
  min-height: 200px;
}

.code-editor:focus {
  outline: none;
  background: #fff;
}

.syntax-help {
  padding: 8px 12px;
  background: #f1f5f9;
  border-radius: 0 0 8px 8px;
  font-size: 0.75rem;
}

.syntax-help details {
  cursor: pointer;
}

.syntax-help summary {
  font-weight: 500;
  color: var(--text-secondary);
}

.help-content {
  margin-top: 8px;
  padding: 12px;
  background: white;
  border-radius: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.help-content p {
  margin: 0 0 8px 0;
}

.help-content ul {
  margin: 0 0 12px 0;
  padding-left: 20px;
}

.help-content code {
  background: #f1f5f9;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.8em;
}

.help-content pre {
  background: #1e293b;
  color: #e2e8f0;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.75rem;
}
</style>