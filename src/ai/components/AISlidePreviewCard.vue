<template>
  <div class="ai-slide-preview-card">
    <div v-if="label" class="label">{{ label }}</div>
    <div class="title">{{ slide.title }}</div>
    <div v-if="slide.summary" class="summary">{{ slide.summary }}</div>
    <ul v-if="slide.bullets?.length" class="bullets">
      <li v-for="bullet in slide.bullets" :key="bullet">{{ bullet }}</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { AISlide } from '../types/slide'

defineProps<{
  slide: AISlide
  label?: string
}>()
</script>

<style scoped lang="scss">
.ai-slide-preview-card {
  height: 100%;
  padding: 16px;
  border: 1px solid #d8e0ea;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.label {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  margin-bottom: 12px;
  border-radius: 999px;
  background: #eef3f8;
  color: #41556b;
  font-size: 12px;
  font-weight: 600;
}

.title {
  color: #132238;
  font-weight: 600;
  font-size: 16px;
  line-height: 1.5;
}

.summary {
  margin-top: 10px;
  color: #5c6c80;
  line-height: 1.6;
}

.bullets {
  margin: 12px 0 0;
  padding-left: 20px;
  color: #314254;
  line-height: 1.7;
}
</style>
