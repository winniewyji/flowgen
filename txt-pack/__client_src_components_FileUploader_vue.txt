<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'upload', files: File[]): void;
  (e: 'confluence', data: { url: string; prompt: string; outputFormat: string }): void;
}>();

// 文件上传状态
const isDragOver = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const selectedFiles = ref<File[]>([]);

// Confluence 配置
const showConfluence = ref(false);
const confluenceUrl = ref('');
const confluencePrompt = ref('');
const confluenceOutputFormat = ref('summary');

// 输出格式选项
const outputFormats = [
  { id: 'flowchart', name: '📊 流程图', icon: '📝' },
  { id: 'summary', name: '📋 摘要', icon: '📄' },
  { id: 'table', name: '📉 表格', icon: '📊' },
  { id: 'outline', name: '📑 大纲', icon: '📃' },
  { id: 'mindmap', name: '🧠 思维导图', icon: '💡' },
  { id: 'text', name: '📝 纯文本', icon: '📝' }
];

const supportedFormats = '.pdf,.xlsx,.xls,.doc,.docx,.csv,.txt,.md,.jpg,.jpeg,.png,.gif,.webp,.svg';

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  isDragOver.value = true;
}

function handleDragLeave() {
  isDragOver.value = false;
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  isDragOver.value = false;
  
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    addFiles(Array.from(files));
  }
}

function handleClick() {
  fileInput.value?.click();
}

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  if (files && files.length > 0) {
    addFiles(Array.from(files));
    target.value = '';
  }
}

function addFiles(newFiles: File[]) {
  selectedFiles.value = [...selectedFiles.value, ...newFiles];
}

function removeFile(index: number) {
  selectedFiles.value = selectedFiles.value.filter((_, i) => i !== index);
}

function clearFiles() {
  selectedFiles.value = [];
}

async function handleUpload() {
  if (selectedFiles.value.length > 0) {
    emit('upload', selectedFiles.value);
  }
}

function handleConfluenceSubmit() {
  if (confluenceUrl.value.trim()) {
    emit('confluence', {
      url: confluenceUrl.value.trim(),
      prompt: confluencePrompt.value,
      outputFormat: confluenceOutputFormat.value
    });
  }
}

const fileCount = computed(() => selectedFiles.value.length);
const fileSize = computed(() => {
  const bytes = selectedFiles.value.reduce((sum, f) => sum + f.size, 0);
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
});
</script>

<template>
  <div class="upload-section">
    <div class="section-header">
      <span>📎 上传文件</span>
      <button class="toggle-btn" @click="showConfluence = !showConfluence">
        {{ showConfluence ? '收起' : '🔗 Confluence' }}
      </button>
    </div>

    <!-- 文件上传区域 -->
    <div 
      :class="['upload-area', { 'drag-over': isDragOver, 'loading': isLoading }]"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="handleClick"
    >
      <input 
        ref="fileInput"
        type="file" 
        :accept="supportedFormats"
        class="file-input"
        multiple
        @change="handleFileChange"
      />
      
      <div v-if="isLoading" class="upload-loading">
        <span class="spinner">⏳</span>
        <span>处理中...</span>
      </div>
      
      <div v-else class="upload-placeholder">
        <span class="upload-icon">📁</span>
        <span class="upload-text">拖拽文件到这里，或点击选择</span>
        <span class="upload-formats">支持: PDF, Excel, Word, CSV, TXT, 图片</span>
      </div>
    </div>

    <!-- 已选文件列表 -->
    <div v-if="fileCount > 0" class="file-list">
      <div class="file-list-header">
        <span>已选 {{ fileCount }} 个文件 ({{ fileSize }})</span>
        <button class="clear-btn" @click="clearFiles">清除</button>
      </div>
      <div class="file-items">
        <div v-for="(file, index) in selectedFiles" :key="index" class="file-item">
          <span class="file-icon">📄</span>
          <span class="file-name">{{ file.name }}</span>
          <button class="remove-btn" @click.stop="removeFile(index)">×</button>
        </div>
      </div>
      <button 
        class="btn btn-primary upload-btn"
        :disabled="isLoading"
        @click="handleUpload"
      >
        🚀 开始处理 {{ fileCount }} 个文件
      </button>
    </div>

    <!-- 文件类型提示 -->
    <div class="upload-features">
      <div class="feature-tag">📄 PDF</div>
      <div class="feature-tag">📊 Excel</div>
      <div class="feature-tag">📝 Word</div>
      <div class="feature-tag">📋 CSV</div>
      <div class="feature-tag">🖼️ 图片</div>
      <div class="feature-tag">📝 TXT</div>
    </div>

    <!-- Confluence 连接区域 -->
    <div v-if="showConfluence" class="confluence-section">
      <div class="confluence-header">🔗 从 Confluence 获取内容</div>
      
      <div class="form-group">
        <label>页面或 Space URL</label>
        <input 
          v-model="confluenceUrl"
          type="text"
          placeholder="https://xxx.atlassian.net/wiki/spaces/XXX/pages/123456"
          class="input"
        />
      </div>

      <div class="form-group">
        <label>处理提示词</label>
        <textarea 
          v-model="confluencePrompt"
          placeholder="例如：提取关键技术架构和依赖关系，生成流程图"
          class="textarea"
        ></textarea>
      </div>

      <div class="form-group">
        <label>输出格式</label>
        <div class="format-grid">
          <button
            v-for="format in outputFormats"
            :key="format.id"
            :class="['format-btn', { active: confluenceOutputFormat === format.id }]"
            @click="confluenceOutputFormat = format.id"
          >
            {{ format.name }}
          </button>
        </div>
      </div>

      <button 
        class="btn btn-primary"
        :disabled="!confluenceUrl.trim() || isLoading"
        @click="handleConfluenceSubmit"
      >
        🔍 获取并分析 Confluence
      </button>
    </div>
  </div>
</template>

<style scoped>
.upload-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.toggle-btn {
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: white;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.upload-area {
  border: 2px dashed var(--border);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: #fafafa;
}

.upload-area:hover {
  border-color: var(--primary);
  background: #f5f5ff;
}

.upload-area.drag-over {
  border-color: var(--primary);
  background: #eef2ff;
  transform: scale(1.01);
}

.upload-area.loading {
  opacity: 0.7;
  cursor: not-allowed;
}

.file-input {
  display: none;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.upload-icon {
  font-size: 1.8rem;
}

.upload-text {
  font-size: 0.875rem;
  color: var(--text);
}

.upload-formats {
  font-size: 0.7rem;
  color: #94a3b8;
}

.upload-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--primary);
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.file-list {
  margin-top: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.file-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.clear-btn {
  padding: 2px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: white;
  font-size: 0.7rem;
  cursor: pointer;
}

.clear-btn:hover {
  background: #fee2e2;
  border-color: #ef4444;
  color: #ef4444;
}

.file-items {
  max-height: 120px;
  overflow-y: auto;
  margin-bottom: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  background: white;
  border-radius: 4px;
  margin-bottom: 4px;
  font-size: 0.75rem;
}

.file-icon {
  font-size: 0.875rem;
}

.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-btn {
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: #e2e8f0;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-btn:hover {
  background: #ef4444;
  color: white;
}

.upload-btn {
  margin-top: 8px;
  font-size: 0.8rem;
  padding: 10px 16px;
}

.upload-features {
  display: flex;
  gap: 6px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.feature-tag {
  padding: 4px 8px;
  background: #f0f0f5;
  border-radius: 4px;
  font-size: 0.7rem;
  color: var(--text-secondary);
}

/* Confluence Section */
.confluence-section {
  margin-top: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid var(--border);
}

.confluence-header {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 12px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.8rem;
}

.input:focus {
  outline: none;
  border-color: var(--primary);
}

.textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.8rem;
  min-height: 60px;
  resize: vertical;
  font-family: inherit;
}

.textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.format-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.format-btn {
  padding: 6px 4px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: white;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.format-btn:hover {
  border-color: var(--primary);
}

.format-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
</style>