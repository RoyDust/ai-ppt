<template>
  <div class="aippt-dialog">
    <div class="header">
      <span class="title">AIPPT</span>
      <span class="subtitle" v-if="step === 'setup'">先规划，再确认大纲，最后触发生成。</span>
      <span class="subtitle" v-else-if="step === 'outline'">确认 AI 规划的大纲后，再开始渲染。</span>
      <span class="subtitle" v-else>生成中，当前不会直接写入编辑器。</span>
    </div>

    <AIDeckSetupForm
      v-if="step === 'setup'"
      :topic="topic"
      :goalPageCount="goalPageCount"
      :language="language"
      @submit="createPlan"
    />

    <AIDeckOutlineReview
      v-else-if="step === 'outline'"
      :deck="editableDeck"
      :plannedPageCount="plannedPageCount"
      @back="resetToSetup"
      @confirm="renderPlannedDeck"
      @update:outline-summary="updateOutlineSummary"
      @update:slide-title="updateSlideTitle"
      @update:slide-summary="updateSlideSummary"
      @update:slide-bullets="updateSlideBullets"
    />

    <AIDeckGenerating v-else :last-polled-at="lastPolledAt" />
  </div>
</template>

<script setup lang="ts">
import AIDeckGenerating from '@/ai/components/AIDeckGenerating.vue'
import AIDeckOutlineReview from '@/ai/components/AIDeckOutlineReview.vue'
import AIDeckSetupForm from '@/ai/components/AIDeckSetupForm.vue'
import useAIDeckGeneration from '@/ai/hooks/useAIDeckGeneration'

const {
  step,
  topic,
  goalPageCount,
  language,
  editableDeck,
  lastPolledAt,
  plannedPageCount,
  createPlan,
  renderPlannedDeck,
  resetToSetup,
  updateOutlineSummary,
  updateSlideTitle,
  updateSlideSummary,
  updateSlideBullets,
} = useAIDeckGeneration()
</script>

<style scoped lang="scss">
.aippt-dialog {
  margin: -20px;
  padding: 30px;
}

.header {
  margin-bottom: 16px;
}

.title {
  margin-right: 8px;
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(270deg, #d897fd, #33bcfc);
  background-clip: text;
  color: transparent;
}

.subtitle {
  font-size: 12px;
  color: #888;
}
</style>
