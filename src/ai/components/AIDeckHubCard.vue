<template>
  <article class="deck-card">
    <div class="deck-card__header">
      <div>
        <p class="deck-card__status">{{ statusText }}</p>
        <h3 class="deck-card__title">{{ deck.title }}</h3>
      </div>
      <span v-if="pageCountText" class="deck-card__pages">{{ pageCountText }}</span>
    </div>

    <dl class="deck-card__meta">
      <div>
        <dt>最近更新</dt>
        <dd>{{ formattedUpdatedAt }}</dd>
      </div>
      <div>
        <dt>状态</dt>
        <dd>{{ deck.status }}</dd>
      </div>
    </dl>

    <button class="deck-card__action" type="button" data-action="open" @click="$emit('open', deck.id)">
      继续编辑
    </button>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DeckHubDeckSummary } from '@/ai/services/deckHub'

const props = defineProps<{
  deck: DeckHubDeckSummary
}>()

defineEmits<{
  open: [deckId: string]
}>()

const formattedUpdatedAt = computed(() => {
  if (!props.deck.updatedAt) return '刚刚更新'
  const date = new Date(props.deck.updatedAt)
  if (Number.isNaN(date.getTime())) return props.deck.updatedAt
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
})

const statusText = computed(() => {
  if (props.deck.status === 'ready') return '可继续编辑'
  if (props.deck.status === 'draft') return '草稿'
  return props.deck.status || '进行中'
})

const pageCountText = computed(() => {
  if (typeof props.deck.actualPageCount !== 'number' || Number.isNaN(props.deck.actualPageCount)) return ''
  return `${props.deck.actualPageCount} 页`
})
</script>

<style scoped lang="scss">
.deck-card {
  display: grid;
  gap: 18px;
  padding: 22px;
  border: 1px solid #dbe5f1;
  border-radius: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
  box-shadow: 0 16px 44px rgba(31, 64, 104, 0.08);
}

.deck-card__header,
.deck-card__meta {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.deck-card__status,
.deck-card__meta dt {
  margin: 0;
  font-size: 12px;
  color: #718198;
}

.deck-card__title {
  margin: 6px 0 0;
  font-size: 22px;
  color: #1c2a3a;
}

.deck-card__pages {
  align-self: flex-start;
  padding: 8px 12px;
  border-radius: 999px;
  background: #edf4ff;
  font-size: 12px;
  font-weight: 600;
  color: #2f6fec;
}

.deck-card__meta {
  padding-top: 4px;
}

.deck-card__meta div {
  display: grid;
  gap: 4px;
}

.deck-card__meta dd {
  margin: 0;
  font-size: 14px;
  color: #3b4d63;
}

.deck-card__action {
  width: fit-content;
  padding: 11px 18px;
  border: 0;
  border-radius: 999px;
  background: #1f6bff;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
}
</style>
