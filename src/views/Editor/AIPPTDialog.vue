<template>
  <div class="aippt-dialog">
    <div class="loading-mask" v-if="isPlanning">
      <div class="loading-card">
        <div class="loading-kicker">Planning Lock</div>
        <div class="loading-title">{{ loadingText }}</div>
        <div class="loading-tip">AI 正在拆解主题并生成可编辑大纲，请不要重复提交。</div>
      </div>
    </div>

    <div class="dialog-shell">
      <header class="dialog-hero">
        <div class="hero-row compact">
          <div class="hero-brand">
            <div class="eyebrow">{{ meta.eyebrow }}</div>
            <h2 class="hero-title">AIPPT</h2>
            <span class="hero-badge">{{ meta.badgeLabel }}</span>
          </div>
          <p class="hero-subtitle">{{ meta.title }}</p>
        </div>
      </header>

      <div class="dialog-body">
        <main class="dialog-stage">
          <AIDeckSetupForm
            v-if="step === 'setup'"
            :topic="topic"
            :goalPageCount="goalPageCount"
            :language="language"
            :loading="isPlanning"
            @submit="createPlan"
          />

          <AIDeckOutlineReview
            v-else-if="step === 'outline'"
            :deck="editableDeck"
            :plannedPageCount="plannedPageCount"
            :loading="isRendering"
            @back="resetToSetup"
            @confirm="renderPlannedDeck"
            @update:outline-summary="updateOutlineSummary"
            @update:slide-title="updateSlideTitle"
            @update:slide-summary="updateSlideSummary"
            @update:slide-bullets="updateSlideBullets"
          />

          <AIDeckGenerating v-else :last-polled-at="lastPolledAt" />
        </main>

        <aside class="dialog-rail">
          <section class="rail-card rail-progress">
            <div class="rail-title">生成流程</div>
            <div class="workflow-list">
              <div
                v-for="item in meta.workflowSteps"
                :key="item.key"
                class="workflow-item"
                :class="{
                  active: item.key === meta.activeStep,
                  complete: workflowStatus(item.key) === 'complete',
                }"
              >
                <div class="workflow-dot"></div>
                <div>
                  <div class="workflow-label">{{ item.label }}</div>
                  <div class="workflow-description">{{ item.description }}</div>
                </div>
              </div>
            </div>
          </section>

          <section class="rail-card rail-summary">
            <div class="rail-title">当前配置</div>
            <div class="summary-list">
              <div class="summary-item" v-for="item in meta.summaryItems" :key="item.label">
                <div class="summary-label">{{ item.label }}</div>
                <div class="summary-value">{{ item.value }}</div>
              </div>
            </div>
            <div class="rail-inline">
              <div class="rail-subtitle">本阶段提示</div>
              <div class="guidance-list compact">
                <div class="guidance-item" v-for="item in meta.guidance" :key="item">
                  {{ item }}
                </div>
              </div>
            </div>
            <div class="rail-inline status-inline">
              <div class="rail-subtitle">系统状态</div>
              <div class="status-note">{{ meta.statusNote }}</div>
            </div>
          </section>
<!--
          <section class="rail-card rail-guidance">
            <div class="rail-title">本阶段提示</div>
            <div class="guidance-list">
              <div class="guidance-item" v-for="item in meta.guidance" :key="item">
                {{ item }}
              </div>
            </div>
          </section>

          <section class="rail-card rail-status">
            <div class="rail-title">系统状态</div>
            <div class="status-note">{{ meta.statusNote }}</div>
          </section>
-->
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AIDeckGenerating from '@/ai/components/AIDeckGenerating.vue'
import AIDeckOutlineReview from '@/ai/components/AIDeckOutlineReview.vue'
import AIDeckSetupForm from '@/ai/components/AIDeckSetupForm.vue'
import useAIDeckGeneration from '@/ai/hooks/useAIDeckGeneration'
import { getAIPPTDialogMeta } from '@/ai/utils/dialogStepMeta'

const {
  step,
  topic,
  goalPageCount,
  language,
  editableDeck,
  lastPolledAt,
  isPlanning,
  isRendering,
  loadingText,
  plannedPageCount,
  createPlan,
  renderPlannedDeck,
  resetToSetup,
  updateOutlineSummary,
  updateSlideTitle,
  updateSlideSummary,
  updateSlideBullets,
} = useAIDeckGeneration()

const meta = computed(() => getAIPPTDialogMeta({
  step: step.value,
  topic: topic.value,
  goalPageCount: goalPageCount.value,
  language: language.value,
  isPlanning: isPlanning.value,
  isRendering: isRendering.value,
  lastPolledAt: lastPolledAt.value,
}))

const workflowStatus = (itemStep: string) => {
  const order = ['setup', 'outline', 'generating']
  const currentIndex = order.indexOf(step.value)
  const targetIndex = order.indexOf(itemStep)

  if (targetIndex < currentIndex) return 'complete'
  if (targetIndex === currentIndex) return 'active'
  return 'upcoming'
}
</script>

<style scoped lang="scss">
.aippt-dialog {
  --shell-bg: linear-gradient(180deg, #fcfcfd 0%, #f7f8fa 100%);
  --panel-bg: #fff;
  --panel-border: #e5e7eb;
  --panel-strong: #ffffff;
  --text-main: #41464b;
  --text-muted: #6b7280;
  --text-soft: #9ca3af;
  --accent-primary: #d14424;
  --accent-primary-soft: rgba(209, 68, 36, 0.1);
  --accent-secondary: #2f7dd1;
  position: relative;
  margin: -20px;
  height: 100%;
  padding: 20px;
  color: var(--text-main);
  background: #f3f4f6;
}

.dialog-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--panel-border);
  border-radius: 14px;
  background: var(--shell-bg);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.dialog-shell::before {
  content: '';
  position: absolute;
  inset: 20px;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.65), rgba(255, 255, 255, 0));
  pointer-events: none;
}

.dialog-hero,
.dialog-body {
  position: relative;
  z-index: 1;
}

.dialog-hero {
  padding: 14px 18px;
  border-bottom: 1px solid var(--panel-border);
  background: linear-gradient(180deg, #ffffff, #fafafb);
}

.eyebrow {
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-primary);
}

.hero-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.hero-row.compact {
  justify-content: space-between;
}

.hero-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.hero-title {
  margin: 0;
  font-size: 22px;
  line-height: 1;
  letter-spacing: 0.02em;
  color: #20262e;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border: 1px solid #f1c3b7;
  border-radius: 999px;
  background: #fff6f3;
  font-size: 12px;
  color: var(--accent-primary);
}

.hero-subtitle {
  margin: 0;
  max-width: 420px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-muted);
  text-align: right;
}

.dialog-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 248px;
  gap: 14px;
  flex: 1;
  min-height: 0;
  padding: 14px;
}

.dialog-stage {
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  background: #fff;
}

.dialog-rail {
  display: grid;
  gap: 12px;
  min-height: 0;
  align-content: start;
  overflow: auto;
}

.rail-card {
  padding: 14px;
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  background: var(--panel-bg);
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.04);
}

.rail-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-soft);
}

.workflow-list,
.summary-list,
.guidance-list {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.workflow-item {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  gap: 10px;
  padding: 10px;
  border: 1px solid #eef0f3;
  border-radius: 10px;
  background: #fafafb;
}

.workflow-item.active {
  border-color: #f1c3b7;
  background: #fff6f3;
}

.workflow-item.complete {
  border-color: #ecd9d3;
}

.workflow-dot {
  width: 10px;
  height: 10px;
  margin-top: 6px;
  border-radius: 999px;
  background: #d1d5db;
  box-shadow: 0 0 0 4px #f3f4f6;
}

.workflow-item.active .workflow-dot {
  background: var(--accent-primary);
  box-shadow: 0 0 0 4px #fde7e1;
}

.workflow-item.complete .workflow-dot {
  background: #c98a7c;
  box-shadow: 0 0 0 4px #f7ece9;
}

.workflow-label,
.summary-value {
  font-size: 13px;
  font-weight: 600;
  color: #20262e;
}

.workflow-description,
.summary-label,
.guidance-item,
.status-note {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);
}

.summary-item {
  padding: 10px 12px;
  border-radius: 10px;
  background: #fafafb;
  border: 1px solid #eef0f3;
}

.summary-value {
  margin-top: 4px;
  word-break: break-word;
}

.guidance-item {
  position: relative;
  padding-left: 16px;
}

.guidance-item::before {
  content: '';
  position: absolute;
  top: 9px;
  left: 0;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--accent-primary);
}

.guidance-list.compact {
  gap: 8px;
}

.rail-inline {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f1f3;
}

.rail-subtitle {
  font-size: 12px;
  font-weight: 700;
  color: #41464b;
}

.status-inline .status-note {
  margin-top: 6px;
}

.loading-mask {
  position: absolute;
  inset: 20px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(4px);
}

.loading-card {
  min-width: 360px;
  max-width: 440px;
  padding: 24px 26px;
  border: 1px solid var(--panel-border);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
  text-align: center;
}

.loading-kicker {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent-primary);
}

.loading-title {
  margin-top: 12px;
  font-size: 19px;
  font-weight: 700;
  color: #20262e;
}

.loading-tip {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-muted);
}

:deep(.ai-setup-form),
:deep(.ai-outline-review),
:deep(.ai-generating) {
  height: 100%;
}

:deep(.ai-outline-review) {
  grid-template-rows: auto minmax(0, 1fr) auto;
}

:deep(.ai-outline-review .slides),
:deep(.ai-outline-review .slides-list) {
  min-height: 0;
}

@media (max-width: 1120px) {
  .dialog-body {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
  }

  .dialog-rail {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 780px) {
  .aippt-dialog {
    padding: 12px;
  }

  .dialog-shell::before {
    inset: 12px;
  }

  .dialog-hero {
    padding: 22px 20px 18px;
  }

  .hero-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .dialog-body {
    padding: 14px;
  }

  .dialog-rail {
    grid-template-columns: minmax(0, 1fr);
  }

  .hero-subtitle {
    max-width: none;
    text-align: left;
  }
}
</style>
