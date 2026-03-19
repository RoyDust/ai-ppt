import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAITasksStore } from '@/ai/stores/aiTasks'
import { useAIDeckStore } from '@/ai/stores/aiDeck'

describe('frontend ai stores', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('tracks planning state separately from editor state', () => {
    const store = useAITasksStore()
    store.setPlanningState('loading')
    expect(store.planningState).toBe('loading')
    store.setRenderState('error')
    store.setRenderError('render failed')
    store.setLastPolledAt('2026-03-19 16:30:00')
    expect(store.renderState).toBe('error')
    expect(store.renderError).toBe('render failed')
    expect(store.lastPolledAt).toBe('2026-03-19 16:30:00')
  })

  it('keeps an editable deck copy separate from the planned deck', () => {
    const store = useAIDeckStore()

    store.setPlan({
      plannedPageCount: 2,
      slides: [
        {
          id: 'slide_1',
          kind: 'cover',
          title: '原始标题',
          summary: '原始摘要',
          bullets: ['原始要点 1'],
          regeneratable: true,
        },
      ],
      deck: {
        id: 'deck_1',
        topic: '测试主题',
        goalPageCount: 2,
        actualPageCount: 2,
        language: 'zh-CN',
        outlineSummary: '原始大纲摘要',
        slides: [
          {
            id: 'slide_1',
            kind: 'cover',
            title: '原始标题',
            summary: '原始摘要',
            bullets: ['原始要点 1'],
            regeneratable: true,
          },
        ],
      },
    })

    store.updateOutlineSummary('已编辑摘要')
    store.updateSlideTitle('slide_1', '已编辑标题')
    store.updateSlideSummary('slide_1', '已编辑页面摘要')
    store.updateSlideBullets('slide_1', ['已编辑要点 1', '已编辑要点 2'])

    expect(store.plannedDeck?.outlineSummary).toBe('原始大纲摘要')
    expect(store.plannedDeck?.slides[0]?.title).toBe('原始标题')
    expect(store.editableDeck?.outlineSummary).toBe('已编辑摘要')
    expect(store.editableDeck?.slides[0]?.title).toBe('已编辑标题')
    expect(store.editableDeck?.slides[0]?.summary).toBe('已编辑页面摘要')
    expect(store.editableDeck?.slides[0]?.bullets).toEqual(['已编辑要点 1', '已编辑要点 2'])
  })
})
