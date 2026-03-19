import { describe, expect, it, vi } from 'vitest'

vi.mock('@nestjs/common', () => ({
  Injectable: () => () => undefined,
  Optional: () => () => undefined,
}))

import { AiService } from '../../apps/api/src/modules/ai/ai.service'

describe('AiService', () => {
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
})
