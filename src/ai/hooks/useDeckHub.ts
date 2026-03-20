import { ref } from 'vue'
import { nanoid } from 'nanoid'
import { useMainStore } from '@/store'
import useAIDeckLoader from '@/ai/hooks/useAIDeckLoader'
import { getDeckDetail, listDecks, type DeckHubDeckSummary } from '@/ai/services/deckHub'
import type { Slide } from '@/types/slides'

const syncDeckLocation = (deckId = '', versionId = '') => {
  const url = new URL(window.location.href)
  if (deckId) url.searchParams.set('deckId', deckId)
  else url.searchParams.delete('deckId')

  if (versionId) url.searchParams.set('versionId', versionId)
  else url.searchParams.delete('versionId')

  window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

const createEmptyDeckSlide = (): Slide => ({
  id: nanoid(10),
  elements: [],
  background: {
    type: 'solid',
    color: '#ffffff',
  },
})

export default () => {
  const mainStore = useMainStore()
  const { openDeckIntoEditor } = useAIDeckLoader()
  const decks = ref<DeckHubDeckSummary[]>([])
  const loading = ref(false)

  const loadDecks = async () => {
    loading.value = true
    try {
      decks.value = await listDecks()
      return decks.value
    }
    finally {
      loading.value = false
    }
  }

  const createNewDeck = async () => {
    await openDeckIntoEditor({
      slides: [createEmptyDeckSlide()],
      title: '未命名演示文稿',
    })
    mainStore.setAppView('editor')
    mainStore.setCurrentDeckContext('', '')
    mainStore.setAIPPTDialogState(true)
    syncDeckLocation()
  }

  const openDeck = async (
    deckId: string,
    versionId = '',
    options: { updateHistory?: boolean } = {},
  ) => {
    const detail = await getDeckDetail(deckId)
    const resolvedVersionId = versionId || detail.currentVersion?.id || ''
    const slides = detail.currentVersion?.pptistSlidesJson ?? []

    await openDeckIntoEditor({
      deckId,
      versionId: resolvedVersionId,
      title: detail.title,
      slides,
    })
    mainStore.setAppView('editor')
    mainStore.setCurrentDeckContext(deckId, resolvedVersionId)
    mainStore.setAIPPTDialogState(false)
    if (options.updateHistory !== false) syncDeckLocation(deckId, resolvedVersionId)
    return detail
  }

  return {
    decks,
    loading,
    loadDecks,
    createNewDeck,
    openDeck,
  }
}
