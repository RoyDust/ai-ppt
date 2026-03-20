import { describe, expect, it, vi } from 'vitest'

import { OpenAIProvider } from '../../libs/ai-orchestrator/src/providers/openai.provider'

describe('OpenAIProvider', () => {
  it('uses a diversified fallback template sequence without adjacent duplicates', async () => {
    const provider = new OpenAIProvider()

    const result = await provider.planDeck({
      topic: '冰球入门',
      goalPageCount: 10,
      language: 'zh-CN',
    })

    const templates = result.deck.slides.map(slide => String(slide.metadata?.layoutTemplate))
    expect(result.deck.templateId).toBe('MASTER_TEMPLATE_AI')
    expect(new Set(templates).size).toBeGreaterThanOrEqual(6)

    for (let index = 1; index < templates.length; index++) {
      expect(templates[index]).not.toBe(templates[index - 1])
    }
  })

  it('builds topic-aligned fallback slides instead of leaking hockey-specific copy', async () => {
    const provider = new OpenAIProvider()

    const result = await provider.planDeck({
      topic: '网球发展史',
      goalPageCount: 10,
      language: 'zh-CN',
    })

    const visibleText = result.deck.slides
      .flatMap(slide => [slide.title, slide.summary, ...(slide.bullets ?? [])])
      .join(' ')

    expect(visibleText).toContain('网球')
    expect(visibleText).not.toContain('冰球')
    expect(visibleText).not.toContain('前锋')
    expect(visibleText).not.toContain('守门员')
    expect(visibleText).not.toContain('冰面')
  })

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
                      layoutTemplate: 'master_cover',
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

  it('renders an edited planning deck into a richer final deck through second-pass ai', async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                id: 'deck_rendered_1',
                topic: '网球发展史',
                goalPageCount: 2,
                actualPageCount: 2,
                language: 'zh-CN',
                outlineSummary: '从起源、定型到职业化的演进脉络',
                slides: [
                  {
                    id: 'slide_1',
                    kind: 'cover',
                    title: '网球如何走向现代职业体系',
                    subtitle: '从草地传统到全球职业巡回赛',
                    summary: '用一页建立历史主线与观看抓手。',
                    bullets: ['起源', '规则定型', '职业化扩张'],
                    keyHighlights: ['草地传统', '规则统一', '公开赛时代'],
                    bodySections: [
                      { heading: '历史主线', text: '先看起源，再看规则定型，最后看职业化。' },
                    ],
                    regeneratable: true,
                    metadata: {
                      layoutTemplate: 'master_cover',
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

    const result = await provider.renderDeck({
      deck: {
        id: 'deck_plan_1',
        topic: '网球发展史',
        goalPageCount: 2,
        actualPageCount: 2,
        language: 'zh-CN',
        outlineSummary: '用户编辑后的 planning deck',
        slides: [
          {
            id: 'slide_1',
            kind: 'cover',
            title: '用户改过的封面标题',
            summary: '用户改过的封面摘要',
            bullets: ['起源', '职业化'],
            regeneratable: true,
          },
        ],
      },
    } as any)

    expect(result.deck.slides[0]?.title).toBe('网球如何走向现代职业体系')
    expect((result.deck.slides[0] as any).subtitle).toBe('从草地传统到全球职业巡回赛')
    expect((result.deck.slides[0] as any).keyHighlights).toEqual(['草地传统', '规则统一', '公开赛时代'])
    expect((result.deck.slides[0] as any).bodySections).toEqual([
      { heading: '历史主线', text: '先看起源，再看规则定型，最后看职业化。' },
    ])
  })

  it('renders a regenerated slide through the llm instead of local fallback', async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                slide: {
                  id: 'slide_regen_2',
                  kind: 'content',
                  title: '独居人群为什么会连带购买小家电',
                  subtitle: '从单品选择转向场景组合',
                  summary: '先解释触发场景，再说明功能互补和决策路径。',
                  bullets: ['一人食场景驱动组合购买', '功能互补降低决策成本', '空间效率影响最终选择'],
                  bodySections: [
                    { heading: '触发场景', text: '做饭频率高、厨房空间有限时，组合购买意愿明显上升。' },
                  ],
                  keyHighlights: ['一人食', '功能互补', '省空间'],
                  regeneratable: true,
                  metadata: {
                    layoutTemplate: 'master_split',
                    pageNumber: 2,
                  },
                },
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

    const result = await provider.regenerateSlide({
      deckId: 'deck_1',
      slideId: 'slide_2',
      topic: '独居人群家电关联购买研究',
      language: 'zh-CN',
      templateId: 'MASTER_TEMPLATE_AI',
      designSystem: 'master-template-ai',
      goalPageCount: 10,
      outlineSummary: '理解关联购买动机与组合机会',
      regenerateMode: 'content_and_layout',
      prompt: '强调功能互补',
      currentSlide: {
        id: 'slide_2',
        kind: 'content',
        title: '原始页',
      },
      neighboringSlides: [
        { id: 'slide_1', kind: 'cover', title: '封面' },
        { id: 'slide_3', kind: 'summary', title: '总结' },
      ],
      deckOutline: [
        { id: 'slide_1', kind: 'cover', title: '封面' },
        { id: 'slide_2', kind: 'content', title: '原始页' },
        { id: 'slide_3', kind: 'summary', title: '总结' },
      ],
    } as any)

    expect(result.slide).toMatchObject({
      id: 'slide_regen_2',
      kind: 'content',
      title: '独居人群为什么会连带购买小家电',
      subtitle: '从单品选择转向场景组合',
      summary: '先解释触发场景，再说明功能互补和决策路径。',
      bullets: ['一人食场景驱动组合购买', '功能互补降低决策成本', '空间效率影响最终选择'],
      keyHighlights: ['一人食', '功能互补', '省空间'],
      metadata: {
        layoutTemplate: 'master_split',
        pageNumber: 2,
      },
    })
  })

  it('tells the llm to preserve the current slide role and layout context during regeneration', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                slide: {
                  id: 'slide_regen_3',
                  kind: 'content',
                  title: '新的标题',
                  summary: '新的摘要',
                  bullets: ['新要点'],
                  regeneratable: true,
                  metadata: {
                    layoutTemplate: 'master_split',
                    pageNumber: 2,
                  },
                },
              }),
            },
          },
        ],
      }),
    })) as any

    const provider = new OpenAIProvider({
      apiKey: 'test-key',
      baseURL: 'http://test.local/v1',
      model: 'test-model',
      fetchImpl,
    })

    await provider.regenerateSlide({
      deckId: 'deck_1',
      slideId: 'slide_2',
      topic: '独居人群家电关联购买研究',
      language: 'zh-CN',
      templateId: 'MASTER_TEMPLATE_AI',
      designSystem: 'master-template-ai',
      goalPageCount: 10,
      outlineSummary: '理解关联购买动机与组合机会',
      regenerateMode: 'content_and_layout',
      prompt: '强调功能互补',
      currentSlide: {
        id: 'slide_2',
        kind: 'content',
        title: '原始页',
        metadata: {
          layoutTemplate: 'master_split',
          pageNumber: 2,
        },
      },
      currentPptSlideSummary: {
        title: '当前 PPT 标题',
        summary: ['当前 PPT 摘要'],
        bullets: ['当前 PPT 要点'],
        textElements: [
          { textType: 'title', text: '当前 PPT 标题', left: 84, top: 52, width: 640, height: 72 },
          { textType: 'content', text: '当前 PPT 摘要', left: 84, top: 138, width: 620, height: 58 },
        ],
      },
      neighboringSlides: [
        { id: 'slide_1', kind: 'cover', title: '封面' },
        { id: 'slide_3', kind: 'summary', title: '总结' },
      ],
      deckOutline: [
        { id: 'slide_1', kind: 'cover', title: '封面' },
        { id: 'slide_2', kind: 'content', title: '原始页' },
        { id: 'slide_3', kind: 'summary', title: '总结' },
      ],
    } as any)

    const requestPayload = JSON.parse(fetchImpl.mock.calls[0][1].body)
    const systemPrompt = requestPayload.messages[0].content as string
    const userPayload = JSON.parse(requestPayload.messages[1].content as string)

    expect(systemPrompt).toContain('当前 PPT 实际页面内容是主要改写依据')
    expect(systemPrompt).toContain('优先保持当前页的页面职责')
    expect(systemPrompt).toContain('优先沿用当前页的 layoutTemplate')
    expect(userPayload.currentPptSlideSummary.title).toBe('当前 PPT 标题')
    expect(userPayload.currentSlide.metadata.layoutTemplate).toBe('master_split')
  })

  it('falls back instead of hanging forever when plan request times out', async () => {
    const fetchImpl = () => new Promise(() => undefined) as any

    const provider = new OpenAIProvider({
      apiKey: 'test-key',
      baseURL: 'http://test.local/v1',
      model: 'test-model',
      fetchImpl,
      requestTimeoutMs: 10,
    } as any)

    const outcome = await Promise.race([
      provider.planDeck({
        topic: '网球发展史',
        goalPageCount: 8,
        language: 'zh-CN',
      }).then(result => result.deck.templateId),
      new Promise(resolve => setTimeout(() => resolve('timed_out'), 50)),
    ])

    expect(outcome).toBe('MASTER_TEMPLATE_AI')
  })

  it('fails render instead of hanging forever when render request times out', async () => {
    const fetchImpl = () => new Promise(() => undefined) as any

    const provider = new OpenAIProvider({
      apiKey: 'test-key',
      baseURL: 'http://test.local/v1',
      model: 'test-model',
      fetchImpl,
      requestTimeoutMs: 10,
    } as any)

    const outcome = await Promise.race([
      provider.renderDeck({
        deck: {
          id: 'deck_plan_1',
          topic: '网球发展史',
          goalPageCount: 2,
          actualPageCount: 2,
          language: 'zh-CN',
          outlineSummary: '用户编辑后的 planning deck',
          templateId: 'MASTER_TEMPLATE_AI',
          slides: [
            {
              id: 'slide_1',
              kind: 'cover',
              title: '用户改过的封面标题',
              summary: '用户改过的封面摘要',
              bullets: ['起源', '职业化'],
              regeneratable: true,
            },
          ],
        },
      } as any).then(() => 'resolved').catch((error: Error) => error.message),
      new Promise(resolve => setTimeout(() => resolve('timed_out'), 50)),
    ])

    expect(String(outcome)).toContain('timed out')
  })
})
