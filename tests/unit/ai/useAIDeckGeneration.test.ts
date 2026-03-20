import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMainStore } from '@/store/main'
import message from '@/utils/message'

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

vi.mock('@/utils/message', () => ({
  default: {
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('useAIDeckGeneration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    planDeckMock.mockClear()
    vi.mocked(message.error).mockClear()
    vi.mocked(message.warning).mockClear()
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

  it('accepts rendered deck by task id without reposting full slides payload', async () => {
    const { acceptDeckRender } = await import('@/ai/services/aiDeck')
    const { default: useAIDeckGeneration } = await import('@/ai/hooks/useAIDeckGeneration')
    const generation = useAIDeckGeneration()

    await generation.createPlan({ topic: '大学生职业生涯规划', goalPageCount: 10, language: 'zh-CN' })
    await generation.renderPlannedDeck()

    expect(acceptDeckRender).toHaveBeenCalledWith({
      deckId: 'deck_1',
      createdBy: 'system',
      sourceTaskId: 'task_1',
    })
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

  it('retries plan generation once and warns the user when the first attempt fails', async () => {
    planDeckMock
      .mockRejectedValueOnce(new Error('first failure'))
      .mockResolvedValueOnce({
        deck: {
          id: 'deck_retry',
          topic: '重试成功',
          goalPageCount: 10,
          actualPageCount: 10,
          language: 'zh-CN',
          outlineSummary: '重试后成功',
          slides: [],
        },
        slides: [],
        plannedPageCount: 10,
      } as any)

    const { default: useAIDeckGeneration } = await import('@/ai/hooks/useAIDeckGeneration')
    const generation = useAIDeckGeneration()

    const plan = await generation.createPlan({ topic: '大学生职业生涯规划', goalPageCount: 10, language: 'zh-CN' })

    expect(planDeckMock).toHaveBeenCalledTimes(2)
    expect(message.warning).toHaveBeenCalledWith('首次规划失败，正在自动重试...')
    expect(message.error).not.toHaveBeenCalled()
    expect(plan?.deck.id).toBe('deck_retry')
    expect(generation.step.value).toBe('outline')
  })

  it('updates explicit planning draft fields on editable slides', async () => {
    planDeckMock.mockResolvedValueOnce({
      deck: {
        id: 'deck_draft',
        topic: '研究主题',
        goalPageCount: 10,
        actualPageCount: 10,
        language: 'zh-CN',
        outlineSummary: '摘要',
        slides: [
          {
            id: 'slide_1',
            kind: 'content',
            title: '第一页',
            planningDraft: {
              pageGoal: '原始页目标',
              coreMessage: '原始核心信息',
              supportingPoints: ['原始支撑点'],
            },
            regeneratable: true,
          },
        ],
      },
      slides: [],
      plannedPageCount: 10,
    } as any)

    const { default: useAIDeckGeneration } = await import('@/ai/hooks/useAIDeckGeneration')
    const generation = useAIDeckGeneration()

    await generation.createPlan({ topic: '研究主题', goalPageCount: 10, language: 'zh-CN' })
    generation.updateSlidePlanningDraftField('slide_1', 'pageGoal', '解释真实触发场景')
    generation.updateSlidePlanningDraftField('slide_1', 'coreMessage', '场景压力比价格优惠更能驱动组合购买')
    generation.updateSlidePlanningDraftList('slide_1', 'supportingPoints', '厨房面积有限\n减少反复决策')

    expect(generation.editableDeck.value?.slides[0]?.planningDraft?.pageGoal).toBe('解释真实触发场景')
    expect(generation.editableDeck.value?.slides[0]?.planningDraft?.coreMessage).toBe('场景压力比价格优惠更能驱动组合购买')
    expect(generation.editableDeck.value?.slides[0]?.planningDraft?.supportingPoints).toEqual(['厨房面积有限', '减少反复决策'])
  })
})
