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
    const fetchImpl = vi.fn(async () => ({
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
    })) as any

    const provider = new OpenAIProvider({
      apiKey: 'test-key',
      baseURL: 'http://test.local/v1',
      model: 'test-model',
      fetchImpl,
      searchFetcher: vi.fn(async () => []),
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

  it('normalizes explicit planning draft fields during plan generation', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                id: 'deck_plan_with_draft',
                topic: '独居家电关联购买研究',
                goalPageCount: 2,
                actualPageCount: 2,
                language: 'zh-CN',
                outlineSummary: '围绕关联动机、场景组合与策略机会形成策划稿',
                slides: [
                  {
                    id: 'slide_1',
                    kind: 'content',
                    title: '组合购买背后的真实触发点',
                    summary: '从独居做饭、空间压力与效率需求三个方向切入。',
                    bullets: ['先看触发场景', '再看功能互补', '最后落到电商策略'],
                    regeneratable: true,
                    planningDraft: {
                      pageGoal: '解释独居用户为什么会产生跨品类关联购买',
                      coreMessage: '关联购买不是凑单，而是场景驱动下的功能组合决策',
                      audienceTakeaway: '听众应理解场景压力与功能互补才是组合成交的真正原因',
                      supportingPoints: ['一人食频次提升组合需求', '小空间限制强化多功能组合', '减少决策次数本身就是价值'],
                      evidenceHints: ['用户原始研究中的独居场景描述', '平台已观测到的电饭煲+空气炸锅组合'],
                      narrativeFlow: '先场景，后动机，再落策略',
                      recommendedLayout: 'master_split',
                      visualDirection: '左侧场景触发，右侧功能互补解释',
                      designNotes: ['不要写成方法论空话'],
                      forbiddenContent: ['不要出现系统提示词'],
                      sourceAnchors: ['项目背景', '项目目标'],
                    },
                    metadata: {
                      layoutTemplate: 'master_split',
                      pageNumber: 1,
                    },
                  },
                ],
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

    const result = await provider.planDeck({
      topic: '独居家电关联购买研究',
      goalPageCount: 2,
      language: 'zh-CN',
    })

    expect(result.deck.slides[0]?.planningDraft).toEqual({
      pageGoal: '解释独居用户为什么会产生跨品类关联购买',
      coreMessage: '关联购买不是凑单，而是场景驱动下的功能组合决策',
      audienceTakeaway: '听众应理解场景压力与功能互补才是组合成交的真正原因',
      supportingPoints: ['一人食频次提升组合需求', '小空间限制强化多功能组合', '减少决策次数本身就是价值'],
      evidenceHints: ['用户原始研究中的独居场景描述', '平台已观测到的电饭煲+空气炸锅组合'],
      narrativeFlow: '先场景，后动机，再落策略',
      recommendedLayout: 'master_split',
      visualDirection: '左侧场景触发，右侧功能互补解释',
      designNotes: ['不要写成方法论空话'],
      forbiddenContent: ['不要出现系统提示词'],
      sourceAnchors: ['项目背景', '项目目标'],
    })
  })

  it('injects user research input and external findings into the planning prompt', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                id: 'deck_1',
                topic: '独居家电关联购买研究',
                goalPageCount: 10,
                actualPageCount: 10,
                language: 'zh-CN',
                outlineSummary: '围绕动机、场景、机会与策略形成结构化规划',
                slides: [],
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
      searchFetcher: vi.fn(async () => [
        {
          title: '独居经济持续升温',
          snippet: '公开报道显示，独居人群带动一人食、小家电与便捷消费场景增长。',
          source: 'Example Source',
        },
      ]),
    })

    await provider.planDeck({
      inputMode: 'research',
      topic: '独居家电关联购买研究',
      goalPageCount: 10,
      language: 'zh-CN',
      researchBrief: '项目背景：平台已观测到电饭煲+空气炸锅关联购买行为',
      researchInput: {
        projectBackground: ['平台已观测到电饭煲+空气炸锅关联购买行为'],
        projectObjectives: ['挖掘独居用户关联购买的底层逻辑'],
        sampleDesign: ['ezTest+ezTalk'],
        researchFramework: ['购买组合与品类渗透现状分析'],
      },
    })

    const requestPayload = JSON.parse(fetchImpl.mock.calls[0][1].body)
    const systemPrompt = requestPayload.messages[0].content as string
    const userPrompt = requestPayload.messages[2].content as string

    expect(systemPrompt).toContain('如果用户提供了研究资料，必须优先提炼其中的事实')
    expect(systemPrompt).toContain('禁止生成“背景介绍、现状分析、总结建议”这种万能废话页名')
    expect(userPrompt).toContain('项目背景')
    expect(userPrompt).toContain('项目目标')
    expect(userPrompt).toContain('样本设计')
    expect(userPrompt).toContain('外部检索补充')
    expect(userPrompt).toContain('独居经济持续升温')
  })

  it('injects local ppt skill guidance into the planning prompt', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                id: 'deck_1',
                topic: '独居家电关联购买研究',
                goalPageCount: 10,
                actualPageCount: 10,
                language: 'zh-CN',
                outlineSummary: '围绕动机、场景、机会与策略形成结构化规划',
                slides: [],
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
      searchFetcher: vi.fn(async () => []),
    })

    await provider.planDeck({
      topic: '独居家电关联购买研究',
      goalPageCount: 10,
      language: 'zh-CN',
    })

    const requestPayload = JSON.parse(fetchImpl.mock.calls[0][1].body)
    const skillPrompt = requestPayload.messages[1].content as string

    expect(skillPrompt).toContain('PPT 的灵魂是内容，不是皮囊')
    expect(skillPrompt).toContain('Planning Draft / 策划稿生成')
    expect(requestPayload.messages[0].content).toContain('planningDraft')
  })

  it('includes page-count range guidance in the planning prompt', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                id: 'deck_1',
                topic: '季度复盘',
                goalPageCount: 12,
                actualPageCount: 12,
                language: 'zh-CN',
                outlineSummary: '围绕重点业务、问题与动作形成复盘',
                slides: [],
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
      searchFetcher: vi.fn(async () => []),
    })

    await provider.planDeck({
      topic: '季度复盘',
      goalPageCount: 12,
      pageCountRange: {
        key: 'standard',
        label: '11-15 页',
        min: 11,
        max: 15,
        suggested: 12,
      },
      language: 'zh-CN',
    })

    const requestPayload = JSON.parse(fetchImpl.mock.calls[0][1].body)
    const userPrompt = requestPayload.messages[2].content as string
    expect(userPrompt).toContain('页数范围：11-15 页')
    expect(userPrompt).toContain('最少 11 页，最多 15 页')
  })

  it('retries plan generation once when the first result is too generic', async () => {
    let attempt = 0
    const fetchImpl = vi.fn(async (_url, options: any) => {
      const body = JSON.parse(options.body)
      attempt += 1

      if (attempt === 1) {
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    id: 'deck_generic',
                    topic: '独居家电关联购买研究',
                    goalPageCount: 2,
                    actualPageCount: 2,
                    language: 'zh-CN',
                    outlineSummary: '背景介绍与总结建议',
                    slides: [
                      {
                        id: 'slide_1',
                        kind: 'content',
                        title: '背景介绍',
                        summary: '介绍研究背景。',
                        bullets: ['背景一', '背景二'],
                        planningDraft: {
                          pageGoal: '介绍背景',
                          coreMessage: '这是背景',
                          supportingPoints: ['背景一'],
                          evidenceHints: [],
                          recommendedLayout: 'master_split',
                        },
                        regeneratable: true,
                        metadata: { layoutTemplate: 'master_split', pageNumber: 1 },
                      },
                      {
                        id: 'slide_2',
                        kind: 'summary',
                        title: '总结建议',
                        summary: '总结建议。',
                        bullets: ['建议一'],
                        planningDraft: {
                          pageGoal: '总结建议',
                          coreMessage: '给出建议',
                          supportingPoints: ['建议一'],
                          evidenceHints: [],
                          recommendedLayout: 'master_summary',
                        },
                        regeneratable: true,
                        metadata: { layoutTemplate: 'master_summary', pageNumber: 2 },
                      },
                    ],
                  }),
                },
              },
            ],
          }),
        } as any
      }

      expect(body.messages[2].content).toContain('上一次规划存在以下问题')
      expect(body.messages[2].content).toContain('标题过于空泛')
      expect(body.messages[2].content).toContain('证据线索偏弱')

      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  id: 'deck_better',
                  topic: '独居家电关联购买研究',
                  goalPageCount: 2,
                  actualPageCount: 2,
                  language: 'zh-CN',
                  outlineSummary: '从独居场景、功能互补与生意机会三层推进',
                  slides: [
                    {
                      id: 'slide_1',
                      kind: 'content',
                      title: '独居厨房为什么会触发组合购买',
                      summary: '先解释场景压力，再解释功能互补。',
                      bullets: ['厨房面积有限', '一人食频率高'],
                      planningDraft: {
                        pageGoal: '解释组合购买的真实触发场景',
                        coreMessage: '组合购买首先是场景效率问题，而不是单纯凑单',
                        supportingPoints: ['厨房面积有限', '减少重复决策'],
                        evidenceHints: ['项目背景提到电饭煲+空气炸锅', '独居场景需求增长'],
                        recommendedLayout: 'master_split',
                      },
                      regeneratable: true,
                      metadata: { layoutTemplate: 'master_split', pageNumber: 1 },
                    },
                  ],
                }),
              },
            },
          ],
        }),
      } as any
    })

    const provider = new OpenAIProvider({
      apiKey: 'test-key',
      baseURL: 'http://test.local/v1',
      model: 'test-model',
      fetchImpl,
    })

    const result = await provider.planDeck({
      inputMode: 'research',
      topic: '独居家电关联购买研究',
      goalPageCount: 2,
      language: 'zh-CN',
      researchInput: {
        projectBackground: ['平台已观测到电饭煲+空气炸锅组合'],
        projectObjectives: ['挖掘独居用户的关联购买动机'],
      },
    })

    expect(attempt).toBe(2)
    expect(result.deck.id).toBe('deck_better')
    expect(result.deck.slides[0]?.title).toBe('独居厨房为什么会触发组合购买')
  })

  it('renders an edited planning deck into a richer final deck through second-pass ai', async () => {
    const fetchImpl = vi.fn(async () => ({
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
    })) as any

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
            planningDraft: {
              pageGoal: '用首页建立演示主线',
              coreMessage: '网球职业化是规则、传播和赛事共同推动的结果',
              supportingPoints: ['先讲起源', '再讲规则定型'],
              recommendedLayout: 'master_cover',
            },
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
    const requestPayload = JSON.parse(fetchImpl.mock.calls[0][1].body)
    expect(requestPayload.messages[1].content).toContain('Content leads, design follows.')
    expect(requestPayload.messages[0].content).toContain('planningDraft')
    expect(requestPayload.messages[2].content).toContain('pageGoal')
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
        planningDraft: {
          pageGoal: '解释功能互补如何带来组合购买',
          coreMessage: '场景效率是组合购买的第一驱动',
          supportingPoints: ['厨房空间有限', '减少单次决策成本'],
          recommendedLayout: 'master_split',
        },
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
    const skillPrompt = requestPayload.messages[1].content as string
    const userPayload = JSON.parse(requestPayload.messages[2].content as string)

    expect(systemPrompt).toContain('当前 PPT 实际页面内容是主要改写依据')
    expect(systemPrompt).toContain('优先保持当前页的页面职责')
    expect(systemPrompt).toContain('优先沿用当前页的 layoutTemplate')
    expect(systemPrompt).toContain('planningDraft 是当前页改写的首要约束')
    expect(skillPrompt).toContain('Preserve page purpose before changing expression.')
    expect(userPayload.currentPptSlideSummary.title).toBe('当前 PPT 标题')
    expect(userPayload.currentSlide.metadata.layoutTemplate).toBe('master_split')
    expect(userPayload.currentSlide.planningDraft.pageGoal).toBe('解释功能互补如何带来组合购买')
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
