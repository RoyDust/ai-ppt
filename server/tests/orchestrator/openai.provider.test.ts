import { describe, expect, it } from 'vitest'

import { OpenAIProvider } from '../../libs/ai-orchestrator/src/providers/openai.provider'

describe('OpenAIProvider', () => {
  it('sanitizes meta prompt phrases out of visible slide text', async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                id: 'deck_1',
                topic: '足球起源',
                goalPageCount: 4,
                actualPageCount: 4,
                language: 'zh-CN',
                outlineSummary: '足球起源导览',
                slides: [
                  {
                    id: 'slide_1',
                    kind: 'cover',
                    title: '绿茵起源：足球如何走向世界',
                    summary: '副标题：用一页封面建立主题气质，突出足球从古代游戏演变为全球运动的核心线索。',
                    bullets: [
                      '副标题：从古代蹴鞠到现代世界杯',
                      '关键词：起源、规则、职业化、全球传播',
                      '设计说明：适合在标题下加入抽象球场线条',
                      '真正内容：理解足球全球化的三条主线',
                    ],
                    regeneratable: true,
                    metadata: {
                      layoutTemplate: 'cover_photo',
                      pageNumber: 1,
                    },
                  },
                ],
              }),
            },
          },
        ],
      }),
    }) as any

    const provider = new OpenAIProvider({
      apiKey: 'test-key',
      baseURL: 'http://test.local/v1',
      model: 'test-model',
      fetchImpl,
    })

    const result = await provider.planDeck({
      topic: '足球起源',
      goalPageCount: 4,
      language: 'zh-CN',
    })

    const slide = result.deck.slides[0]
    expect(slide.summary).toBe('')
    expect(slide.bullets).toEqual(['真正内容：理解足球全球化的三条主线'])
  })
})
