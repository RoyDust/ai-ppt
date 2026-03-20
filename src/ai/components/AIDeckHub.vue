<template>
  <section class="deck-hub">
    <header class="deck-hub__hero">
      <div>
        <p class="deck-hub__eyebrow">PPT 工作台</p>
        <h1>先管理演示文稿，再进入编辑器</h1>
        <p class="deck-hub__description">
          继续上次未完成的 AI 演示文稿，或直接新建一份 AIPPT 开始规划。
        </p>
      </div>
      <div class="deck-hub__actions">
        <div class="deck-hub__search">搜索与筛选即将开放</div>
        <button type="button" class="deck-hub__primary" @click="$emit('create')">新建 AIPPT</button>
      </div>
    </header>

    <div v-if="loading" class="deck-hub__empty deck-hub__empty--loading">正在加载演示文稿...</div>

    <div v-else-if="!decks.length" class="deck-hub__empty">
      <h2>还没有可继续编辑的演示文稿</h2>
      <p>从这里进入 AIPPT 流程，后续生成的演示文稿会回到这个首页继续管理。</p>
      <button type="button" class="deck-hub__primary" @click="$emit('create')">新建 AIPPT</button>
    </div>

    <div v-else class="deck-hub__grid">
      <AIDeckHubCard v-for="deck in decks" :key="deck.id" :deck="deck" @open="$emit('open', $event)" />
    </div>
  </section>
</template>

<script setup lang="ts">
import AIDeckHubCard from '@/ai/components/AIDeckHubCard.vue'
import type { DeckHubDeckSummary } from '@/ai/services/deckHub'

defineProps<{
  decks: DeckHubDeckSummary[]
  loading?: boolean
}>()

defineEmits<{
  create: []
  open: [deckId: string]
}>()
</script>

<style scoped lang="scss">
.deck-hub {
  min-height: 100%;
  padding: 40px;
  background:
    radial-gradient(circle at top left, rgba(117, 181, 255, 0.22), transparent 34%),
    linear-gradient(180deg, #f3f8ff 0%, #eef4fb 100%);
}

.deck-hub__hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 30px 34px;
  border: 1px solid rgba(186, 205, 228, 0.9);
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 22px 60px rgba(22, 61, 109, 0.08);
}

.deck-hub__eyebrow {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #2f6fec;
}

.deck-hub h1 {
  margin: 0;
  font-size: 36px;
  line-height: 1.1;
  color: #1b2a3a;
}

.deck-hub__description {
  max-width: 600px;
  margin: 14px 0 0;
  font-size: 15px;
  line-height: 1.6;
  color: #5d6f86;
}

.deck-hub__actions {
  display: grid;
  gap: 12px;
  align-content: start;
}

.deck-hub__search {
  min-width: 240px;
  padding: 12px 14px;
  border: 1px dashed #bfd0e5;
  border-radius: 16px;
  background: #f8fbff;
  font-size: 13px;
  color: #7c8ca1;
}

.deck-hub__primary {
  padding: 12px 18px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #1f6bff 0%, #3a8dff 100%);
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
}

.deck-hub__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 28px;
}

.deck-hub__empty {
  display: grid;
  justify-items: start;
  gap: 12px;
  margin-top: 28px;
  padding: 32px 34px;
  border: 1px solid #dbe5f1;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.9);
  color: #55687f;
}

.deck-hub__empty h2,
.deck-hub__empty p {
  margin: 0;
}

.deck-hub__empty--loading {
  justify-items: center;
}

@media (max-width: 960px) {
  .deck-hub {
    padding: 24px;
  }

  .deck-hub__hero {
    grid-template-columns: 1fr;
    display: grid;
  }

  .deck-hub h1 {
    font-size: 28px;
  }
}
</style>
