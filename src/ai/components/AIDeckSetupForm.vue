<template>
  <div class="ai-setup-form">
    <section class="setup-hero panel">
      <div class="kicker">Prompt Intake</div>
      <div class="mode-switch">
        <Button
          size="small"
          type="checkbox"
          first
          :checked="inputMode === 'simple'"
          @click="setInputMode('simple')"
        >
          简单模式
        </Button>
        <Button
          size="small"
          type="checkbox"
          last
          :checked="inputMode === 'research'"
          @click="setInputMode('research')"
        >
          研究模式
        </Button>
      </div>
      <div class="topic-panel">
        <template v-if="inputMode === 'simple'">
          <div class="topic-label">主题输入</div>
          <Input
            v-model:value="localTopic"
            class="topic-input"
            placeholder="例如：2026 AI 产品战略路线图"
            @enter="submit()"
          />
          <div v-if="errors.topic" class="field-error">{{ errors.topic }}</div>
        </template>
        <template v-else>
          <div class="topic-label">研究项目输入</div>
          <textarea
            v-model="researchBrief"
            class="research-textarea"
            placeholder="可粘贴 JSON，或按行填写背景 / 目标 / 研究框架。"
          ></textarea>
          <div class="research-toolbar">
            <div class="field-note no-margin">支持 JSON 粘贴；格式不完整时会自动回退为文本拆分。</div>
            <Button size="small" @click="fillResearchExample()">填入示例</Button>
          </div>
          <div v-if="warnings.researchBrief" class="field-warning">{{ warnings.researchBrief }}</div>
          <div v-if="errors.researchBrief" class="field-error">{{ errors.researchBrief }}</div>
        </template>
      </div>
    </section>

    <section class="setup-grid">
      <div class="panel control-panel">
        <div class="section-title">规划参数</div>
        <div class="control-grid">
          <div class="field-card">
            <div class="field-label">页数范围</div>
            <div class="range-switch">
              <Button
                v-for="option in pageCountOptions"
                :key="option.key"
                size="small"
                type="checkbox"
                :checked="selectedPageCountRange.key === option.key"
                @click="selectedPageCountRange = option"
              >
                {{ option.label }}
              </Button>
            </div>
            <div class="field-note">只给 AI 一个页数范围，由它在范围内决定最终页数。</div>
          </div>

          <div class="field-card">
            <div class="field-label">输出语言</div>
            <Select
              class="language"
              v-model:value="localLanguage"
              :options="[
                { label: '中文', value: 'zh-CN' },
                { label: 'English', value: 'en-US' },
              ]"
            />
            <div class="field-note">会影响大纲措辞和后续渲染文案。</div>
          </div>
        </div>
      </div>

      <div class="panel guidance-panel">
        <div class="section-title">本阶段输出</div>
        <div class="guidance-list">
          <div class="guidance-item">AI 会先生成一份可编辑的大纲和全局摘要。</div>
          <div class="guidance-item">你可以逐页修改标题、摘要和要点，再决定是否开始生成。</div>
          <div class="guidance-item">主流程保持三步走，不会跳过确认环节。</div>
        </div>
      </div>
    </section>

    <section class="submit-bar panel">
      <div class="submit-copy">
        <div class="submit-title">准备启动规划</div>
        <div class="submit-note">确认主题、页数范围和语言后，AI 会进入第一轮规划。</div>
      </div>
      <Button type="primary" class="submit-btn" :disabled="loading" @click="submit()">
        {{ loading ? '正在生成大纲...' : '生成大纲' }}
      </Button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Input from '@/components/Input.vue'
import Select from '@/components/Select.vue'
import Button from '@/components/Button.vue'
import {
  AI_DECK_PAGE_COUNT_RANGES,
  DEFAULT_AI_DECK_PAGE_COUNT_RANGE,
  DEFAULT_AI_DECK_PAGE_COUNT,
  inferPageCountRangeByGoal,
  normalizeDeckPlanInput,
  type AIPageCountRange,
  type AIPPTInputMode,
  type DeckPlanInput,
} from '@/ai/types/deck'

const props = withDefaults(defineProps<{
  topic?: string
  goalPageCount?: number
  pageCountRange?: AIPageCountRange
  language?: string
  loading?: boolean
}>(), {
  topic: '',
  goalPageCount: 10,
  pageCountRange: () => DEFAULT_AI_DECK_PAGE_COUNT_RANGE,
  language: 'zh-CN',
  loading: false,
})

const emit = defineEmits<{
  submit: [payload: DeckPlanInput]
}>()

const localTopic = ref(props.topic)
const localLanguage = ref(props.language)
const pageCountOptions = AI_DECK_PAGE_COUNT_RANGES
const selectedPageCountRange = ref<AIPageCountRange>(props.pageCountRange ?? inferPageCountRangeByGoal(props.goalPageCount))
const inputMode = ref<AIPPTInputMode>('simple')
const researchBrief = ref('')
const errors = ref<Partial<Record<'topic' | 'researchBrief', string>>>({})
const warnings = ref<Partial<Record<'researchBrief', string>>>({})
const setInputMode = (value: AIPPTInputMode) => {
  inputMode.value = value
  errors.value = {}
  warnings.value = {}
}

const fillResearchExample = () => {
  researchBrief.value = JSON.stringify({
    projectBackground: ['现有用户对 AI 演示流程理解不一致', '需要把复杂调研需求收敛到稳定模板'],
    projectObjectives: ['生成结构稳定的研究汇报', '减少封面和表格页的超载内容'],
    researchFramework: ['用户分层', '方法设计', '核心发现', '业务建议'],
  }, null, 2)
}

const submit = () => {
  if (props.loading) return

  const normalized = normalizeDeckPlanInput({
    inputMode: inputMode.value,
    topic: localTopic.value.trim(),
    goalPageCount: selectedPageCountRange.value?.suggested ?? DEFAULT_AI_DECK_PAGE_COUNT,
    pageCountRange: selectedPageCountRange.value,
    language: localLanguage.value,
    researchBrief: researchBrief.value,
  })

  errors.value = normalized.errors
  warnings.value = normalized.warnings
  if (!normalized.ok) return

  localTopic.value = normalized.payload.topic
  selectedPageCountRange.value = normalized.payload.pageCountRange ?? DEFAULT_AI_DECK_PAGE_COUNT_RANGE
  emit('submit', normalized.payload)
}
</script>

<style scoped lang="scss">
.ai-setup-form {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 16px;
  padding: 22px;
  min-height: 100%;
  overflow: hidden;
}

.panel {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
}

.setup-hero {
  padding: 24px;
}

.mode-switch {
  display: inline-flex;
  gap: 0;
}

.kicker {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #d14424;
}

.heading {
  display: none;
}

.topic-panel {
  margin-top: 12px;
  padding: 18px;
  border: 1px solid #eceef1;
  border-radius: 10px;
  background: #fafafb;
}

.topic-label,
.section-title,
.field-label,
.submit-title {
  font-size: 13px;
  font-weight: 700;
  color: #41464b;
}

.topic-input {
  margin-top: 10px;
}

.setup-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.95fr);
  gap: 16px;
  align-items: start;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.control-panel,
.guidance-panel,
.submit-bar {
  padding: 20px;
}

.control-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 14px;
}

.range-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.field-card {
  padding: 16px;
  border: 1px solid #eef0f3;
  border-radius: 10px;
  background: #fafafb;
}

.field-note,
.guidance-item,
.submit-note {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.7;
  color: #6b7280;
}

.no-margin {
  margin-top: 0;
}

.language {
  width: 100%;
  margin-top: 10px;
}

.research-textarea {
  width: 100%;
  min-height: 176px;
  margin-top: 10px;
  padding: 12px 14px;
  border: 1px solid #d9d9d9;
  border-radius: 10px;
  outline: 0;
  resize: vertical;
  font-size: 13px;
  line-height: 1.7;
  color: #41464b;
  background: #fff;

  &:focus {
    border-color: #d14424;
  }
}

.research-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
}

.field-error,
.field-warning {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.6;
}

.field-error {
  color: #b42318;
}

.field-warning {
  color: #b54708;
}

.guidance-list {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

.guidance-item {
  position: relative;
  margin-top: 0;
  padding-left: 18px;
}

.guidance-item::before {
  content: '';
  position: absolute;
  top: 8px;
  left: 0;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #d14424;
}

.submit-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: auto;
  flex-shrink: 0;
}

.submit-note {
  margin-top: 6px;
}

.submit-btn {
  min-width: 148px;
}

@media (max-width: 960px) {
  .setup-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .ai-setup-form {
    padding: 16px;
  }

  .research-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .control-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .submit-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .submit-btn {
    width: 100%;
  }
}
</style>
