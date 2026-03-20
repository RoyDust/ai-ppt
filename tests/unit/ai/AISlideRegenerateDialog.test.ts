import { createApp, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import AISlideRegenerateDialog from '@/ai/components/AISlideRegenerateDialog.vue'
import { useMainStore, useSlidesStore } from '@/store'
import { useAIDeckStore } from '@/ai/stores/aiDeck'

const regenerateCurrentSlide = vi.fn(() => Promise.resolve())
const rerunPreview = vi.fn(() => Promise.resolve())
const acceptPreviewReplaceCurrent = vi.fn(() => Promise.resolve({
  versionId: 'version_2',
  slides: [],
}))
const clearPreview = vi.fn()

vi.mock('@/ai/hooks/useAISlideRegeneration', () => ({
  default: () => ({
    previewSlide: ref({
      id: 'regen_2',
      kind: 'content',
      title: '新方案页',
      bullets: ['新的结论'],
      regeneratable: true,
    }),
    regenerateCurrentSlide,
    rerunPreview,
    acceptPreviewReplaceCurrent,
    clearPreview,
  }),
}))

afterEach(() => {
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

const flushUi = async () => {
  await Promise.resolve()
  await nextTick()
}

describe('AISlideRegenerateDialog', () => {
  it('shows current and regenerated slides in a stacked comparison layout', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const mainStore = useMainStore()
    const slidesStore = useSlidesStore()
    const aiDeckStore = useAIDeckStore()
    mainStore.setAISlideRegenerateDialogState(true)
    mainStore.setAISlideRegenerateContext({ deckId: 'deck_1', slideId: 'slide_2' })
    slidesStore.setSlides([
      {
        id: 'slide_2',
        type: 'content',
        background: { type: 'solid', color: '#f5f7fb' },
        elements: [
          {
            id: 'current_text',
            type: 'text',
            left: 72,
            top: 60,
            width: 856,
            height: 96,
            rotate: 0,
            content: '<p>当前页面</p><p>当前要点</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#132238',
          },
        ],
      },
    ] as any)
    slidesStore.updateSlideIndex(0)
    aiDeckStore.setRenderedDeck({
      id: 'deck_1',
      topic: '职业规划',
      goalPageCount: 10,
      actualPageCount: 3,
      language: 'zh-CN',
      outlineSummary: '职业规划汇报',
      slides: [
        { id: 'slide_1', kind: 'cover', title: '封面', regeneratable: true },
        { id: 'slide_2', kind: 'content', title: '当前页面', bullets: ['当前要点'], regeneratable: true },
        { id: 'slide_3', kind: 'summary', title: '总结', regeneratable: true },
      ],
    } as any)

    const host = document.createElement('div')
    document.body.appendChild(host)

    createApp({
      render: () => h(AISlideRegenerateDialog),
    }).use(pinia).mount(host)

    await flushUi()

    expect(host.querySelectorAll('.thumbnail-slide')).toHaveLength(2)
    expect(host.querySelector('.compare-grid')).not.toBeNull()
    expect(host.textContent).toContain('当前页面')
    expect(host.textContent).toContain('新生成页面')
    expect(host.textContent).toContain('标题已重写')
    expect(host.textContent).toContain('新的结论')
    expect(host.textContent).toContain('拒绝结果')
    expect(host.textContent).toContain('重新来一次')
    expect(host.textContent).toContain('替换为新页')
  })

  it('supports rejecting and retrying a regenerated result', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const mainStore = useMainStore()
    const slidesStore = useSlidesStore()
    mainStore.setAISlideRegenerateDialogState(true)
    mainStore.setAISlideRegenerateContext({ deckId: 'deck_1', slideId: 'slide_2' })
    slidesStore.setSlides([
      {
        id: 'slide_2',
        type: 'content',
        background: { type: 'solid', color: '#f5f7fb' },
        elements: [],
      },
    ] as any)
    slidesStore.updateSlideIndex(0)

    const host = document.createElement('div')
    document.body.appendChild(host)

    createApp({
      render: () => h(AISlideRegenerateDialog),
    }).use(pinia).mount(host)

    await flushUi()

    const retryButton = Array.from(host.querySelectorAll('button')).find(button => button.textContent?.includes('重新来一次')) as HTMLButtonElement
    expect(retryButton).toBeTruthy()
    retryButton.click()
    await flushUi()

    expect(rerunPreview).toHaveBeenCalledTimes(1)

    const rejectButton = Array.from(host.querySelectorAll('button')).find(button => button.textContent?.includes('拒绝结果')) as HTMLButtonElement
    expect(rejectButton).toBeTruthy()
    rejectButton.click()
    await flushUi()

    expect(clearPreview).toHaveBeenCalled()
    expect(mainStore.showAISlideRegenerateDialog).toBe(false)
    expect(mainStore.aiSlideRegenerateContext).toBeNull()
  })

  it('shows a loading state in the regenerated panel while retrying', async () => {
    let resolveRetry: (() => void) | null = null
    rerunPreview.mockImplementationOnce(() => new Promise((resolve) => {
      resolveRetry = () => resolve()
    }))

    const pinia = createPinia()
    setActivePinia(pinia)
    const mainStore = useMainStore()
    const slidesStore = useSlidesStore()
    mainStore.setAISlideRegenerateDialogState(true)
    mainStore.setAISlideRegenerateContext({ deckId: 'deck_1', slideId: 'slide_2' })
    slidesStore.setSlides([
      {
        id: 'slide_2',
        type: 'content',
        background: { type: 'solid', color: '#f5f7fb' },
        elements: [],
      },
    ] as any)
    slidesStore.updateSlideIndex(0)

    const host = document.createElement('div')
    document.body.appendChild(host)

    createApp({
      render: () => h(AISlideRegenerateDialog),
    }).use(pinia).mount(host)

    await flushUi()

    const retryButton = Array.from(host.querySelectorAll('button')).find(button => button.textContent?.includes('重新来一次')) as HTMLButtonElement
    retryButton.click()
    await flushUi()

    expect(host.querySelector('.panel-loading')).not.toBeNull()
    expect(host.textContent).toContain('正在生成新页面...')

    resolveRetry?.()
    await flushUi()
  })
})
