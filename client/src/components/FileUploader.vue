<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'upload', file: File): void;
}>();

const isDragOver = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

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
    emit('upload', files[0]);
  }
}

function handleClick() {
  fileInput.value?.click();
}

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  if (files && files.length > 0) {
    emit('upload', files[0]);
    // 重置 input 以便再次选择同一文件
    target.value = '';
  }
}

const supportedFormats = '.jpg,.jpeg,.png,.gif,.webp,.svg';
</script>

<template>
  <div class="upload-section">
    <div class="upload-label">
      <span>📎 上传文件</span>
      <span class="upload-hint">支持图片自动提取流程图</span>
    </div>
    
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
        @change="handleFileChange"
      />
      
      <div v-if="isLoading" class="upload-loading">
        <span class="spinner">⏳</span>
        <span>处理中...</span>
      </div>
      
      <div v-else class="upload-placeholder">
        <span class="upload-icon">📷</span>
        <span class="upload-text">拖拽图片到这里，或点击选择</span>
        <span class="upload-formats">支持: JPG, PNG, GIF, WebP, SVG</span>
      </div>
    </div>

    <div class="upload-features">
      <div class="feature-tag">🔍 识别流程图</div>
      <div class="feature-tag">✏️ 转可编辑</div>
      <div class="feature-tag">📊 提取数据</div>
    </div>
  </div>
</template>

<style scoped>
.upload-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}

.upload-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.upload-hint {
  font-size: 0.75rem;
  color: #94a3b8;
}

.upload-area {
  border: 2px dashed var(--border);
  border-radius: 12px;
  padding: 24px;
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
  transform: scale(1.02);
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
  gap: 8px;
}

.upload-icon {
  font-size: 2rem;
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
</style>