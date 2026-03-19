<template>
  <div class="ai-outline-review">
    <div class="summary-panel">
      <div>
        <div class="summary">已规划 {{ plannedPageCount }} 页</div>
        <div class="tip">此处编辑的是规划稿文案，后续 render 会严格基于这些内容生成 PPT。</div>
      </div>
      <div class="summary-field">
        <div class="field-label">全局摘要</div>
        <TextArea
          :value="deck?.outlineSummary || ''"
          :rows="3"
          :padding="10"
          resizable
          placeholder="请输入这份 PPT 的整体摘要"
          @update:value="$emit('update:outlineSummary', $event)"
        />
      </div>
    </div>

    <div class="slides" v-if="deck">
      <div class="slide-card" v-for="(slide, index) in deck.slides" :key="slide.id">
        <div class="slide-header">
          <div class="slide-index">第 {{ index + 1 }} 页</div>
          <div class="slide-kind">{{ slide.kind }}</div>
        </div>

        <div class="field">
          <div class="field-label">标题</div>
          <Input
            :value="slide.title || ''"
            placeholder="请输入页面标题"
            @update:value="$emit('update:slideTitle', slide.id, $event)"
          />
        </div>

        <div class="field">
          <div class="field-label">摘要</div>
          <TextArea
            :value="slide.summary || ''"
            :rows="3"
            :padding="10"
            resizable
            placeholder="请输入页面摘要"
            @update:value="$emit('update:slideSummary', slide.id, $event)"
          />
        </div>

        <div class="field">
          <div class="field-label">要点</div>
          <TextArea
            :value="toBulletText(slide.bullets)"
            :rows="4"
            :padding="10"
            resizable
            placeholder="每行一个要点"
            @update:value="$emit('update:slideBullets', slide.id, $event)"
          />
        </div>
      </div>
    </div>

    <div class="actions">
      <Button @click="$emit('back')">返回</Button>
      <Button type="primary" @click="$emit('confirm')">开始生成</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'
import TextArea from '@/components/TextArea.vue'
import type { AIDeck } from '../types/deck'

defineProps<{
  deck: AIDeck | null
  plannedPageCount: number
}>()

defineEmits<{
  back: []
  confirm: []
  'update:outlineSummary': [value: string]
  'update:slideTitle': [slideId: string, value: string]
  'update:slideSummary': [slideId: string, value: string]
  'update:slideBullets': [slideId: string, value: string]
}>()

const toBulletText = (bullets?: string[]) => (bullets ?? []).join('\n')
</script>

<style scoped lang="scss">
.ai-outline-review {
  display: grid;
  gap: 16px;
}

.summary-panel {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e6edf5;
  border-radius: 12px;
  background: #f8fbff;
}

.summary {
  font-size: 13px;
  font-weight: 600;
  color: #2c3e50;
}

.tip {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7a90;
}

.summary-field,
.field {
  display: grid;
  gap: 8px;
}

.field-label {
  font-size: 12px;
  font-weight: 600;
  color: #415a77;
}

.slides {
  display: grid;
  gap: 14px;
  max-height: 420px;
  overflow: auto;
  padding-right: 4px;
}

.slide-card {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e8edf3;
  border-radius: 12px;
  background: #fff;
}

.slide-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slide-index {
  font-size: 12px;
  font-weight: 700;
  color: #023047;
}

.slide-kind {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(33, 158, 188, 0.12);
  font-size: 12px;
  color: #219ebc;
  text-transform: capitalize;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
