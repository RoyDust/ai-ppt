<template>
  <div class="ai-outline-review">
    <div class="summary">已规划 {{ plannedPageCount }} 页</div>
    <ul class="outline-list">
      <li v-for="slide in slides" :key="slide.id">{{ slide.title || slide.kind }}</li>
    </ul>
    <div class="actions">
      <Button @click="$emit('back')">返回</Button>
      <Button type="primary" @click="$emit('confirm')">开始生成</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from '@/components/Button.vue'
import type { AISlide } from '../types/slide'

defineProps<{
  slides: AISlide[]
  plannedPageCount: number
}>()

defineEmits<{
  back: []
  confirm: []
}>()
</script>

<style scoped lang="scss">
.ai-outline-review {
  display: grid;
  gap: 12px;
}

.summary {
  font-size: 13px;
  color: #666;
}

.outline-list {
  margin: 0;
  padding-left: 20px;
  max-height: 320px;
  overflow: auto;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
