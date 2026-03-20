import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useMainStore, useSlidesStore, useSnapshotStore } from '@/store'

const listDecks = vi.fn()
const getDeckDetail = vi.fn()
const openDeckIntoEditor = vi.fn()

vi.mock('@/ai/services/deckHub', () => ({
  listDecks: (...args: unknown[]) => listDecks(...args),
  getDeckDetail: (...args: unknown[]) => getDeckDetail(...args),
}))

vi.mock('@/ai/hooks/useAIDeckLoader', () => ({
  default: () => ({
    openDeckIntoEditor,
  }),
}))

const mountComponent = async (component: any, props: Record<string, unknown> = {}) => {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const pinia = createPinia()
  const app = createApp(component, props)
  app.use(pinia)
  app.mount(root)
  await nextTick()

  return {
    root,
    unmount() {
      app.unmount()
      root.remove()
    },
  }
}

describe('AIDeckHub', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shows an empty state when no decks exist', async () => {
    const { default: AIDeckHub } = await import('@/ai/components/AIDeckHub.vue')
    const { root, unmount } = await mountComponent(AIDeckHub, {
      decks: [],
      loading: false,
    })

    expect(root.textContent).toContain('还没有可继续编辑的演示文稿')
    expect(root.textContent).toContain('新建 AIPPT')

    unmount()
  })

  it('renders deck metadata and emits open when continue editing is clicked', async () => {
    const onOpen = vi.fn()
    const { default: AIDeckHub } = await import('@/ai/components/AIDeckHub.vue')
    const { root, unmount } = await mountComponent(AIDeckHub, {
      decks: [
        {
          id: 'deck_1',
          title: '季度经营复盘',
          status: 'ready',
          updatedAt: '2026-03-20T09:30:00.000Z',
          actualPageCount: 12,
        },
      ],
      loading: false,
      onOpen,
    })

    expect(root.textContent).toContain('季度经营复盘')
    expect(root.textContent).toContain('12 页')

    root.querySelector<HTMLButtonElement>('button[data-action="open"]')?.click()
    await nextTick()

    expect(onOpen).toHaveBeenCalledWith('deck_1')

    unmount()
  })

  it('does not render a null page count badge value', async () => {
    const { default: AIDeckHub } = await import('@/ai/components/AIDeckHub.vue')
    const { root, unmount } = await mountComponent(AIDeckHub, {
      decks: [
        {
          id: 'deck_2',
          title: '产品发布路线图',
          status: 'draft',
          updatedAt: '2026-03-20T09:30:00.000Z',
          actualPageCount: null,
        },
      ],
      loading: false,
    })

    expect(root.textContent).not.toContain('null 页')
    expect(root.textContent).not.toContain('undefined 页')

    unmount()
  })
})

describe('useDeckHub', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    listDecks.mockReset()
    getDeckDetail.mockReset()
    openDeckIntoEditor.mockReset()
    window.history.replaceState({}, '', '/')
  })

  it('loads decks and reports the empty state from the service', async () => {
    listDecks.mockResolvedValue([])

    const { default: useDeckHub } = await import('@/ai/hooks/useDeckHub')
    const deckHub = useDeckHub()

    await deckHub.loadDecks()

    expect(deckHub.decks.value).toEqual([])
    expect(deckHub.loading.value).toBe(false)
  })

  it('creates a new deck by switching into editor mode and opening the AIPPT dialog', async () => {
    const mainStore = useMainStore()
    const slidesStore = useSlidesStore()
    const snapshotStore = useSnapshotStore()
    slidesStore.setSlides([{ id: 'existing', elements: [], background: { type: 'solid', color: '#fff' } }] as any)
    mainStore.setAppView('hub')
    snapshotStore.setSnapshotCursor(7)
    snapshotStore.setSnapshotLength(9)

    const { default: useDeckHub } = await import('@/ai/hooks/useDeckHub')
    const deckHub = useDeckHub()

    await deckHub.createNewDeck()

    expect(mainStore.appView).toBe('editor')
    expect(mainStore.showAIPPTDialog).toBe(true)
    expect(openDeckIntoEditor).toHaveBeenCalled()
  })

  it('opens a selected deck into the editor through the shared loader path', async () => {
    getDeckDetail.mockResolvedValue({
      id: 'deck_1',
      title: '季度经营复盘',
      currentVersion: {
        id: 'version_2',
        versionNo: 2,
        pptistSlidesJson: [{ id: 'slide_1', elements: [], background: { type: 'solid', color: '#f5f7fb' } }],
      },
    })

    const mainStore = useMainStore()
    const { default: useDeckHub } = await import('@/ai/hooks/useDeckHub')
    const deckHub = useDeckHub()

    await deckHub.openDeck('deck_1')

    expect(getDeckDetail).toHaveBeenCalledWith('deck_1')
    expect(openDeckIntoEditor).toHaveBeenCalledWith({
      deckId: 'deck_1',
      versionId: 'version_2',
      title: '季度经营复盘',
      slides: [{ id: 'slide_1', elements: [], background: { type: 'solid', color: '#f5f7fb' } }],
    })
    expect(mainStore.appView).toBe('editor')
  })

  it('can open a deck without pushing a new history entry when syncing from location', async () => {
    getDeckDetail.mockResolvedValue({
      id: 'deck_9',
      title: '年度战略更新',
      currentVersion: {
        id: 'version_4',
        versionNo: 4,
        pptistSlidesJson: [{ id: 'slide_9', elements: [], background: { type: 'solid', color: '#fff' } }],
      },
    })
    const pushStateSpy = vi.spyOn(window.history, 'pushState')

    const { default: useDeckHub } = await import('@/ai/hooks/useDeckHub')
    const deckHub = useDeckHub()

    await deckHub.openDeck('deck_9', '', { updateHistory: false })

    expect(pushStateSpy).not.toHaveBeenCalled()

    pushStateSpy.mockRestore()
  })
})
