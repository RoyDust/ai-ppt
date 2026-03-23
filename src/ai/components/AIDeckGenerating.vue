<template>
  <div class="ai-generating">
    <div class="generating-shell">
      <div class="status-orb">
        <div class="orb-core"></div>
      </div>

      <div class="content">
        <div class="kicker">Render Pipeline</div>
        <div class="title">正在生成演示文稿</div>
        <div class="text">正在根据你修改后的规划稿进行二次 AI 制作，而不是直接把文本套进模板。</div>

        <div class="status-grid">
          <div class="status-card">
            <div class="status-label">执行方式</div>
            <div class="status-value">二次 AI 生成</div>
          </div>
          <div class="status-card">
            <div class="status-label">轮询频率</div>
            <div class="status-value">每 1 秒 1 次</div>
          </div>
          <div class="status-card" v-if="lastPolledAt">
            <div class="status-label">最近轮询</div>
            <div class="status-value">{{ lastPolledAt }}</div>
          </div>
          <div class="status-card">
            <div class="status-label">批次数量</div>
            <div class="status-value">{{ progress.totalBatches || 0 }}</div>
          </div>
        </div>

        <div v-if="progress.batches?.length" class="batch-list">
          <div
            v-for="batch in progress.batches"
            :key="batch.batchIndex"
            class="batch-card"
            :class="`status-${batch.status}`"
          >
            <div class="batch-title">Batch {{ batch.batchIndex + 1 }}</div>
            <div class="batch-meta">第 {{ batch.slideStart + 1 }}-{{ batch.slideEnd }} 页</div>
            <div class="batch-meta">状态：{{ batch.status }}</div>
            <div class="batch-meta">尝试次数：{{ batch.retryCount }}</div>
            <div v-if="batch.failureCategory" class="batch-error">{{ batch.failureCategory }}</div>
            <div v-if="batch.errorMessage" class="batch-error-detail">{{ batch.errorMessage }}</div>
          </div>
        </div>

        <div v-if="renderState === 'partial_success'" class="partial-error">
          {{ renderError || '部分批次生成失败，可重跑失败批次。' }}
        </div>

        <button
          v-if="canRetryFailedBatches"
          class="retry-button"
          type="button"
          @click="onRetryFailedBatches?.()"
        >
          重跑失败批次
        </button>

        <div class="note">保持窗口打开即可，生成完成后会自动回写到编辑器。</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AIRenderProgress } from '../types/deck'

defineProps<{
  lastPolledAt?: string
  progress: AIRenderProgress
  renderState?: 'idle' | 'loading' | 'success' | 'error' | 'partial_success'
  renderError?: string
  canRetryFailedBatches?: boolean
  onRetryFailedBatches?: () => void | Promise<void>
}>()
</script>

<style scoped lang="scss">
.ai-generating {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
}

.generating-shell {
  display: grid;
  justify-items: center;
  gap: 22px;
  width: min(720px, 100%);
  padding: 34px 28px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
}

.status-orb {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 999px;
  background: #fff6f3;
  box-shadow: 0 0 0 10px #fdf0ec;
}

.orb-core {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #d14424;
  box-shadow: 0 0 0 6px rgba(209, 68, 36, 0.12);
  animation: pulse 1.8s ease-in-out infinite;
}

.content {
  text-align: center;
}

.kicker {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #d14424;
}

.title {
  margin-top: 12px;
  font-size: 24px;
  font-weight: 700;
  color: #20262e;
}

.text,
.note,
.status-label {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.75;
  color: #6b7280;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 22px;
}

.batch-list {
  display: grid;
  gap: 12px;
  margin-top: 22px;
  text-align: left;
}

.batch-card {
  padding: 14px;
  border: 1px solid #eef0f3;
  border-radius: 10px;
  background: #fafafb;
}

.batch-title {
  font-weight: 700;
  color: #20262e;
}

.batch-meta,
.batch-error,
.batch-error-detail,
.partial-error {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: #6b7280;
}

.batch-error,
.partial-error {
  color: #b42318;
}

.retry-button {
  margin-top: 18px;
  padding: 10px 18px;
  border: 0;
  border-radius: 999px;
  background: #d14424;
  color: #fff;
  cursor: pointer;
}

.status-card {
  padding: 14px;
  border: 1px solid #eef0f3;
  border-radius: 10px;
  background: #fafafb;
}

.status-value {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #20262e;
}

.note {
  margin-top: 16px;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(0.92);
    opacity: 0.72;
  }

  50% {
    transform: scale(1.08);
    opacity: 1;
  }
}

@media (max-width: 780px) {
  .status-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .title {
    font-size: 22px;
  }
}
</style>
