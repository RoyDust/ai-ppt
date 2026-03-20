<template>
  <div class="ai-slide-regenerate-dialog">
    <div class="header">
      <div class="eyebrow">Single Slide Compare</div>
      <div class="title-row">
        <div class="title">重新生成此页</div>
        <div class="status-chip">待确认替换</div>
      </div>
      <div class="subtitle">查看当前页与 AI 新方案的实际版面对比，确认后再覆盖。</div>
      <div class="summary-pills">
        <div class="summary-pill">{{ titleStatus }}</div>
        <div class="summary-pill">{{ bulletStatus }}</div>
        <div class="summary-pill">{{ structureStatus }}</div>
      </div>
    </div>

    <div class="compare-grid">
      <div class="compare-panel">
        <div class="panel-label">当前页面</div>
        <ThumbnailSlide v-if="currentPPTSlide" class="slide-preview" :slide="currentPPTSlide" :size="620" />
        <div v-else class="empty panel-empty">当前页面暂不可预览</div>
      </div>

      <div class="compare-panel">
        <div class="panel-label">新生成页面</div>
        <div v-if="regenerating" class="panel-loading">
          <div class="loading-dot"></div>
          <div class="loading-text">正在生成新页面...</div>
        </div>
        <ThumbnailSlide v-else-if="previewPPTSlide" class="slide-preview" :slide="previewPPTSlide" :size="620" />
        <div v-else class="empty panel-empty">正在准备新方案...</div>
      </div>
    </div>

    <div class="actions">
      <Button :disabled="regenerating || accepting" @click="rejectResult()">拒绝结果</Button>
      <Button :disabled="regenerating || accepting || !canRetry" @click="retryRegeneration()">
        {{ regenerating ? '正在重新生成...' : '重新来一次' }}
      </Button>
      <Button type="primary" :disabled="!previewSlide || accepting || regenerating" @click="replaceCurrent()">
        {{ accepting ? '正在替换...' : '替换为新页' }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import { useAIDeckStore } from '@/ai/stores/aiDeck'
import { renderAISlideToPPTistSlide } from '@/ai/adapters/renderSlide'
import Button from '@/components/Button.vue'
import message from '@/utils/message'
import ThumbnailSlide from '@/views/components/ThumbnailSlide/index.vue'
import useAISlideRegeneration from '../hooks/useAISlideRegeneration'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const aiDeckStore = useAIDeckStore()
const { aiSlideRegenerateContext, showAISlideRegenerateDialog } = storeToRefs(mainStore)
const { previewSlide, regenerateCurrentSlide, rerunPreview, acceptPreviewReplaceCurrent, clearPreview } = useAISlideRegeneration()
const accepting = ref(false)
const regenerating = ref(false)
const currentPPTSlide = computed(() => slidesStore.currentSlide ?? null)
const canRetry = computed(() => Boolean(aiSlideRegenerateContext.value?.deckId && aiSlideRegenerateContext.value?.slideId))
const currentAISlide = computed(() => {
  const slideId = aiSlideRegenerateContext.value?.slideId
  if (!slideId) return null
  return aiDeckStore.renderedDeck?.slides.find(slide => slide.id === slideId) ?? null
})
const previewPPTSlide = computed(() => {
  if (!previewSlide.value || !currentPPTSlide.value) return null
  return renderAISlideToPPTistSlide(previewSlide.value, currentPPTSlide.value)
})
const titleStatus = computed(() => {
  if (!previewSlide.value?.title) return '标题待生成'
  if (!currentAISlide.value?.title) return '标题已生成'
  return previewSlide.value.title !== currentAISlide.value.title ? '标题已重写' : '标题保持一致'
})
const bulletStatus = computed(() => {
  const currentCount = currentAISlide.value?.bullets?.length ?? 0
  const nextCount = previewSlide.value?.bullets?.length ?? 0
  if (!previewSlide.value) return '要点待生成'
  if (!currentCount && nextCount) return `新增 ${nextCount} 条要点`
  if (currentCount === nextCount) return `保留 ${nextCount} 条要点`
  return `要点 ${currentCount} → ${nextCount}`
})
const structureStatus = computed(() => {
  const nextSections = previewSlide.value?.bodySections?.length ?? 0
  if (!previewSlide.value) return '结构待分析'
  return nextSections ? `分节 ${nextSections} 组` : '单页结构已重排'
})

const close = () => {
  mainStore.setAISlideRegenerateDialogState(false)
  mainStore.setAISlideRegenerateContext(null)
  clearPreview()
}

const rejectResult = () => {
  close()
}

const requestPreview = async (mode: 'initial' | 'retry') => {
  regenerating.value = true
  try {
    if (mode === 'retry') {
      const retried = await rerunPreview()
      if (!retried) {
        message.error('当前结果暂时无法重新生成，请关闭后重试')
      }
      return
    }

    const deckId = aiSlideRegenerateContext.value?.deckId
    const slideId = aiSlideRegenerateContext.value?.slideId
    if (!deckId || !slideId) return
    await regenerateCurrentSlide({ deckId, slideId })
  }
  catch (error) {
    const text = error instanceof Error
      ? error.message
      : mode === 'retry'
        ? '重新生成失败，请稍后重试'
        : '单页预览生成失败，请稍后重试'
    message.error(text)
  }
  finally {
    regenerating.value = false
  }
}

const retryRegeneration = async () => {
  if (regenerating.value || accepting.value) return
  await requestPreview('retry')
}

const replaceCurrent = async () => {
  if (accepting.value || regenerating.value) return

  accepting.value = true
  try {
    const accepted = await acceptPreviewReplaceCurrent()
    if (!accepted) {
      message.error('当前页面暂时无法替换，请先确认演示文稿已保存')
      return
    }
    close()
  }
  catch (error) {
    const text = error instanceof Error ? error.message : '单页替换失败，请稍后重试'
    message.error(text)
  }
  finally {
    accepting.value = false
  }
}

watch(
  () => [showAISlideRegenerateDialog.value, aiSlideRegenerateContext.value?.deckId, aiSlideRegenerateContext.value?.slideId] as const,
  async ([visible, deckId, slideId]) => {
    if (!visible || !deckId || !slideId) return

    clearPreview()
    await requestPreview('initial')
  },
  { immediate: true },
)
</script>

<style scoped lang="scss">
.ai-slide-regenerate-dialog {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.header {
  display: grid;
  gap: 8px;
  padding: 2px 0 4px;
}

.eyebrow {
  color: #6c7c90;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.title {
  font-size: 17px;
  font-weight: 600;
  color: #132238;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border: 1px solid #d7e4f2;
  border-radius: 999px;
  background: #f6f9fc;
  color: #45607a;
  font-size: 12px;
  font-weight: 600;
}

.subtitle,
.empty {
  color: #66788a;
}

.summary-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.summary-pill {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 6px 12px;
  border-radius: 999px;
  background: linear-gradient(180deg, #f7f9fc 0%, #edf3f9 100%);
  color: #253a51;
  font-size: 12px;
  font-weight: 600;
}

.compare-grid {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 14px;
  min-height: 0;
  overflow: hidden;
}

.compare-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}

.panel-label {
  width: min(100%, 648px);
  margin-bottom: 8px;
  color: #32465d;
  font-size: 13px;
  font-weight: 600;
}

.slide-preview {
  width: fit-content;
  max-width: 100%;
  padding: 12px;
  border: 1px solid #d8e0ea;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
  overflow: auto;
}

.panel-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px;
  border: 1px dashed #cfd8e3;
  border-radius: 14px;
  background: #f8fafc;
  flex: 1;
}

.panel-loading {
  display: flex;
  flex: 1;
  width: min(100%, 648px);
  min-height: 220px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px dashed #cfd8e3;
  border-radius: 14px;
  background: linear-gradient(180deg, #fbfdff 0%, #f3f7fb 100%);
}

.loading-dot {
  width: 34px;
  height: 34px;
  border: 3px solid #dbe6f1;
  border-top-color: #4d86c6;
  border-radius: 50%;
  animation: ai-slide-spin 0.9s linear infinite;
}

.loading-text {
  color: #5b7189;
  font-size: 13px;
  font-weight: 600;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid #e6edf5;
}

@media (max-width: 960px) {
  .ai-slide-regenerate-dialog {
    gap: 10px;
  }
}

@keyframes ai-slide-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
