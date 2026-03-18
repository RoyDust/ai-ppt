<template>
  <div class="ai-slide-regenerate-dialog">
    <div class="header">
      <div class="title">重新生成此页</div>
      <div class="subtitle">先生成预览，再决定是否替换当前页或插入到后面。</div>
    </div>

    <AISlidePreviewCard v-if="previewSlide" :slide="previewSlide" />
    <div v-else class="empty">正在准备预览...</div>

    <div class="actions">
      <Button @click="close()">关闭</Button>
      <Button type="primary" @click="close()">替换当前页</Button>
      <Button @click="close()">插入到当前页后</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/store'
import Button from '@/components/Button.vue'
import AISlidePreviewCard from './AISlidePreviewCard.vue'
import useAISlideRegeneration from '../hooks/useAISlideRegeneration'

const mainStore = useMainStore()
const { aiSlideRegenerateContext } = storeToRefs(mainStore)
const { previewSlide, regenerateCurrentSlide, clearPreview } = useAISlideRegeneration()

const close = () => {
  mainStore.setAISlideRegenerateDialogState(false)
  mainStore.setAISlideRegenerateContext(null)
  clearPreview()
}

onMounted(() => {
  if (aiSlideRegenerateContext.value) {
    regenerateCurrentSlide(aiSlideRegenerateContext.value)
  }
})
</script>

<style scoped lang="scss">
.ai-slide-regenerate-dialog {
  display: grid;
  gap: 16px;
}

.title {
  font-size: 18px;
  font-weight: 600;
}

.subtitle,
.empty {
  color: #666;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
