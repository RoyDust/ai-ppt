<template>
  <section class="deck-hub">
    <aside class="deck-hub__sidebar">
      <div class="deck-hub__brand">
        <p class="deck-hub__eyebrow">Project Console</p>
        <h1>演示项目管理台</h1>
        <p class="deck-hub__description">
          集中处理新建、继续编辑、状态筛选和版本入口，项目再多也能完整浏览。
        </p>
      </div>

      <button type="button" class="deck-hub__primary" @click="$emit('create')">新建 AIPPT</button>

      <section class="deck-hub__panel">
        <div class="deck-hub__panel-title">项目筛选</div>
        <div class="deck-hub__filters">
          <button
            v-for="item in filterOptions"
            :key="item.key"
            type="button"
            class="deck-hub__filter"
            :class="{ active: activeFilter === item.key }"
            :data-filter="item.key"
            @click="activeFilter = item.key"
          >
            <span>{{ item.label }}</span>
            <strong>{{ item.count }}</strong>
          </button>
        </div>
      </section>

      <section class="deck-hub__panel">
        <div class="deck-hub__panel-title">浏览视图</div>
        <div class="deck-hub__view-toggle">
          <button
            type="button"
            class="deck-hub__view-button"
            :class="{ active: currentView === 'cards' }"
            data-view="cards"
            @click="currentView = 'cards'"
          >
            卡片
          </button>
          <button
            type="button"
            class="deck-hub__view-button"
            :class="{ active: currentView === 'list' }"
            data-view="list"
            @click="currentView = 'list'"
          >
            列表
          </button>
        </div>
      </section>

      <section class="deck-hub__panel deck-hub__panel--quiet">
        <div class="deck-hub__panel-title">结果概览</div>
        <p>{{ filteredDecks.length }} 个项目匹配当前条件</p>
      </section>
    </aside>

    <main class="deck-hub__workspace">
      <header class="deck-hub__toolbar">
        <div>
          <p class="deck-hub__toolbar-label">项目工作台</p>
          <h2>继续推进你的演示项目</h2>
        </div>
        <div class="deck-hub__toolbar-actions">
          <div class="deck-hub__search">
            <span class="deck-hub__search-icon" aria-hidden="true">
              <i-icon-park-outline:search />
            </span>
            <input
              v-model.trim="searchKeyword"
              data-role="deck-search"
              type="search"
              aria-label="搜索项目"
              placeholder="按标题检索项目"
            >
          </div>
        </div>
      </header>

      <div class="deck-hub__scroll">
        <div v-if="loading" class="deck-hub__empty deck-hub__empty--loading">正在加载演示文稿...</div>

        <template v-else-if="filteredDecks.length">
          <section v-if="recentDecks.length" class="deck-hub__section" data-section="recent">
            <div class="deck-hub__section-head">
              <div>
                <p class="deck-hub__section-kicker">Recent</p>
                <h3>最近继续</h3>
              </div>
              <span class="deck-hub__section-note">优先回到最近编辑的项目</span>
            </div>
            <div
              class="deck-hub__collection"
              :class="[
                `deck-hub__collection--${currentView}`,
                { 'deck-hub__collection--recent': currentView === 'cards' },
              ]"
            >
              <AIDeckHubCard
                v-for="deck in recentDecks"
                :key="`recent-${deck.id}`"
                :deck="deck"
                :view="currentView"
                @open="$emit('open', $event)"
                @history="$emit('history', $event)"
              />
            </div>
          </section>

          <section class="deck-hub__section">
            <div class="deck-hub__section-head">
              <div>
                <p class="deck-hub__section-kicker">Library</p>
                <h3>全部项目</h3>
              </div>
              <span class="deck-hub__section-note">{{ filteredDecks.length }} 个结果</span>
            </div>

            <div class="deck-hub__collection" :class="`deck-hub__collection--${currentView}`">
              <AIDeckHubCard
                v-for="deck in filteredDecks"
                :key="deck.id"
                :deck="deck"
                :view="currentView"
                @open="$emit('open', $event)"
                @history="$emit('history', $event)"
              />
            </div>
          </section>
        </template>

        <div v-else class="deck-hub__empty">
          <h2>{{ props.decks.length ? '当前筛选条件下没有项目' : '还没有可继续编辑的演示文稿' }}</h2>
          <p>{{ props.decks.length ? '你可以清空搜索、切换筛选，或者直接新建一份 AIPPT。' : '从这里进入 AIPPT 流程，后续生成的演示文稿会回到这个首页继续管理。' }}</p>
          <button type="button" class="deck-hub__primary" @click="$emit('create')">新建 AIPPT</button>
        </div>
      </div>
    </main>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AIDeckHubCard from '@/ai/components/AIDeckHubCard.vue'
import type { DeckHubDeckSummary } from '@/ai/services/deckHub'

const props = defineProps<{
  decks: DeckHubDeckSummary[]
  loading?: boolean
}>()

defineEmits<{
  create: []
  open: [deckId: string]
  history: [deckId: string]
}>()

const searchKeyword = ref('')
type DeckHubFilterKey = 'all' | 'recent' | 'draft' | 'running' | 'ready' | 'done'

const activeFilter = ref<DeckHubFilterKey>('all')
const currentView = ref<'cards' | 'list'>('cards')

const normalizedDecks = computed(() =>
  [...props.decks].sort((left, right) => {
    const leftTime = new Date(left.updatedAt).getTime()
    const rightTime = new Date(right.updatedAt).getTime()
    return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime)
  }))

const byFilter = (deck: DeckHubDeckSummary, key: DeckHubFilterKey) => {
  if (key === 'all') return true
  if (key === 'recent') return true
  if (key === 'draft') return deck.status === 'draft'
  if (key === 'ready') return deck.status === 'ready'
  if (key === 'running') return ['queued', 'running', 'partial_success'].includes(deck.status)
  if (key === 'done') return ['done', 'completed', 'archived'].includes(deck.status)
  return true
}

const searchedDecks = computed(() => {
  const keyword = searchKeyword.value.toLowerCase()
  if (!keyword) return normalizedDecks.value
  return normalizedDecks.value.filter(deck => deck.title.toLowerCase().includes(keyword))
})

const filteredDecks = computed(() =>
  searchedDecks.value.filter(deck => byFilter(deck, activeFilter.value)))

const recentDecks = computed(() => filteredDecks.value.slice(0, 3))

const filterOptions = computed<Array<{ key: DeckHubFilterKey; label: string; count: number }>>(() => [
  { key: 'all', label: '全部项目', count: props.decks.length },
  { key: 'recent', label: '最近编辑', count: props.decks.length },
  { key: 'draft', label: '草稿', count: props.decks.filter(deck => deck.status === 'draft').length },
  { key: 'running', label: '生成中', count: props.decks.filter(deck => ['queued', 'running', 'partial_success'].includes(deck.status)).length },
  { key: 'ready', label: '可继续', count: props.decks.filter(deck => deck.status === 'ready').length },
  { key: 'done', label: '已完成', count: props.decks.filter(deck => ['done', 'completed', 'archived'].includes(deck.status)).length },
])
</script>

<style scoped lang="scss">
.deck-hub {
  --hub-shell: #eaf8ff;
  --hub-ink: #14212f;
  --hub-muted: #5d7288;
  --hub-panel: rgba(255, 255, 255, 0.94);
  --hub-panel-soft: rgba(255, 255, 255, 0.72);
  --hub-line: rgba(102, 204, 255, 0.24);
  --hub-accent: #66ccff;
  --hub-accent-strong: #2fb7f5;
  --hub-accent-soft: rgba(102, 204, 255, 0.16);
  --hub-accent-glow: rgba(102, 204, 255, 0.28);
  --hub-rail: #17344a;
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(102, 204, 255, 0.3), transparent 32%),
    radial-gradient(circle at right top, rgba(144, 227, 255, 0.34), transparent 28%),
    linear-gradient(180deg, #f2fbff 0%, #e7f5fc 100%);
}

.deck-hub__sidebar {
  display: grid;
  align-content: start;
  gap: 18px;
  height: 100%;
  padding: 28px 22px;
  overflow: auto;
  background:
    linear-gradient(180deg, rgba(15, 41, 60, 0.96), rgba(22, 58, 82, 0.96)),
    var(--hub-rail);
  color: #f4f7fa;
}

.deck-hub__brand h1 {
  margin-top: 10px;
  font-family: 'Merriweather', Georgia, serif;
  font-size: 34px;
  line-height: 1.05;
}

.deck-hub__eyebrow {
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #9ee7ff;
}

.deck-hub__description {
  margin-top: 14px;
  font-size: 14px;
  line-height: 1.75;
  color: rgba(244, 247, 250, 0.72);
}

.deck-hub__primary {
  padding: 13px 18px;
  border: 0;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--hub-accent), var(--hub-accent-strong));
  box-shadow: 0 16px 30px rgba(47, 183, 245, 0.26);
  font-weight: 700;
  color: #082235;
  cursor: pointer;
}

.deck-hub__panel {
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(14px);
}

.deck-hub__panel--quiet p {
  color: rgba(244, 247, 250, 0.78);
}

.deck-hub__panel-title,
.deck-hub__toolbar-label,
.deck-hub__section-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.deck-hub__filters {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.deck-hub__filter,
.deck-hub__view-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 11px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  color: inherit;
  cursor: pointer;
}

.deck-hub__filter.active,
.deck-hub__view-button.active {
  border-color: var(--hub-accent-glow);
  background: var(--hub-accent-soft);
  color: #e8fbff;
}

.deck-hub__view-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 14px;
}

.deck-hub__workspace {
  display: grid;
  min-height: 0;
  overflow: hidden;
  padding: 26px;
}

.deck-hub__toolbar {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  padding: 10px 10px 20px;
}

.deck-hub__toolbar h2 {
  margin-top: 8px;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 30px;
  color: var(--hub-ink);
}

.deck-hub__toolbar-actions {
  display: flex;
  gap: 12px;
}

.deck-hub__search {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 280px;
  padding: 14px 16px;
  border: 1px solid var(--hub-line);
  border-radius: 20px;
  background: var(--hub-panel-soft);
  color: var(--hub-muted);
  box-shadow: 0 10px 28px rgba(55, 141, 184, 0.08);
}

.deck-hub__search-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  font-size: 16px;
  color: var(--hub-accent-strong);
}

.deck-hub__search input {
  width: 100%;
  border: 0;
  background: transparent;
  outline: 0;
  font-size: 15px;
  color: var(--hub-ink);
}

.deck-hub__search:focus-within {
  border-color: var(--hub-accent-glow);
  box-shadow: 0 0 0 4px rgba(102, 204, 255, 0.14);
}

.deck-hub__scroll {
  min-height: 0;
  overflow: auto;
  padding-right: 4px;
}

.deck-hub__section {
  margin-top: 18px;
  padding: 22px;
  border: 1px solid var(--hub-line);
  border-radius: 28px;
  background: var(--hub-panel);
  box-shadow: 0 18px 54px rgba(24, 41, 64, 0.08);
}

.deck-hub__section-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: end;
  margin-bottom: 18px;
}

.deck-hub__section-head h3 {
  margin-top: 8px;
  font-size: 24px;
  color: var(--hub-ink);
}

.deck-hub__section-note {
  color: var(--hub-muted);
  font-size: 14px;
}

.deck-hub__collection--recent,
.deck-hub__collection--cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 18px;
}

.deck-hub__collection--list {
  display: grid;
  gap: 14px;
}

.deck-hub__empty {
  display: grid;
  justify-items: start;
  gap: 12px;
  padding: 32px;
  border: 1px solid var(--hub-line);
  border-radius: 28px;
  background: var(--hub-panel);
  color: var(--hub-muted);
}

.deck-hub__empty--loading {
  justify-items: center;
}

@media (max-width: 1080px) {
  .deck-hub {
    grid-template-columns: 1fr;
    height: auto;
    overflow: auto;
  }

  .deck-hub__sidebar,
  .deck-hub__workspace,
  .deck-hub__scroll {
    height: auto;
    overflow: visible;
  }
}

@media (max-width: 720px) {
  .deck-hub__workspace {
    padding: 18px;
  }

  .deck-hub__toolbar {
    display: grid;
    align-items: start;
  }

  .deck-hub__search {
    min-width: 0;
  }
}
</style>
