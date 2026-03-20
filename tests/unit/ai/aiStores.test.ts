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
          planningDraft: {
            pageGoal: '原始页目标',
            coreMessage: '原始核心观点',
            supportingPoints: ['原始支撑点'],
          },
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
            planningDraft: {
              pageGoal: '原始页目标',
              coreMessage: '原始核心观点',
              supportingPoints: ['原始支撑点'],
            },
            regeneratable: true,
          },
        ],
      },
    })

    store.updateOutlineSummary('已编辑摘要')
    store.updateSlideTitle('slide_1', '已编辑标题')
    store.updateSlideSummary('slide_1', '已编辑页面摘要')
    store.updateSlideBullets('slide_1', ['已编辑要点 1', '已编辑要点 2'])
    store.updateSlidePlanningDraftField('slide_1', 'pageGoal', '已编辑页目标')
    store.updateSlidePlanningDraftField('slide_1', 'coreMessage', '已编辑核心观点')
    store.updateSlidePlanningDraftList('slide_1', 'supportingPoints', ['支撑点 A', '支撑点 B'])

    expect(store.plannedDeck?.outlineSummary).toBe('原始大纲摘要')
    expect(store.plannedDeck?.slides[0]?.title).toBe('原始标题')
    expect(store.plannedDeck?.slides[0]?.planningDraft?.pageGoal).toBe('原始页目标')
    expect(store.editableDeck?.outlineSummary).toBe('已编辑摘要')
    expect(store.editableDeck?.slides[0]?.title).toBe('已编辑标题')
    expect(store.editableDeck?.slides[0]?.summary).toBe('已编辑页面摘要')
    expect(store.editableDeck?.slides[0]?.bullets).toEqual(['已编辑要点 1', '已编辑要点 2'])
    expect(store.editableDeck?.slides[0]?.planningDraft?.pageGoal).toBe('已编辑页目标')
    expect(store.editableDeck?.slides[0]?.planningDraft?.coreMessage).toBe('已编辑核心观点')
    expect(store.editableDeck?.slides[0]?.planningDraft?.supportingPoints).toEqual(['支撑点 A', '支撑点 B'])
  })

  it('hydrates planning draft defaults when plan payload does not provide them', () => {
    const store = useAIDeckStore()

    store.setPlan({
      plannedPageCount: 1,
      slides: [
        {
          id: 'slide_1',
          kind: 'content',
          title: '机会判断',
          summary: '解释为什么这是当前阶段最值得投入的方向。',
          bullets: ['需求持续增长', '转化链路更短'],
          regeneratable: true,
          metadata: { layoutTemplate: 'master_split' },
        },
      ],
      deck: {
        id: 'deck_1',
        topic: '测试主题',
        goalPageCount: 1,
        actualPageCount: 1,
        language: 'zh-CN',
        outlineSummary: '原始大纲摘要',
        slides: [
          {
            id: 'slide_1',
            kind: 'content',
            title: '机会判断',
            summary: '解释为什么这是当前阶段最值得投入的方向。',
            bullets: ['需求持续增长', '转化链路更短'],
            regeneratable: true,
            metadata: { layoutTemplate: 'master_split' },
          },
        ],
      },
    } as any)

    expect(store.editableDeck?.slides[0]?.planningDraft).toEqual({
      pageGoal: '解释为什么这是当前阶段最值得投入的方向。',
      coreMessage: '机会判断',
      audienceTakeaway: '解释为什么这是当前阶段最值得投入的方向。',
      supportingPoints: ['需求持续增长', '转化链路更短'],
      evidenceHints: [],
      narrativeFlow: '解释为什么这是当前阶段最值得投入的方向。',
      recommendedLayout: 'master_split',
      visualDirection: '',
      designNotes: [],
      forbiddenContent: [],
      sourceAnchors: [],
    })
  })
})
