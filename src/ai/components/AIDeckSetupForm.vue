<template>
  <div class="ai-setup-form">
    <Input v-model:value="localTopic" placeholder="请输入PPT主题" @enter="submit()" />
    <div class="controls">
      <Input v-model:value="pageCountText" placeholder="页数" />
      <Select
        class="language"
        v-model:value="localLanguage"
        :options="[
          { label: '中文', value: 'zh-CN' },
          { label: 'English', value: 'en-US' },
        ]"
      />
      <Button type="primary" @click="submit()">生成大纲</Button>
    </div>
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
}>(), {
  topic: '',
  goalPageCount: 10,
  language: 'zh-CN',
})

const emit = defineEmits<{
  submit: [payload: { topic: string; goalPageCount: number; language: string }]
}>()

const localTopic = ref(props.topic)
const localLanguage = ref(props.language)
const pageCountText = ref(String(props.goalPageCount))
const parsedPageCount = computed(() => Number(pageCountText.value) || 10)

const submit = () => {
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
  gap: 12px;
}

.controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.language {
  width: 140px;
}
</style>
