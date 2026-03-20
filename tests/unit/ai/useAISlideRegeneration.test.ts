import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMainStore, useSlidesStore, useSnapshotStore } from '@/store'
import { useAIDeckStore } from '@/ai/stores/aiDeck'

vi.mock('@/ai/services/aiDeck', () => ({
  renderSlide: vi.fn(() => Promise.resolve({
    slide: {
      id: 'regen_1',
      kind: 'content',
      title: '影响职业选择的关键因素',
      bullets: ['个人兴趣与岗位匹配'],
      regeneratable: true,
    },
  })),
  acceptSlideRegeneration: vi.fn(() => Promise.resolve({
    versionId: 'version_2',
    slides: [{
      id: 'regen_1',
      type: 'content',
      elements: [],
      background: { type: 'solid', color: '#ffffff' },
    }],
  })),
}))

describe('useAISlideRegeneration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('stores a preview slide before any live mutation', async () => {
    const { default: useAISlideRegeneration } = await import('@/ai/hooks/useAISlideRegeneration')
    const regeneration = useAISlideRegeneration()
    await regeneration.regenerateCurrentSlide({ deckId: 'deck_1', slideId: 'slide_1' } as any)
    expect(regeneration.previewSlide.value?.id).toBe('regen_1')
  })

  it('submits full deck context when requesting single-slide render', async () => {
    const mainStore = useMainStore()
    const slidesStore = useSlidesStore()
    const aiDeckStore = useAIDeckStore()
    mainStore.setCurrentDeckContext('deck_1', 'version_1')
    slidesStore.setSlides([{ id: 'ppt_slide_1', type: 'cover', elements: [], background: { type: 'solid', color: '#fff' } }] as any)
    slidesStore.setSlides([
      {
        id: 'ppt_slide_2',
        type: 'content',
        background: { type: 'solid', color: '#fff' },
        elements: [
          {
            id: 'title_el',
            type: 'text',
            textType: 'title',
            left: 84,
            top: 52,
            width: 640,
            height: 72,
            rotate: 0,
            content: '<p>当前 PPT 标题</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#132238',
          },
          {
            id: 'summary_el',
            type: 'text',
            textType: 'content',
            left: 84,
            top: 138,
            width: 620,
            height: 58,
            rotate: 0,
            content: '<p>当前 PPT 摘要</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#475569',
          },
          {
            id: 'item_el',
            type: 'text',
            textType: 'item',
            left: 108,
            top: 214,
            width: 240,
            height: 66,
            rotate: 0,
            content: '<p>当前 PPT 要点</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#1f2937',
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
      templateId: 'MASTER_TEMPLATE_AI',
      designSystem: 'master-template-ai',
      slides: [
        { id: 'slide_1', kind: 'cover', title: '封面', regeneratable: true },
        {
          id: 'slide_2',
          kind: 'content',
          title: '核心机会',
          bullets: ['原始内容'],
          planningDraft: {
            pageGoal: '解释职业选择的关键驱动因素',
            coreMessage: '岗位匹配度比短期热度更重要',
            supportingPoints: ['兴趣与岗位匹配', '长期成长空间'],
            recommendedLayout: 'master_split',
          },
          regeneratable: true,
        },
        { id: 'slide_3', kind: 'summary', title: '总结', regeneratable: true },
      ],
    } as any)

    const { renderSlide } = await import('@/ai/services/aiDeck')
    const { default: useAISlideRegeneration } = await import('@/ai/hooks/useAISlideRegeneration')
    const regeneration = useAISlideRegeneration()

    await regeneration.regenerateCurrentSlide({
      deckId: 'deck_1',
      slideId: 'slide_2',
      instructions: '强化业务建议',
    } as any)

    expect(renderSlide).toHaveBeenCalledWith({
      deckId: 'deck_1',
      slideId: 'slide_2',
      instructions: '强化业务建议',
      topic: '职业规划',
      language: 'zh-CN',
      templateId: 'MASTER_TEMPLATE_AI',
      designSystem: 'master-template-ai',
      goalPageCount: 10,
      outlineSummary: '职业规划汇报',
      regenerateMode: 'content_and_layout',
      currentPptSlideSummary: {
        title: '当前 PPT 标题',
        summary: ['当前 PPT 摘要'],
        bullets: ['当前 PPT 要点'],
        textElements: [
          { textType: 'title', text: '当前 PPT 标题', left: 84, top: 52, width: 640, height: 72 },
          { textType: 'content', text: '当前 PPT 摘要', left: 84, top: 138, width: 620, height: 58 },
          { textType: 'item', text: '当前 PPT 要点', left: 108, top: 214, width: 240, height: 66 },
        ],
      },
      currentSlide: {
        id: 'slide_2',
        kind: 'content',
        title: '核心机会',
        bullets: ['原始内容'],
        planningDraft: {
          pageGoal: '解释职业选择的关键驱动因素',
          coreMessage: '岗位匹配度比短期热度更重要',
          supportingPoints: ['兴趣与岗位匹配', '长期成长空间'],
          recommendedLayout: 'master_split',
        },
        regeneratable: true,
      },
      previousSlide: { id: 'slide_1', kind: 'cover', title: '封面', regeneratable: true },
      nextSlide: { id: 'slide_3', kind: 'summary', title: '总结', regeneratable: true },
      deckOutline: [
        { id: 'slide_1', kind: 'cover', title: '封面', planningDraft: undefined },
        {
          id: 'slide_2',
          kind: 'content',
          title: '核心机会',
          planningDraft: {
            pageGoal: '解释职业选择的关键驱动因素',
            coreMessage: '岗位匹配度比短期热度更重要',
            supportingPoints: ['兴趣与岗位匹配', '长期成长空间'],
            recommendedLayout: 'master_split',
          },
        },
        { id: 'slide_3', kind: 'summary', title: '总结', planningDraft: undefined },
      ],
    })
  })

  it('accepts preview by replacing the current slide and updating currentVersionId', async () => {
    const mainStore = useMainStore()
    const slidesStore = useSlidesStore()
    const snapshotStore = useSnapshotStore()
    vi.spyOn(snapshotStore, 'addSnapshot').mockResolvedValue(undefined as never)
    mainStore.setCurrentDeckContext('deck_1', 'version_1')
    slidesStore.setSlides([
      {
        id: 'slide_1',
        type: 'content',
        elements: [{ id: 'el_1' }],
        background: { type: 'solid', color: '#f5f7fb' },
      } as any,
    ])
    slidesStore.updateSlideIndex(0)

    const { acceptSlideRegeneration } = await import('@/ai/services/aiDeck')
    const { default: useAISlideRegeneration } = await import('@/ai/hooks/useAISlideRegeneration')
    const regeneration = useAISlideRegeneration()

    await regeneration.regenerateCurrentSlide({ deckId: 'deck_1', slideId: 'slide_1' } as any)
    const result = await regeneration.acceptPreviewReplaceCurrent()

    expect(acceptSlideRegeneration).toHaveBeenCalledWith(expect.objectContaining({
      deckId: 'deck_1',
      parentVersionId: 'version_1',
      createdBy: 'system',
    }))
    expect(result?.versionId).toBe('version_2')
    expect(mainStore.currentVersionId).toBe('version_2')
    expect(slidesStore.currentSlide.id).toBe('regen_1')
    expect(regeneration.previewSlide.value).toBeNull()
  })

  it('reruns single-slide generation with the last successful payload', async () => {
    const { renderSlide } = await import('@/ai/services/aiDeck')
    vi.mocked(renderSlide)
      .mockResolvedValueOnce({
        slide: {
          id: 'regen_1',
          kind: 'content',
          title: '初次结果',
          bullets: ['版本一'],
          regeneratable: true,
        },
      } as any)
      .mockResolvedValueOnce({
        slide: {
          id: 'regen_2',
          kind: 'content',
          title: '再次结果',
          bullets: ['版本二'],
          regeneratable: true,
        },
      } as any)

    const { default: useAISlideRegeneration } = await import('@/ai/hooks/useAISlideRegeneration')
    const regeneration = useAISlideRegeneration()

    await regeneration.regenerateCurrentSlide({ deckId: 'deck_1', slideId: 'slide_1', instructions: '强化一版' } as any)
    const retried = await regeneration.rerunPreview()

    expect(renderSlide).toHaveBeenLastCalledWith(expect.objectContaining({
      deckId: 'deck_1',
      slideId: 'slide_1',
      instructions: '强化一版',
    }))
    expect(renderSlide).toHaveBeenNthCalledWith(2, expect.objectContaining({
      deckId: 'deck_1',
      slideId: 'slide_1',
      instructions: '强化一版',
    }))
    expect(retried?.slide.id).toBe('regen_2')
    expect(regeneration.previewSlide.value?.id).toBe('regen_2')
  })
})
