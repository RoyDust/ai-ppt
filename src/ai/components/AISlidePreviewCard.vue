<template>
  <div class="ai-slide-preview-card">
    <div class="title">{{ slide.title }}</div>
    <ul v-if="slide.bullets?.length" class="bullets">
      <li v-for="bullet in slide.bullets" :key="bullet">{{ bullet }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { AISlide } from '../types/slide'

defineProps<{
  slide: AISlide
}>()
</script>

<style scoped lang="scss">
.ai-slide-preview-card {
  padding: 16px;
  border: 1px solid $borderColor;
  border-radius: $borderRadius;
}

.title {
  font-weight: 600;
}

.bullets {
  margin: 12px 0 0;
  padding-left: 20px;
}
</style>
