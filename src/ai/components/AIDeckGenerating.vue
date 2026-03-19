<template>
  <div class="ai-generating">
    <div class="title">正在生成演示文稿</div>
    <div class="text">正在根据你修改后的规划稿进行二次 AI 制作，而不是直接把文本套进模板。</div>
    <div class="poll-time" v-if="lastPolledAt">最近一次轮询时间：{{ lastPolledAt }}</div>
    <div class="poll-note">轮询频率：每 1 秒 1 次</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  lastPolledAt?: string
}>()
</script>

<style scoped lang="scss">
.ai-generating {
  padding: 32px 0;
  text-align: center;
}

.title {
  font-size: 18px;
  font-weight: 600;
}

.text {
  margin-top: 8px;
  color: #666;
}

.poll-time,
.poll-note {
  margin-top: 8px;
  font-size: 12px;
  color: #7a8797;
}
</style>
