import { describe, expect, it, vi } from 'vitest'

vi.mock('@nestjs/common', () => ({
  Injectable: () => () => undefined,
  Optional: () => () => undefined,
  NotFoundException: class NotFoundException extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'NotFoundException'
    }
  },
}))

import { AiService } from '../../apps/api/src/modules/ai/ai.service'

describe('AiService', () => {
  it('passes full deck and slide context into the single-slide render service', async () => {
    const slideRegeneratorService = {
      regenerate: vi.fn(async () => ({
        slide: {
          id: 'regen_slide_1',
          kind: 'content',
          title: '重新生成的单页',
          bullets: ['新的核心要点'],
          regeneratable: true,
        },
      })),
    }

    const service = new AiService(
      { enqueue: vi.fn(), getJob: vi.fn() } as any,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      slideRegeneratorService as any,
    )

    const result = await service.regenerateSlide({
      deckId: 'deck_1',
      slideId: 'slide_2',
      topic: '职业规划',
      language: 'zh-CN',
      templateId: 'MASTER_TEMPLATE_AI',
      designSystem: 'master-template-ai',
      goalPageCount: 10,
      outlineSummary: '职业规划汇报',
      regenerateMode: 'content_and_layout',
      instructions: '强调市场机会',
      currentSlide: {
        id: 'slide_2',
        kind: 'content',
        title: '原始页',
        bullets: ['原始内容'],
        regeneratable: true,
      },
      previousSlide: {
        id: 'slide_1',
        kind: 'cover',
        title: '封面',
        regeneratable: true,
      },
      nextSlide: {
        id: 'slide_3',
        kind: 'summary',
        title: '总结页',
        regeneratable: true,
      },
      deckOutline: [
        { id: 'slide_1', kind: 'cover', title: '封面' },
        { id: 'slide_2', kind: 'content', title: '原始页' },
        { id: 'slide_3', kind: 'summary', title: '总结页' },
      ],
    })

    expect(slideRegeneratorService.regenerate).toHaveBeenCalledWith({
      deckId: 'deck_1',
      slideId: 'slide_2',
      topic: '职业规划',
      language: 'zh-CN',
      templateId: 'MASTER_TEMPLATE_AI',
      designSystem: 'master-template-ai',
      goalPageCount: 10,
      outlineSummary: '职业规划汇报',
      regenerateMode: 'content_and_layout',
      prompt: '强调市场机会',
      currentSlide: {
        id: 'slide_2',
        kind: 'content',
        title: '原始页',
        bullets: ['原始内容'],
        regeneratable: true,
      },
      neighboringSlides: [
        {
          id: 'slide_1',
          kind: 'cover',
          title: '封面',
          regeneratable: true,
        },
        {
          id: 'slide_3',
          kind: 'summary',
          title: '总结页',
          regeneratable: true,
        },
      ],
      deckOutline: [
        { id: 'slide_1', kind: 'cover', title: '封面' },
        { id: 'slide_2', kind: 'content', title: '原始页' },
        { id: 'slide_3', kind: 'summary', title: '总结页' },
      ],
    })
    expect(result).toEqual({
      slide: {
        id: 'regen_slide_1',
        kind: 'content',
        title: '重新生成的单页',
        bullets: ['新的核心要点'],
        regeneratable: true,
      },
    })
  })

  it('lists compact deck summaries for the deck hub', async () => {
    const decksRepository = {
      listDeckSummaries: vi.fn(async () => [
        {
          id: 'deck_1',
          title: '职业规划',
          status: 'ready',
          thumbnailUrl: 'https://cdn.example.com/deck_1.png',
          updatedAt: new Date('2026-03-20T09:00:00.000Z'),
          actualPageCount: 12,
          currentVersionId: 'version_2',
        },
      ]),
    }

    const service = new AiService(
      { enqueue: vi.fn(), getJob: vi.fn() } as any,
      undefined,
      undefined,
      decksRepository as any,
      undefined,
      undefined,
      undefined,
    )

    const decks = await service.listDecks()

    expect(decksRepository.listDeckSummaries).toHaveBeenCalledWith({
      limit: 50,
      projectId: undefined,
      userId: undefined,
    })
    expect(decks).toEqual([
      {
        id: 'deck_1',
        title: '职业规划',
        status: 'ready',
        thumbnailUrl: 'https://cdn.example.com/deck_1.png',
        updatedAt: new Date('2026-03-20T09:00:00.000Z'),
        actualPageCount: 12,
        currentVersionId: 'version_2',
      },
    ])
  })

  it('creates a missing deck record before accepting the first rendered result', async () => {
    const decksRepository = {
      findDeckSummaryById: vi.fn(async () => null),
      findDefaultProjectIdByUserId: vi.fn(async () => 'system-project'),
      create: vi.fn(async (data) => ({
        ...data,
        status: 'draft',
        language: 'zh-CN',
      })),
      updateCurrentVersion: vi.fn(async () => undefined),
    }
    const deckVersionsRepository = {
      createVersion: vi.fn(async () => ({
        id: 'version_1',
      })),
    }

    const service = new AiService(
      { enqueue: vi.fn(), getJob: vi.fn() } as any,
      undefined,
      deckVersionsRepository as any,
      decksRepository as any,
      undefined,
      undefined,
      undefined,
    )

    const result = await service.acceptDeckRender({
      deckId: 'deck_runtime_1',
      createdBy: 'system',
      sourceTaskId: 'task_render_1',
      pptistSlidesJson: [{ id: 'slide_1' }],
      aiDeckJson: {
        topic: 'AI 周报',
        goalPageCount: 10,
        actualPageCount: 10,
        language: 'zh-CN',
        outlineSummary: 'AI 周报规划',
        slides: [],
      } as any,
    })

    expect(decksRepository.findDeckSummaryById).toHaveBeenCalledWith('deck_runtime_1')
    expect(decksRepository.findDefaultProjectIdByUserId).toHaveBeenCalledWith('system')
    expect(decksRepository.create).toHaveBeenCalledWith({
      id: 'deck_runtime_1',
      projectId: 'system-project',
      userId: 'system',
      title: 'AI 周报',
    })
    expect(deckVersionsRepository.createVersion).toHaveBeenCalledWith(expect.objectContaining({
      deckId: 'deck_runtime_1',
      createdBy: 'system',
    }))
    expect(decksRepository.updateCurrentVersion).toHaveBeenCalledWith('deck_runtime_1', 'version_1')
    expect(result).toEqual(expect.objectContaining({
      id: 'version_1',
      versionId: 'version_1',
    }))
  })

  it('passes user and project scope into deck listing', async () => {
    const decksRepository = {
      listDeckSummaries: vi.fn(async () => []),
    }

    const service = new AiService(
      { enqueue: vi.fn(), getJob: vi.fn() } as any,
      undefined,
      undefined,
      decksRepository as any,
      undefined,
      undefined,
      undefined,
    )

    await service.listDecks({
      userId: 'user_1',
      projectId: 'project_1',
    })

    expect(decksRepository.listDeckSummaries).toHaveBeenCalledWith({
      userId: 'user_1',
      projectId: 'project_1',
      limit: 50,
    })
  })

  it('returns deck detail with current version metadata and slides', async () => {
    const decksRepository = {
      findDeckSummaryById: vi.fn(async () => ({
        id: 'deck_1',
        title: '职业规划',
        status: 'ready',
        thumbnailUrl: 'https://cdn.example.com/deck_1.png',
        updatedAt: new Date('2026-03-20T09:00:00.000Z'),
        actualPageCount: 12,
        currentVersionId: 'version_2',
      })),
    }
    const deckVersionsRepository = {
      findById: vi.fn(async () => ({
        id: 'version_2',
        versionNo: 2,
        titleSnapshot: '职业规划',
        actualPageCount: 12,
        pptistSlidesJson: [{ id: 'slide_1' }],
      })),
    }

    const service = new AiService(
      { enqueue: vi.fn(), getJob: vi.fn() } as any,
      undefined,
      deckVersionsRepository as any,
      decksRepository as any,
      undefined,
      undefined,
      undefined,
    )

    const deck = await service.getDeck('deck_1')

    expect(decksRepository.findDeckSummaryById).toHaveBeenCalledWith('deck_1')
    expect(deckVersionsRepository.findById).toHaveBeenCalledWith('version_2')
    expect(deck).toEqual({
      id: 'deck_1',
      title: '职业规划',
      status: 'ready',
      thumbnailUrl: 'https://cdn.example.com/deck_1.png',
      updatedAt: new Date('2026-03-20T09:00:00.000Z'),
      actualPageCount: 12,
      currentVersionId: 'version_2',
      currentVersion: {
        id: 'version_2',
        versionNo: 2,
        titleSnapshot: '职业规划',
        actualPageCount: 12,
        pptistSlidesJson: [{ id: 'slide_1' }],
      },
    })
  })

  it('throws when deck detail is requested for a missing deck', async () => {
    const decksRepository = {
      findDeckSummaryById: vi.fn(async () => null),
    }

    const service = new AiService(
      { enqueue: vi.fn(), getJob: vi.fn() } as any,
      undefined,
      undefined,
      decksRepository as any,
      undefined,
      undefined,
      undefined,
    )

    await expect(service.getDeck('missing_deck')).rejects.toMatchObject({
      name: 'NotFoundException',
      message: 'Deck missing_deck not found',
    })
  })

  it('returns null currentVersion when currentVersionId is dangling', async () => {
    const decksRepository = {
      findDeckSummaryById: vi.fn(async () => ({
        id: 'deck_1',
        title: '职业规划',
        status: 'ready',
        thumbnailUrl: null,
        updatedAt: new Date('2026-03-20T09:00:00.000Z'),
        actualPageCount: 12,
        currentVersionId: 'version_missing',
      })),
    }
    const deckVersionsRepository = {
      findById: vi.fn(async () => null),
    }

    const service = new AiService(
      { enqueue: vi.fn(), getJob: vi.fn() } as any,
      undefined,
      deckVersionsRepository as any,
      decksRepository as any,
      undefined,
      undefined,
      undefined,
    )

    const deck = await service.getDeck('deck_1')

    expect(deckVersionsRepository.findById).toHaveBeenCalledWith('version_missing')
    expect(deck.currentVersionId).toBe('version_missing')
    expect(deck.currentVersion).toBeNull()
  })

  it('returns planned slides from the planner instead of local stubbed placeholders', async () => {
    const planner = {
      planDeck: vi.fn(async () => ({
        deck: {
          id: 'deck_ai',
          topic: '冰球入门',
          goalPageCount: 8,
          actualPageCount: 8,
          language: 'zh-CN',
          outlineSummary: '面向零基础观众的冰球入门导览',
          templateId: 'MASTER_TEMPLATE_AI',
          slides: [
            {
              id: 'slide_1',
              kind: 'cover',
              title: '为什么冰球值得看',
              bullets: ['先看速度，再看对抗，再看节奏变化'],
              regeneratable: true,
              metadata: { layoutTemplate: 'master_cover' },
            },
            {
              id: 'slide_2',
              kind: 'content',
              title: '看懂一场比赛的最短路径',
              bullets: ['先认球门和换人区', '再认红蓝线和越位线', '最后看攻防转换'],
              regeneratable: true,
              metadata: { layoutTemplate: 'master_split' },
            },
          ],
        },
      })),
    }

    const service = new AiService(
      { enqueue: vi.fn(), getJob: vi.fn() } as any,
      undefined,
      undefined,
      undefined,
      planner as any,
      undefined,
      undefined,
    )

    const plan = await service.planDeck({
      topic: '冰球入门',
      goalPageCount: 8,
      language: 'zh-CN',
    })

    expect(planner.planDeck).toHaveBeenCalledWith('冰球入门', 8, 'zh-CN')
    expect(plan.plannedPageCount).toBe(8)
    expect(plan.deck.outlineSummary).toBe('面向零基础观众的冰球入门导览')
    expect(plan.deck.templateId).toBe('MASTER_TEMPLATE_AI')
    expect(plan.slides[0].title).toBe('为什么冰球值得看')
    expect(plan.slides[1].bullets).toContain('再认红蓝线和越位线')
    expect(plan.slides[1].metadata).toEqual({ layoutTemplate: 'master_split' })
  })

  it('renders from the user-edited deck when deck payload is provided', async () => {
    const planner = {
      planDeck: vi.fn(),
    }
    const editedDeck = {
      id: 'deck_custom',
      topic: '网球发展史',
      goalPageCount: 5,
      actualPageCount: 5,
      language: 'zh-CN',
      outlineSummary: '用户已经改过的规划稿',
      templateId: 'MASTER_TEMPLATE_AI',
      slides: [
        {
          id: 'slide_1',
          kind: 'cover',
          title: '网球如何走向现代职业体系',
          summary: '这是用户在规划阶段改过的封面文案。',
          bullets: ['起源', '规则定型', '全球化'],
          regeneratable: true,
        },
      ],
    }
    const renderer = {
      render: vi.fn(async () => ({
        deck: editedDeck,
        slides: [{ id: 'ppt_slide_1', elements: [] }],
      })),
    }
    const enqueueAsync = vi.fn(async (_type: string, _payload: unknown, runner: () => Promise<unknown>) => {
      const output = await runner()
      return {
        id: 'task_edited',
        status: 'queued',
        output,
      }
    })

    const service = new AiService(
      { enqueueAsync, getJob: vi.fn() } as any,
      undefined,
      undefined,
      undefined,
      planner as any,
      renderer as any,
      undefined,
    )

    const task = await service.renderDeck({
      deckId: editedDeck.id,
      overwrite: true,
      deck: editedDeck as any,
    } as any)

    expect(planner.planDeck).not.toHaveBeenCalled()
    expect(renderer.render).toHaveBeenCalledWith(editedDeck)
    expect(enqueueAsync).toHaveBeenCalledWith(
      'deck_render',
      expect.objectContaining({
        deck: editedDeck,
      }),
      expect.any(Function),
    )
    expect(task.id).toBe('task_edited')
  })

  it('renders deck output through the renderer and queue instead of title-only placeholder slides', async () => {
    const planner = {
      planDeck: vi.fn(async () => ({
        deck: {
          id: 'deck_ai',
          topic: '冰球入门',
          goalPageCount: 6,
          actualPageCount: 6,
          language: 'zh-CN',
          outlineSummary: '零基础冰球观赛导览',
          templateId: 'MASTER_TEMPLATE_AI',
          slides: [{ id: 'slide_1', kind: 'cover', title: '冰球入门', regeneratable: true }],
        },
      })),
    }
    const renderer = {
      render: vi.fn(async () => ({
        deck: {
          id: 'deck_ai',
          topic: '冰球入门',
          goalPageCount: 6,
          actualPageCount: 6,
          language: 'zh-CN',
          outlineSummary: '零基础冰球观赛导览',
          templateId: 'MASTER_TEMPLATE_AI',
          slides: [{ id: 'slide_1', kind: 'cover', title: '冰球入门', regeneratable: true }],
        },
        slides: [
          {
            id: 'ppt_slide_1',
            background: { type: 'solid', color: '#f4f7fb' },
            elements: [
              { id: 'hero', type: 'shape', left: 40, top: 40, width: 920, height: 220, rotate: 0 },
              { id: 'title', type: 'text', left: 72, top: 92, width: 560, height: 96, rotate: 0, content: '<p>冰球入门</p>', defaultFontName: '', defaultColor: '#102033' },
            ],
          },
        ],
      })),
    }
    const enqueueAsync = vi.fn(async (_type: string, _payload: unknown, runner: () => Promise<unknown>) => {
      const output = await runner()
      return {
        id: 'task_1',
        status: 'queued',
        output,
      }
    })

    const service = new AiService(
      { enqueueAsync, getJob: vi.fn() } as any,
      undefined,
      undefined,
      undefined,
      planner as any,
      renderer as any,
      undefined,
    )

    const task = await service.renderDeck({
      topic: '冰球入门',
      goalPageCount: 6,
      language: 'zh-CN',
      overwrite: true,
    })

    expect(planner.planDeck).toHaveBeenCalledWith('冰球入门', 6, 'zh-CN')
    expect(renderer.render).toHaveBeenCalled()
    expect(enqueueAsync).toHaveBeenCalledWith(
      'deck_render',
      expect.objectContaining({ topic: '冰球入门', goalPageCount: 6 }),
      expect.any(Function),
    )
    expect(task.id).toBe('task_1')
  })

  it('marks deck render task as failed when second-pass ai rendering throws', async () => {
    const enqueueAsync = vi.fn(async (_type: string, _payload: unknown, runner: () => Promise<unknown>) => {
      try {
        const output = await runner()
        return { id: 'task_fail', status: 'queued', output }
      }
      catch (error) {
        return { id: 'task_fail', status: 'failed', error: (error as Error).message }
      }
    })

    const service = new AiService(
      { enqueueAsync, getJob: vi.fn() } as any,
      undefined,
      undefined,
      undefined,
      { planDeck: vi.fn() } as any,
      {
        render: vi.fn(async () => {
          throw new Error('LLM render failed')
        }),
      } as any,
      undefined,
    )

    const task = await service.renderDeck({
      deck: {
        id: 'deck_fail',
        topic: '网球发展史',
        goalPageCount: 6,
        actualPageCount: 6,
        language: 'zh-CN',
        outlineSummary: '用户编辑稿',
        templateId: 'MASTER_TEMPLATE_AI',
        slides: [],
      } as any,
      overwrite: true,
    } as any)

    expect(task.status).toBe('failed')
    expect((task as any).error).toBe('LLM render failed')
  })

  it('returns parent version metadata when accepting a regenerated slide result', async () => {
    const deckVersionsRepository = {
      findById: vi.fn(async () => ({
        id: 'version_parent',
        deckId: 'deck_1',
      })),
      createVersion: vi.fn(async (payload) => ({
        id: 'version_child',
        ...payload,
      })),
    }
    const decksRepository = {
      updateCurrentVersion: vi.fn(async () => undefined),
    }

    const service = new AiService(
      { enqueue: vi.fn(), getJob: vi.fn() } as any,
      undefined,
      deckVersionsRepository as any,
      decksRepository as any,
      undefined,
      undefined,
      undefined,
    )

    const result = await service.acceptSlideRegeneration({
      deckId: 'deck_1',
      createdBy: 'user_1',
      sourceTaskId: 'task_regen',
      parentVersionId: 'version_parent',
      pptistSlidesJson: [{ id: 'slide_2' }],
    })

    expect(deckVersionsRepository.createVersion).toHaveBeenCalledWith(expect.objectContaining({
      deckId: 'deck_1',
      sourceTaskId: 'task_regen',
      parentVersionId: 'version_parent',
      sourceType: 'slide_regenerate',
    }))
    expect(deckVersionsRepository.findById).toHaveBeenCalledWith('version_parent')
    expect(decksRepository.updateCurrentVersion).toHaveBeenCalledWith('deck_1', 'version_child')
    expect(result).toEqual(expect.objectContaining({
      id: 'version_child',
      versionId: 'version_child',
      sourceType: 'slide_regenerate',
      parentVersionId: 'version_parent',
    }))
  })

  it('throws when accepting a regenerated slide with a missing parent version', async () => {
    const deckVersionsRepository = {
      findById: vi.fn(async () => null),
      createVersion: vi.fn(),
    }
    const decksRepository = {
      updateCurrentVersion: vi.fn(),
    }

    const service = new AiService(
      { enqueue: vi.fn(), getJob: vi.fn() } as any,
      undefined,
      deckVersionsRepository as any,
      decksRepository as any,
      undefined,
      undefined,
      undefined,
    )

    await expect(service.acceptSlideRegeneration({
      deckId: 'deck_1',
      createdBy: 'user_1',
      sourceTaskId: 'task_regen',
      parentVersionId: 'version_missing',
      pptistSlidesJson: [{ id: 'slide_2' }],
    })).rejects.toMatchObject({
      name: 'NotFoundException',
      message: 'Parent version version_missing not found for deck deck_1',
    })

    expect(deckVersionsRepository.createVersion).not.toHaveBeenCalled()
    expect(decksRepository.updateCurrentVersion).not.toHaveBeenCalled()
  })

  it('throws when accepting a regenerated slide with a parent version from another deck', async () => {
    const deckVersionsRepository = {
      findById: vi.fn(async () => ({
        id: 'version_other',
        deckId: 'deck_other',
      })),
      createVersion: vi.fn(),
    }
    const decksRepository = {
      updateCurrentVersion: vi.fn(),
    }

    const service = new AiService(
      { enqueue: vi.fn(), getJob: vi.fn() } as any,
      undefined,
      deckVersionsRepository as any,
      decksRepository as any,
      undefined,
      undefined,
      undefined,
    )

    await expect(service.acceptSlideRegeneration({
      deckId: 'deck_1',
      createdBy: 'user_1',
      sourceTaskId: 'task_regen',
      parentVersionId: 'version_other',
      pptistSlidesJson: [{ id: 'slide_2' }],
    })).rejects.toMatchObject({
      name: 'NotFoundException',
      message: 'Parent version version_other not found for deck deck_1',
    })

    expect(deckVersionsRepository.createVersion).not.toHaveBeenCalled()
  })

  it('throws when regenerated slide persistence fails instead of returning a success-shaped payload', async () => {
    const deckVersionsRepository = {
      findById: vi.fn(async () => ({
        id: 'version_parent',
        deckId: 'deck_1',
      })),
      createVersion: vi.fn(async () => {
        throw new Error('version create failed')
      }),
    }
    const decksRepository = {
      updateCurrentVersion: vi.fn(),
    }

    const service = new AiService(
      { enqueue: vi.fn(), getJob: vi.fn() } as any,
      undefined,
      deckVersionsRepository as any,
      decksRepository as any,
      undefined,
      undefined,
      undefined,
    )

    await expect(service.acceptSlideRegeneration({
      deckId: 'deck_1',
      createdBy: 'user_1',
      sourceTaskId: 'task_regen',
      parentVersionId: 'version_parent',
      pptistSlidesJson: [{ id: 'slide_2' }],
    })).rejects.toThrow('version create failed')
  })
})
