import { createApp, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import AISlideRegenerateDialog from '@/ai/components/AISlideRegenerateDialog.vue'
import { useMainStore, useSlidesStore } from '@/store'
import { useAIDeckStore } from '@/ai/stores/aiDeck'

vi.mock('@/ai/hooks/useAISlideRegeneration', () => ({
  default: () => ({
    previewSlide: ref({
      id: 'regen_2',
      kind: 'content',
      title: '新方案页',
      bullets: ['新的结论'],
      regeneratable: true,
    }),
    regenerateCurrentSlide: vi.fn(() => Promise.resolve()),
    acceptPreviewReplaceCurrent: vi.fn(() => Promise.resolve({
      versionId: 'version_2',
      slides: [],
    })),
    clearPreview: vi.fn(),
  }),
}))

afterEach(() => {
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

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

    await nextTick()

    expect(host.querySelectorAll('.thumbnail-slide')).toHaveLength(2)
    expect(host.querySelector('.compare-grid')).not.toBeNull()
    expect(host.textContent).toContain('当前页面')
    expect(host.textContent).toContain('新生成页面')
    expect(host.textContent).toContain('标题已重写')
    expect(host.textContent).toContain('新的结论')
    expect(host.textContent).toContain('保留当前页')
    expect(host.textContent).toContain('替换为新页')
  })
})
