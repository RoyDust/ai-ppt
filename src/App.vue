<template>
  <AIDeckHub
    v-if="!isAudienceMode && appView === 'hub' && !booting"
    :decks="deckHub.decks.value"
    :loading="deckHub.loading.value"
    @create="deckHub.createNewDeck"
    @open="deckHub.openDeck"
  />
  <template v-else-if="slides.length">
    <Screen v-if="screening" />
    <Editor v-else-if="_isPC" />
    <Mobile v-else />
  </template>
  <FullscreenSpin tip="数据初始化中，请稍等 ..." v-else loading :mask="false" />
</template>

<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { nanoid } from 'nanoid'
import { useScreenStore, useMainStore, useSnapshotStore, useSlidesStore } from '@/store'
import { LOCALSTORAGE_KEY_DISCARDED_DB } from '@/configs/storage'
import { deleteDiscardedDB } from '@/utils/database'
import { isPC } from '@/utils/common'
import Editor from './views/Editor/index.vue'
import Screen from './views/Screen/index.vue'
import Mobile from './views/Mobile/index.vue'
import FullscreenSpin from '@/components/FullscreenSpin.vue'
import AIDeckHub from '@/ai/components/AIDeckHub.vue'
import useDeckHub from '@/ai/hooks/useDeckHub'

const _isPC = isPC()

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const screenStore = useScreenStore()
const { databaseId, appView } = storeToRefs(mainStore)
const { slides } = storeToRefs(slidesStore)
const { screening } = storeToRefs(screenStore)
const deckHub = useDeckHub()
const booting = ref(true)

const isAudienceMode = new URLSearchParams(window.location.search).get('mode') === 'audience'

const syncAppWithLocation = async () => {
  const search = new URLSearchParams(window.location.search)
  const deckId = search.get('deckId')
  const versionId = search.get('versionId') || ''

  if (deckId) {
    try {
      await deckHub.openDeck(deckId, versionId, { updateHistory: false })
    }
    catch {
      mainStore.setAppView('hub')
      await deckHub.loadDecks()
    }
    return
  }

  mainStore.setAppView('hub')
  await deckHub.loadDecks()
}

if (import.meta.env.MODE !== 'development') {
  window.onbeforeunload = () => false
}

onMounted(async () => {
  await deleteDiscardedDB()

  if (isAudienceMode) {
    slidesStore.setSlides([{
      id: nanoid(10),
      elements: [],
    }])
    screenStore.setScreening(true)
    mainStore.setAppView('editor')
    booting.value = false
  }
  else {
    await syncAppWithLocation()
    booting.value = false
    window.addEventListener('popstate', syncAppWithLocation)
  }
})

onBeforeUnmount(() => {
  if (!isAudienceMode) window.removeEventListener('popstate', syncAppWithLocation)
})

// 应用注销时向 localStorage 中记录下本次 indexedDB 的数据库ID，用于之后清除数据库
window.addEventListener('beforeunload', () => {
  const discardedDB = localStorage.getItem(LOCALSTORAGE_KEY_DISCARDED_DB)
  const discardedDBList: string[] = discardedDB ? JSON.parse(discardedDB) : []

  discardedDBList.push(databaseId.value)

  const newDiscardedDB = JSON.stringify(discardedDBList)
  localStorage.setItem(LOCALSTORAGE_KEY_DISCARDED_DB, newDiscardedDB)
})
</script>

<style lang="scss">
#app {
  height: 100%;
}
</style>
