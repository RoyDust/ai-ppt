<template>
  <article class="deck-card" :class="`deck-card--${view}`">
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

    <div class="deck-card__actions">
      <button class="deck-card__ghost" type="button" data-action="history" @click="$emit('history', deck.id)">
        历史版本
      </button>
      <button class="deck-card__action" type="button" data-action="open" @click="$emit('open', deck.id)">
        继续编辑
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DeckHubDeckSummary } from '@/ai/services/deckHub'

const props = defineProps<{
  deck: DeckHubDeckSummary
  view?: 'cards' | 'list'
}>()

defineEmits<{
  open: [deckId: string]
  history: [deckId: string]
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
  --deck-card-accent: #66ccff;
  --deck-card-accent-strong: #2fb7f5;
  --deck-card-accent-soft: rgba(102, 204, 255, 0.16);
  --deck-card-line: rgba(102, 204, 255, 0.22);
  --deck-card-text: #143149;
  display: grid;
  gap: 18px;
  padding: 22px;
  border: 1px solid var(--deck-card-line);
  border-radius: 24px;
  background: linear-gradient(180deg, #ffffff 0%, #f4fbff 100%);
  box-shadow: 0 16px 44px rgba(42, 111, 146, 0.1);
}

.deck-card--list {
  grid-template-columns: minmax(0, 2fr) minmax(220px, 1fr) auto;
  align-items: center;
}

.deck-card--list .deck-card__header,
.deck-card--list .deck-card__meta,
.deck-card--list .deck-card__actions {
  align-items: center;
}

.deck-card--list .deck-card__meta {
  padding-top: 0;
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
  color: var(--deck-card-text);
}

.deck-card__pages {
  align-self: flex-start;
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--deck-card-accent-soft);
  font-size: 12px;
  font-weight: 600;
  color: #168ec8;
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
  background: linear-gradient(135deg, var(--deck-card-accent), var(--deck-card-accent-strong));
  font-size: 14px;
  font-weight: 600;
  color: #082235;
  cursor: pointer;
  box-shadow: 0 14px 24px rgba(47, 183, 245, 0.22);
}

.deck-card__actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.deck-card__ghost {
  width: fit-content;
  padding: 11px 16px;
  border: 1px solid var(--deck-card-line);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  font-size: 14px;
  font-weight: 600;
  color: #255879;
  cursor: pointer;
}

@media (max-width: 860px) {
  .deck-card--list {
    grid-template-columns: 1fr;
  }

  .deck-card__actions {
    flex-wrap: wrap;
  }
}
</style>
