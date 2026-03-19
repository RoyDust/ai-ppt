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
          slides: [
            {
              id: 'slide_1',
              kind: 'cover',
              title: '为什么冰球值得看',
              bullets: ['先看速度，再看对抗，再看节奏变化'],
              regeneratable: true,
              metadata: { layoutTemplate: 'cover_photo' },
            },
            {
              id: 'slide_2',
              kind: 'content',
              title: '看懂一场比赛的最短路径',
              bullets: ['先认球门和换人区', '再认红蓝线和越位线', '最后看攻防转换'],
              regeneratable: true,
              metadata: { layoutTemplate: 'process_infographic' },
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
    expect(plan.slides[0].title).toBe('为什么冰球值得看')
    expect(plan.slides[1].bullets).toContain('再认红蓝线和越位线')
    expect(plan.slides[1].metadata).toEqual({ layoutTemplate: 'process_infographic' })
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
          slides: [{ id: 'slide_1', kind: 'cover', title: '冰球入门', regeneratable: true }],
        },
      })),
    }
    const renderer = {
      render: vi.fn(() => ({
        deck: {
          id: 'deck_ai',
          topic: '冰球入门',
          goalPageCount: 6,
          actualPageCount: 6,
          language: 'zh-CN',
          outlineSummary: '零基础冰球观赛导览',
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
    const enqueue = vi.fn((_type: string, _payload: unknown, output: unknown) => ({
      id: 'task_1',
      status: 'queued',
      output,
    }))

    const service = new AiService(
      { enqueue, getJob: vi.fn() } as any,
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
    expect(enqueue).toHaveBeenCalledWith(
      'deck_render',
      expect.objectContaining({ topic: '冰球入门', goalPageCount: 6 }),
      expect.objectContaining({
        slides: [
          expect.objectContaining({
            elements: expect.arrayContaining([
              expect.objectContaining({ id: 'hero', type: 'shape' }),
              expect.objectContaining({ id: 'title', type: 'text' }),
            ]),
          }),
        ],
      }),
    )
    expect(task.id).toBe('task_1')
  })
})
