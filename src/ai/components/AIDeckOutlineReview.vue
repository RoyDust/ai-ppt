<template>
  <div class="ai-outline-review">
    <section class="overview-card panel">
      <div class="overview-head">
        <div>
          <div class="section-kicker">Outline Control</div>
          <div class="summary">已规划 {{ plannedPageCount }} 页</div>
          <div class="tip">此处编辑的是策划稿与页面草稿，后续 render 会严格基于这些内容生成 PPT。</div>
        </div>
        <div class="overview-chip">先校稿，再生成</div>
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
    </section>

    <section class="slides-list slides" v-if="deck">
      <div class="slide-card panel" v-for="(slide, index) in deck.slides" :key="slide.id">
        <div class="slide-header">
          <div class="slide-meta">
            <div class="slide-index">第 {{ index + 1 }} 页</div>
            <div class="slide-divider"></div>
            <div class="slide-kind">{{ slide.kind }}</div>
          </div>
          <div class="slide-label">AI 规划块</div>
        </div>

        <div class="field">
          <div class="field-label">标题</div>
          <Input
            :value="slide.title || ''"
            placeholder="请输入页面标题"
            @update:value="$emit('update:slideTitle', slide.id, $event)"
          />
        </div>

        <div class="field two-col">
          <div class="field-panel">
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

          <div class="field-panel">
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

        <div class="planning-panel">
          <div class="planning-head">
            <div>
              <div class="field-label">策划稿</div>
              <div class="planning-tip">先锁定这页的目标、核心判断、支撑信息和表达方向，再进入最终生成。</div>
            </div>
            <div class="planning-chip">Planning Draft</div>
          </div>

          <div class="field two-col">
            <div class="field-panel">
              <div class="field-label">页目标</div>
              <TextArea
                :value="slide.planningDraft?.pageGoal || ''"
                :rows="2"
                :padding="10"
                resizable
                placeholder="这页要解决什么认知问题"
                @update:value="$emit('update:slidePlanningDraftField', slide.id, 'pageGoal', $event)"
              />
            </div>

            <div class="field-panel">
              <div class="field-label">核心观点</div>
              <TextArea
                :value="slide.planningDraft?.coreMessage || ''"
                :rows="2"
                :padding="10"
                resizable
                placeholder="这一页最核心的一句判断"
                @update:value="$emit('update:slidePlanningDraftField', slide.id, 'coreMessage', $event)"
              />
            </div>
          </div>

          <div class="field two-col">
            <div class="field-panel">
              <div class="field-label">观众带走什么</div>
              <TextArea
                :value="slide.planningDraft?.audienceTakeaway || ''"
                :rows="2"
                :padding="10"
                resizable
                placeholder="观众看完这一页后应该记住什么"
                @update:value="$emit('update:slidePlanningDraftField', slide.id, 'audienceTakeaway', $event)"
              />
            </div>

            <div class="field-panel">
              <div class="field-label">叙事顺序</div>
              <TextArea
                :value="slide.planningDraft?.narrativeFlow || ''"
                :rows="2"
                :padding="10"
                resizable
                placeholder="例如：先场景，后原因，再落动作"
                @update:value="$emit('update:slidePlanningDraftField', slide.id, 'narrativeFlow', $event)"
              />
            </div>
          </div>

          <div class="field two-col">
            <div class="field-panel">
              <div class="field-label">支撑信息</div>
              <TextArea
                :value="toBulletText(slide.planningDraft?.supportingPoints)"
                :rows="4"
                :padding="10"
                resizable
                placeholder="每行一个支撑点"
                @update:value="$emit('update:slidePlanningDraftList', slide.id, 'supportingPoints', $event)"
              />
            </div>

            <div class="field-panel">
              <div class="field-label">证据线索</div>
              <TextArea
                :value="toBulletText(slide.planningDraft?.evidenceHints)"
                :rows="4"
                :padding="10"
                resizable
                placeholder="每行一条可引用的证据、数据或访谈线索"
                @update:value="$emit('update:slidePlanningDraftList', slide.id, 'evidenceHints', $event)"
              />
            </div>
          </div>

          <div class="field two-col">
            <div class="field-panel">
              <div class="field-label">建议版式</div>
              <Input
                :value="slide.planningDraft?.recommendedLayout || ''"
                placeholder="例如 master_split"
                @update:value="$emit('update:slidePlanningDraftField', slide.id, 'recommendedLayout', $event)"
              />
            </div>

            <div class="field-panel">
              <div class="field-label">视觉方向</div>
              <TextArea
                :value="slide.planningDraft?.visualDirection || ''"
                :rows="2"
                :padding="10"
                resizable
                placeholder="例如 左侧场景触发，右侧功能互补解释"
                @update:value="$emit('update:slidePlanningDraftField', slide.id, 'visualDirection', $event)"
              />
            </div>
          </div>

          <div class="field two-col">
            <div class="field-panel">
              <div class="field-label">设计备注</div>
              <TextArea
                :value="toBulletText(slide.planningDraft?.designNotes)"
                :rows="3"
                :padding="10"
                resizable
                placeholder="每行一条设计提醒"
                @update:value="$emit('update:slidePlanningDraftList', slide.id, 'designNotes', $event)"
              />
            </div>

            <div class="field-panel">
              <div class="field-label">禁止出现</div>
              <TextArea
                :value="toBulletText(slide.planningDraft?.forbiddenContent)"
                :rows="3"
                :padding="10"
                resizable
                placeholder="每行一条不该出现的内容或表达"
                @update:value="$emit('update:slidePlanningDraftList', slide.id, 'forbiddenContent', $event)"
              />
            </div>
          </div>

          <div class="field">
            <div class="field-panel">
              <div class="field-label">来源锚点</div>
              <TextArea
                :value="toBulletText(slide.planningDraft?.sourceAnchors)"
                :rows="3"
                :padding="10"
                resizable
                placeholder="每行一个来源锚点，例如 项目背景 / 访谈洞察 / 外部补充"
                @update:value="$emit('update:slidePlanningDraftList', slide.id, 'sourceAnchors', $event)"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <footer class="review-actions actions">
      <div class="actions-copy">大纲确认后才会进入最终生成，本阶段不会直接写入编辑器。</div>
      <div class="actions-buttons">
        <Button :disabled="loading" @click="$emit('back')">返回</Button>
        <Button type="primary" :disabled="loading" @click="$emit('confirm')">
          {{ loading ? '正在创建 PPT...' : '开始生成' }}
        </Button>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'
import TextArea from '@/components/TextArea.vue'
import type { AIDeck } from '../types/deck'
import type { AISlidePlanningDraft } from '../types/slide'

defineProps<{
  deck: AIDeck | null
  plannedPageCount: number
  loading?: boolean
}>()

defineEmits<{
  back: []
  confirm: []
  'update:outlineSummary': [value: string]
  'update:slideTitle': [slideId: string, value: string]
  'update:slideSummary': [slideId: string, value: string]
  'update:slideBullets': [slideId: string, value: string]
  'update:slidePlanningDraftField': [
    slideId: string,
    field: keyof Pick<AISlidePlanningDraft, 'pageGoal' | 'coreMessage' | 'audienceTakeaway' | 'narrativeFlow' | 'recommendedLayout' | 'visualDirection'>,
    value: string,
  ]
  'update:slidePlanningDraftList': [
    slideId: string,
    field: keyof Pick<AISlidePlanningDraft, 'supportingPoints' | 'evidenceHints' | 'designNotes' | 'forbiddenContent' | 'sourceAnchors'>,
    value: string,
  ]
}>()

const toBulletText = (bullets?: string[]) => (bullets ?? []).join('\n')
</script>

<style scoped lang="scss">
.ai-outline-review {
  display: grid;
  gap: 12px;
  height: 100%;
  padding: 16px;
}

.panel {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
}

.overview-card {
  display: grid;
  gap: 12px;
  padding: 14px 16px;
}

.overview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.section-kicker {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #d14424;
}

.summary {
  margin-top: 6px;
  font-size: 16px;
  font-weight: 700;
  color: #20262e;
}

.tip {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: #6b7280;
}

.overview-chip {
  padding: 6px 10px;
  border: 1px solid #f1c3b7;
  border-radius: 999px;
  background: #fff6f3;
  font-size: 12px;
  color: #d14424;
}

.summary-field,
.field {
  display: grid;
  gap: 10px;
}

.field.two-col {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field-panel {
  padding: 14px;
  border: 1px solid #eef0f3;
  border-radius: 10px;
  background: #fafafb;
}

.field-label {
  font-size: 13px;
  font-weight: 700;
  color: #41464b;
}

.planning-panel {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid #eef0f3;
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfbfc 100%);
}

.planning-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.planning-tip {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: #6b7280;
}

.planning-chip {
  padding: 6px 10px;
  border: 1px solid #f1c3b7;
  border-radius: 999px;
  background: #fff6f3;
  font-size: 12px;
  color: #d14424;
}

.slides-list {
  display: grid;
  gap: 12px;
  min-height: 0;
  overflow: auto;
  padding-right: 6px;
}

.slide-card {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.slide-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.slide-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.slide-index {
  font-size: 15px;
  font-weight: 700;
  color: #20262e;
}

.slide-divider {
  width: 28px;
  height: 1px;
  background: #d1d5db;
}

.slide-kind {
  padding: 6px 10px;
  border-radius: 999px;
  background: #f4f6f8;
  font-size: 12px;
  color: #6b7280;
  text-transform: capitalize;
}

.slide-label,
.actions-copy {
  font-size: 12px;
  color: #6b7280;
}

.review-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
}

.actions-buttons {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

@media (max-width: 960px) {
  .field.two-col {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 780px) {
  .ai-outline-review {
    padding: 16px;
  }

  .overview-head,
  .review-actions,
  .planning-head {
    align-items: stretch;
    flex-direction: column;
  }

  .actions-buttons {
    justify-content: flex-end;
  }
}
</style>
