import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMainStore } from '@/store/main'

const planDeckMock = vi.fn(() => Promise.resolve({
  deck: {
    id: 'deck_1',
    topic: '大学生职业生涯规划',
    goalPageCount: 10,
    actualPageCount: 10,
    language: 'zh-CN',
    outlineSummary: '',
    slides: [],
  },
  slides: [],
  plannedPageCount: 10,
}))

vi.mock('@/ai/services/aiDeck', () => ({
  planDeck: planDeckMock,
  renderDeck: vi.fn(() => Promise.resolve({ id: 'task_1', status: 'queued' })),
  acceptDeckRender: vi.fn(() => Promise.resolve({
    versionId: 'version_1',
    slides: [{ id: 'slide_final', elements: [], background: { type: 'solid', color: '#f4f7fb' } }],
  })),
  getAITask: vi.fn(() => Promise.resolve({
    id: 'task_1',
    status: 'succeeded',
    output: {
      deck: { id: 'deck_1', topic: '大学生职业生涯规划', goalPageCount: 10, actualPageCount: 10, language: 'zh-CN', outlineSummary: '', slides: [] },
      slides: [{ id: 'slide_1', elements: [], background: { type: 'solid', color: '#fff' } }],
    },
  })),
}))

const loadSlidesIntoEditor = vi.fn()

vi.mock('@/ai/hooks/useAIDeckLoader', () => ({
  default: () => ({
    loadSlidesIntoEditor,
  }),
}))

describe('useAIDeckGeneration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    planDeckMock.mockClear()
  })

  it('moves to outline review after planning succeeds', async () => {
    const { default: useAIDeckGeneration } = await import('@/ai/hooks/useAIDeckGeneration')
    const generation = useAIDeckGeneration()
    await generation.createPlan({ topic: '大学生职业生涯规划', goalPageCount: 10, language: 'zh-CN' })
    expect(generation.step.value).toBe('outline')
  })

  it('polls task status and loads slides after rendering succeeds', async () => {
    const { default: useAIDeckGeneration } = await import('@/ai/hooks/useAIDeckGeneration')
    const generation = useAIDeckGeneration()
    const mainStore = useMainStore()
    mainStore.setAIPPTDialogState(true)

    await generation.createPlan({ topic: '大学生职业生涯规划', goalPageCount: 10, language: 'zh-CN' })
    await generation.renderPlannedDeck()

    expect(loadSlidesIntoEditor).toHaveBeenCalledWith(
      [{ id: 'slide_final', elements: [], background: { type: 'solid', color: '#f4f7fb' } }],
      true,
    )
    expect(mainStore.showAIPPTDialog).toBe(false)
    expect(generation.step.value).toBe('outline')
  })

  it('retains accepted deck and version identity after render accept', async () => {
    const { default: useAIDeckGeneration } = await import('@/ai/hooks/useAIDeckGeneration')
    const generation = useAIDeckGeneration()
    const mainStore = useMainStore()

    await generation.createPlan({ topic: '大学生职业生涯规划', goalPageCount: 10, language: 'zh-CN' })
    await generation.renderPlannedDeck()

    expect(mainStore.currentDeckId).toBe('deck_1')
    expect(mainStore.currentVersionId).toBe('version_1')
  })

  it('normalizes research mode payloads before planning', async () => {
    const { default: useAIDeckGeneration } = await import('@/ai/hooks/useAIDeckGeneration')
    const generation = useAIDeckGeneration()

    await generation.createPlan({
      inputMode: 'research',
      topic: '  2026 用户研究  ',
      goalPageCount: 99,
      language: 'zh-CN',
      researchInput: {
        projectBackground: ['  背景  ', ''],
        projectObjectives: ['  目标一  ', '   ', '目标二'],
        sampleDesign: [],
        researchFramework: ['  框架  '],
      },
    })

    expect(planDeckMock).toHaveBeenCalledWith({
      inputMode: 'research',
      topic: '2026 用户研究',
      goalPageCount: 15,
      language: 'zh-CN',
      researchInput: {
        projectBackground: ['背景'],
        projectObjectives: ['目标一', '目标二'],
        researchFramework: ['框架'],
      },
    })
  })
})
