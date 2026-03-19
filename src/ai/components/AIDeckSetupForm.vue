<template>
  <div class="ai-setup-form">
    <section class="setup-hero panel">
      <div class="kicker">Prompt Intake</div>
      <div class="topic-panel">
        <div class="topic-label">主题输入</div>
        <Input
          v-model:value="localTopic"
          class="topic-input"
          placeholder="例如：2026 AI 产品战略路线图"
          @enter="submit()"
        />
      </div>
    </section>

    <section class="setup-grid">
      <div class="panel control-panel">
        <div class="section-title">规划参数</div>
        <div class="control-grid">
          <div class="field-card">
            <div class="field-label">目标页数</div>
            <Input v-model:value="pageCountText" placeholder="10" />
            <div class="field-note">用于限定规划边界，建议 8 到 15 页。</div>
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
        <div class="submit-note">确认主题、页数和语言后，AI 会进入第一轮规划。</div>
      </div>
      <Button type="primary" class="submit-btn" :disabled="loading" @click="submit()">
        {{ loading ? '正在生成大纲...' : '生成大纲' }}
      </Button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import Input from '@/components/Input.vue'
import Select from '@/components/Select.vue'
import Button from '@/components/Button.vue'

const props = withDefaults(defineProps<{
  topic?: string
  goalPageCount?: number
  language?: string
  loading?: boolean
}>(), {
  topic: '',
  goalPageCount: 10,
  language: 'zh-CN',
  loading: false,
})

const emit = defineEmits<{
  submit: [payload: { topic: string; goalPageCount: number; language: string }]
}>()

const localTopic = ref(props.topic)
const localLanguage = ref(props.language)
const pageCountText = ref(String(props.goalPageCount))
const parsedPageCount = computed(() => Number(pageCountText.value) || 10)

const submit = () => {
  if (props.loading) return
  emit('submit', {
    topic: localTopic.value.trim(),
    goalPageCount: parsedPageCount.value,
    language: localLanguage.value,
  })
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

.language {
  width: 100%;
  margin-top: 10px;
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
