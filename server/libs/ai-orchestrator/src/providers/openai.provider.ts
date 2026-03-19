import type { AIDeck } from '../../../ai-schema/src/ai-deck'
import type { AISlide } from '../../../ai-schema/src/ai-slide'
import type { SlideRegenerationContext } from '../../../ai-schema/src/regeneration-context'
import type {
  DeckRenderRequest,
  DeckRenderResult,
  DeckPlanRequest,
  DeckPlanResult,
  LLMProvider,
  SlideRegenerationResult,
} from './llm-provider.interface'

export interface OpenAIProviderOptions {
  apiKey?: string
  baseURL?: string
  model?: string
  fetchImpl?: typeof fetch
  requestTimeoutMs?: number
}

const DEFAULT_MODEL = 'gpt-4.1-mini'
const DEFAULT_REQUEST_TIMEOUT_MS = 300000
const DESIGN_COLORS = ['#b50fb5', '#ffc300', '#fd6525', '#ef155f', '#75bd42']
const DEFAULT_TEMPLATE_ID = 'MASTER_TEMPLATE_AI'
const DEFAULT_DESIGN_SYSTEM = 'master-template-ai'
const DEFAULT_THEME_NAME = 'MASTER_TEMPLATE_AI'

type LayoutTemplate =
  | 'master_cover'
  | 'master_section'
  | 'master_toc'
  | 'master_timeline'
  | 'master_split'
  | 'master_grid'
  | 'master_compare'
  | 'master_table'
  | 'master_summary'
  | 'master_closing'

const DEFAULT_LAYOUT_SEQUENCE: LayoutTemplate[] = [
  'master_cover',
  'master_section',
  'master_toc',
  'master_timeline',
  'master_split',
  'master_grid',
  'master_compare',
  'master_table',
  'master_summary',
  'master_closing',
]

const META_PREFIX_PATTERNS = [
  /^副标题[:：]/,
  /^关键词[:：]/,
  /^设计说明[:：]/,
  /^版式说明[:：]/,
  /^布局说明[:：]/,
  /^页面说明[:：]/,
  /^视觉说明[:：]/,
  /^风格[:：]/,
  /^配色[:：]/,
  /^字体[:：]/,
  /^提示[:：]/,
  /^建议[:：]/,
]

const INTERNAL_PHRASE_PATTERNS = [
  /标题下方/,
  /右侧流程提示区/,
  /右下角页码/,
  /圆形编号/,
  /蓝色装饰线/,
  /橙色垂直分隔线/,
  /占位图/,
  /抽象球场线条/,
  /设计特点/,
]

const extractJson = (content: string) => {
  const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i)
  const raw = fencedMatch?.[1] ?? content
  const firstBrace = raw.indexOf('{')
  const lastBrace = raw.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('No JSON object found in model output')
  }

  return JSON.parse(raw.slice(firstBrace, lastBrace + 1))
}

const topicTokens = (topic: string) =>
  topic
    .split(/[，。；：、,.;:\s]+/)
    .map(token => token.trim())
    .filter(Boolean)

const summarizeTopic = (topic: string) => {
  const tokens = topicTokens(topic)
  if (!tokens.length) return '从背景、结构、关键概念、常见误区和行动建议五个层次展开。'
  return `围绕${tokens.slice(0, 3).join('、')}展开，先建立认知框架，再补充细节与应用场景。`
}

const deriveTopicSubject = (topic: string) => {
  const normalized = topic.replace(/\s+/g, ' ').trim()
  const stripped = normalized
    .replace(/(发展史|历史|演变|入门|介绍|概览|科普|指南|详解|教程)$/u, '')
    .trim()

  return stripped || normalized || '该主题'
}

const sanitizeVisibleText = (value: string) => {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  if (META_PREFIX_PATTERNS.some(pattern => pattern.test(normalized))) return ''
  if (INTERNAL_PHRASE_PATTERNS.some(pattern => pattern.test(normalized))) return ''

  return normalized
    .replace(/^(副标题|关键词|设计说明|版式说明|布局说明|页面说明|视觉说明|风格|配色|字体|提示|建议)[:：]\s*/g, '')
    .trim()
}

const sanitizeVisibleList = (items: string[]) =>
  items
    .map(item => sanitizeVisibleText(item))
    .filter(Boolean)

const sanitizeSectionList = (items: unknown) => {
  if (!Array.isArray(items)) return []

  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const section = item as Record<string, unknown>
      const heading = sanitizeVisibleText(typeof section.heading === 'string' ? section.heading : '')
      const text = sanitizeVisibleText(typeof section.text === 'string' ? section.text : '')
      if (!heading && !text) return null
      return { heading, text }
    })
    .filter(Boolean) as Array<{ heading: string, text: string }>
}

const buildFallbackSlides = (topic: string, goalPageCount: number) => {
  const actualCount = Math.max(8, Math.min(goalPageCount, 10))
  const subject = deriveTopicSubject(topic)
  const baseSlides: Array<Partial<AISlide>> = [
    {
      kind: 'cover',
      title: `${topic}`,
      summary: `这份演示将用零基础视角解释“${topic}”，先建立整体认知，再补充规则、结构和观看方法。`,
      bullets: ['先建立观看框架', '优先解释容易混淆的概念', '每页只保留一个核心 takeaway'],
      designRequirements: ['封面允许使用占位大图营造提案封面气质', '必须展示模板底部彩带和强标题'],
      designFeatures: ['全幅摄影占位', '商务提案式强标题', '底部彩带页脚'],
      layoutInstructions: '使用 master_cover，保留大图背景、左侧标题区与底部彩带。',
      validationResult: '读者在 5 秒内知道演示面向谁、解决什么问题。',
      metadata: { layoutTemplate: 'master_cover', pageNumber: 1 },
    },
    {
      kind: 'content',
      title: '先建立整体认知',
      summary: '先让观众知道这件事是什么、为什么重要、该先看什么。',
      bullets: ['一句话定义主题', '它和常见相近概念有什么区别', '第一次接触时最值得先关注的 3 个点'],
      designRequirements: ['作为章节分隔页，语气醒目有力', '允许使用占位图背景强化气氛'],
      designFeatures: ['章节标题', '斜切装饰条', '大片感占位图'],
      layoutInstructions: '使用 master_section，带 PART 章节标记和大标题。',
      validationResult: '新手能说出这件事“是什么、为什么、先看什么”。',
      metadata: { layoutTemplate: 'master_section', pageNumber: 2 },
    },
    {
      kind: 'content',
      title: `${subject}的发展脉络先看什么`,
      summary: `先解释 ${subject} 从起点到成熟阶段的最小理解闭环，帮助观众快速建立时间框架。`,
      bullets: [
        `${subject} 最早从什么背景中出现`,
        `${subject} 在哪些阶段完成规则或形态定型`,
        `有哪些关键节点推动 ${subject} 走向成熟`,
        `外部环境如何改变 ${subject} 的传播速度`,
        `新手最容易忽略的转折点是什么`,
        `一页先串起“起源-演变-成熟”的主线`,
      ],
      designRequirements: ['采用母版目录/网格页结构', '把阶段要点分成可扫描的信息块'],
      designFeatures: ['目录式编号', '网格信息块', '商务提案留白'],
      layoutInstructions: '使用 master_toc，以目录式编号列表交代阶段主线。',
      validationResult: `观众能先说清 ${subject} 的阶段主线，不会一开始就丢失时间顺序。`,
      metadata: { layoutTemplate: 'master_toc', pageNumber: 3 },
    },
    {
      kind: 'content',
      title: `${subject}如何从早期形态走向成熟`,
      summary: `用时间线展示 ${subject} 在关键历史阶段如何完成扩张、定型和传播。`,
      bullets: [
        `${subject} 的早期形态与原始背景`,
        `${subject} 进入规范化阶段的标志事件`,
        `${subject} 扩散到更大范围的关键推动力`,
        `${subject} 形成当代影响力的节点`,
      ],
      designRequirements: ['按时间顺序组织内容', '每个节点对应一个传播变化'],
      designFeatures: ['时间轴', '节点卡片', '左右交错节奏'],
      layoutInstructions: '使用 master_timeline，节点沿主轴交错分布。',
      validationResult: `观众能按时间顺序复述 ${subject} 的演变路径。`,
      metadata: { layoutTemplate: 'master_timeline', pageNumber: 4 },
    },
    {
      kind: 'content',
      title: `${subject}发展中的三类关键角色`,
      summary: `把推动 ${subject} 演进的核心角色并列呈现，便于理解不同力量如何共同塑造历史。`,
      bullets: [
        `关键人物：谁定义了 ${subject} 的代表性阶段`,
        `组织机构：谁推动了 ${subject} 的规则与标准化`,
        `传播媒介：谁扩大了 ${subject} 的影响范围`,
      ],
      designRequirements: ['角色信息分栏展示', '每栏必须有清晰标签与职责'],
      designFeatures: ['左右内容分区', '编号标签', '提案式分栏'],
      layoutInstructions: '使用 master_split，左侧分点，右侧承接补充说明或图片。',
      validationResult: `观众能区分推动 ${subject} 发展的不同角色。`,
      metadata: { layoutTemplate: 'master_split', pageNumber: 5 },
    },
    {
      kind: 'content',
      title: `${subject}相关载体与表现形式如何变化`,
      summary: `把和 ${subject} 一起演化的工具、场景或表现载体集中解释。`,
      bullets: [
        `${subject} 的核心媒介或工具如何变化`,
        `${subject} 的典型场景或空间如何定型`,
        `${subject} 在不同时期的表现方式有什么差异`,
      ],
      designRequirements: ['内容必须做成并列信息块而不是普通列表', '突出对象与用途'],
      designFeatures: ['四宫格信息卡', '彩色标签', '商务页眉页脚'],
      layoutInstructions: '使用 master_grid，将对象拆成并列信息块。',
      validationResult: `观众能把 ${subject} 的载体变化和历史阶段对应起来。`,
      metadata: { layoutTemplate: 'master_grid', pageNumber: 6 },
    },
    {
      kind: 'content',
      title: `${subject}早期阶段与成熟阶段差别在哪`,
      summary: `通过双栏对照，让观众快速理解 ${subject} 在不同时期最明显的变化。`,
      bullets: [
        `早期阶段：形式更粗糙、规则更松散、传播范围有限`,
        `成熟阶段：结构更稳定、标准更清晰、影响力更广`,
      ],
      designRequirements: ['双栏必须形成明确对照', '避免写成两段普通文字'],
      designFeatures: ['左右对比列', '统一标题', '模板化对照色块'],
      layoutInstructions: '使用 master_compare，左右分别写早期与成熟阶段的差异。',
      validationResult: `观众能快速说出 ${subject} 前后阶段的关键差异。`,
      metadata: { layoutTemplate: 'master_compare', pageNumber: 7 },
    },
    {
      kind: 'content',
      title: `理解${subject}发展史，先抓哪几个关键节点`,
      summary: `把理解 ${subject} 历史最有用的几个指标或时间节点卡片化。`,
      bullets: [
        `起点节点：${subject} 从何时被明确记录或命名`,
        `定型节点：${subject} 在何时形成稳定规则或结构`,
        `扩张节点：${subject} 在何时进入更大范围传播`,
      ],
      designRequirements: ['必须用结构化表格或清单展示', '每一行只解释一个关键节点'],
      designFeatures: ['表头色带', '行列分区', '提案表格节奏'],
      layoutInstructions: '使用 master_table，以表格形式承接关键节点。',
      validationResult: `观众能用少量关键节点概括 ${subject} 的发展史。`,
      metadata: { layoutTemplate: 'master_table', pageNumber: 8 },
    },
    {
      kind: 'summary',
      title: `${subject}发展史里最容易误解的点`,
      summary: `把观众最容易混淆的历史判断压缩成一页警示式说明。`,
      bullets: [
        `不要把 ${subject} 的起源等同于成熟形态`,
        `不要把单一事件误认为 ${subject} 全面定型`,
        `不要忽略规则、技术与传播是同时演进的`,
        `不要只记年份而忽略阶段之间的因果关系`,
      ],
      designRequirements: ['总结页要压缩误区与纠偏结论', '保留模板的提案页信息层次'],
      designFeatures: ['左侧清单', '右侧验证区', '总结色块'],
      layoutInstructions: '使用 master_summary，左侧列误区，右侧列验证结果。',
      validationResult: `观众能避开理解 ${subject} 历史时最常见的误区。`,
      metadata: { layoutTemplate: 'master_summary', pageNumber: 9 },
    },
    {
      kind: 'summary',
      title: `${subject}发展史速记清单`,
      summary: `把前面的信息压缩成一页可以立即复述的 checklist。`,
      bullets: [
        `先说起点：${subject} 从何而来`,
        `再说转折：${subject} 何时完成关键变化`,
        `接着说扩散：${subject} 如何走向更广范围`,
        `最后说影响：${subject} 为什么在今天仍然重要`,
      ],
      designRequirements: ['收尾页必须可复用', '必须有明确结语和收束感'],
      designFeatures: ['结束页', '中心标题', '底部彩带'],
      layoutInstructions: '使用 master_closing，以结束页形式收束整份内容。',
      validationResult: `观众能在一分钟内复述 ${subject} 发展史的主线。`,
      metadata: { layoutTemplate: 'master_closing', pageNumber: 10 },
    },
  ]

  return baseSlides
    .slice(0, actualCount)
    .map((slide, index) => ({
      id: `ai_slide_${index + 1}`,
      title: slide.title ?? `${topic} · 第 ${index + 1} 页`,
      kind: slide.kind ?? 'content',
      summary: slide.summary,
      bullets: slide.bullets ?? [],
      regeneratable: true,
      designRequirements: slide.designRequirements ?? [],
      designFeatures: slide.designFeatures ?? [],
      layoutInstructions: slide.layoutInstructions ?? '',
      validationResult: slide.validationResult ?? '',
      metadata: slide.metadata ?? {
        layoutTemplate: DEFAULT_LAYOUT_SEQUENCE[Math.min(index, DEFAULT_LAYOUT_SEQUENCE.length - 1)],
        pageNumber: index + 1,
      },
    }))
}

const buildFallbackDeck = (input: DeckPlanRequest): AIDeck => {
  const slides = buildFallbackSlides(input.topic, input.goalPageCount)
  return {
    id: `draft_${Date.now()}`,
    topic: input.topic,
    goalPageCount: input.goalPageCount,
    actualPageCount: slides.length,
    language: input.language,
    outlineSummary: summarizeTopic(input.topic),
    templateId: DEFAULT_TEMPLATE_ID,
    designSystem: DEFAULT_DESIGN_SYSTEM,
    themeName: DEFAULT_THEME_NAME,
    designRequirements: [
      '固定采用 MASTER_TEMPLATE_AI 视觉系统与版式族',
      '固定采用模板主题配色：#b50fb5 #ffc300 #fd6525 #ef155f #75bd42',
      '中文强制使用 Microsoft YaHei，英文强制使用 Arial',
      '每页必须保留底部彩带页脚与提案式标题层级',
      '封面、章节、目录、时间线、分栏、表格、总结、结束页必须来自模板布局族',
      '正文不能空泛，必须给出解释、判断抓手或结构化信息',
    ],
    designCharacteristics: ['商务提案风格', '母版彩带页脚', '强标题层级', '目录式信息组织', '统一留白与结构感'],
    contentBlueprint: slides.map(slide => slide.title),
    slides,
  }
}

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai'
  readonly model: string
  private readonly fetchImpl: typeof fetch
  private readonly requestTimeoutMs: number

  constructor(private readonly options: OpenAIProviderOptions = {}) {
    this.model = options.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL
    this.fetchImpl = options.fetchImpl ?? fetch
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS
  }

  async planDeck(input: DeckPlanRequest): Promise<DeckPlanResult> {
    const apiKey = this.options.apiKey ?? process.env.OPENAI_API_KEY
    const baseURL = (this.options.baseURL ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')

    if (!apiKey) {
      return { deck: buildFallbackDeck(input) }
    }

    try {
      const json = await this.requestChatCompletion(baseURL, apiKey, {
        model: this.model,
        temperature: 0.6,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              '你是顶级演示文稿策划专家。',
              '目标不是简单列标题，而是生成可直接用于 PPT 设计的规划结果。',
              '输出 JSON，字段必须包含：id, topic, goalPageCount, actualPageCount, language, outlineSummary, templateId, designSystem, themeName, designRequirements, designCharacteristics, contentBlueprint, slides。',
              '每个 slide 必须包含：id, kind, title, summary, bullets, regeneratable, designRequirements, designFeatures, layoutInstructions, validationResult, metadata。',
              'metadata 内必须包含 layoutTemplate 和 pageNumber。',
              'templateId 固定输出 MASTER_TEMPLATE_AI。',
              'layoutTemplate 只能从以下集合选择：master_cover, master_section, master_toc, master_timeline, master_split, master_grid, master_compare, master_table, master_summary, master_closing。',
              'slides 需要真正拆解主题，避免重复用户原话，避免“第 N 页”式占位标题。',
              '面向新手时，优先解决理解门槛、常见误区、观看抓手和行动清单。',
              '同一份 deck 中，相邻两页不要使用相同 layoutTemplate，除非内容强依赖连续对照。',
              'title、summary、bullets 是最终会显示在 PPT 上的可见内容，绝对不要输出“副标题：”“关键词：”“设计说明：”“布局说明：”“提示：”这类标签化元文本。',
              '不要把设计意图、版式建议、占位图说明、装饰说明写进 title、summary、bullets。',
              `全局设计系统固定为 ${DEFAULT_DESIGN_SYSTEM}，严格使用配色 ${DESIGN_COLORS.join(' ')}`,
              '中文字体固定 Microsoft YaHei，英文字体固定 Arial。',
              '所有页面必须服从 MASTER_TEMPLATE_AI 的商务提案母版风格、底部彩带页脚和统一留白系统。',
              '当适合做封面或章节页时允许使用占位大图，但不要依赖真实图片素材。',
              '目录页必须给出 4 到 6 个具体主题项，不能只写抽象口号。',
              '对比页必须给出左右两栏各自的明确标题与 1 到 2 句具体解释，不能只给一句短语。',
              '表格页必须给出结构化条目，确保每行都能独立成立。',
            ].join('\n'),
          },
          {
            role: 'user',
            content: [
              `主题：${input.topic}`,
              `目标页数：${input.goalPageCount}`,
              `语言：${input.language}`,
              '请返回适合制作美观简洁 PPT 的完整策划 JSON。',
            ].join('\n'),
          },
        ],
      })
      const content = json?.choices?.[0]?.message?.content
      if (typeof content !== 'string') {
        throw new Error('Missing model content')
      }

      const parsed = extractJson(content)
      const deck = this.normalizeDeck(parsed, input)
      return { deck }
    }
    catch {
      return { deck: buildFallbackDeck(input) }
    }
  }

  async renderDeck(input: DeckRenderRequest): Promise<DeckRenderResult> {
    const apiKey = this.options.apiKey ?? process.env.OPENAI_API_KEY
    const baseURL = (this.options.baseURL ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')

    if (!apiKey) {
      throw new Error('OpenAI API key missing for deck render')
    }

    const json = await this.requestChatCompletion(baseURL, apiKey, {
      model: this.model,
      temperature: 0.85,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: [
            '你是顶级 PPT 制作总监，而不是简单提纲助手。',
            '你接收到的是用户已经修改确认过的 planning deck，你必须将其升级为可制作的最终演示文稿 JSON。',
            'render 阶段的目标是：基于主题和文本，生成美观、具体、可视化、版式明确的 PPT 页面内容。',
            '不要只复述用户原文，也不要只把 bullets 原样搬运到页面。',
            '你必须对每页进行内容重写、信息重组和视觉表达设计，让它更像真实 PPT。',
            '输出 JSON，字段必须包含：id, topic, goalPageCount, actualPageCount, language, outlineSummary, templateId, designSystem, themeName, designRequirements, designCharacteristics, contentBlueprint, slides。',
            '每个 slide 必须包含：id, kind, title, subtitle, summary, bullets, bodySections, keyHighlights, visualTone, imageIntent, regeneratable, designRequirements, designFeatures, layoutInstructions, validationResult, metadata。',
            'bodySections 是数组，每项必须包含 heading 和 text。',
            'keyHighlights 是数组，必须提供适合卡片、强调语或标签区展示的短句。',
            'subtitle、summary、bullets、bodySections、keyHighlights 都是可见内容，绝对不要输出“副标题：”“关键词：”“设计说明：”“布局说明：”“提示：”这类标签化元文本。',
            '不要把设计意图、占位图说明、装饰说明直接写进可见文本。',
            '优先生成可视化强、信息密度适中、适合模板排版的内容块，而不是大段说明文。',
            '每页都必须基于当前主题定制内容，不得出现与主题无关的其他运动或领域。',
            'templateId 固定输出 MASTER_TEMPLATE_AI。',
            'layoutTemplate 只能从以下集合选择：master_cover, master_section, master_toc, master_timeline, master_split, master_grid, master_compare, master_table, master_summary, master_closing。',
            `全局设计系统固定为 ${DEFAULT_DESIGN_SYSTEM}，严格使用配色 ${DESIGN_COLORS.join(' ')}`,
            '中文字体固定 Microsoft YaHei，英文字体固定 Arial。',
            '所有页面都要有明确的设计感、层次感和视觉节奏，不能像纯文字讲义。',
            '所有页面必须服从 MASTER_TEMPLATE_AI 的商务提案母版风格、底部彩带页脚和统一留白系统。',
            '如果选择 master_compare，必须输出 bodySections，且正好 2 项；每项都要有清晰 heading 和至少一句具体 text。',
            '如果选择 master_table，优先输出 bodySections，确保每一行都对应可独立展示的信息。',
            '如果选择 master_toc 或 master_grid，bullets 不能空洞，每条都要是可直接上版的具体信息。',
          ].join('\n'),
        },
        {
          role: 'user',
          content: [
            '以下是用户确认后的 planning deck，请基于它生成最终制作稿。',
            JSON.stringify(input.deck),
          ].join('\n'),
        },
      ],
    })
    const content = json?.choices?.[0]?.message?.content
    if (typeof content !== 'string') {
      throw new Error('Missing model content for deck render')
    }

    const parsed = extractJson(content)
    return { deck: this.normalizeDeck(parsed, input.deck) }
  }

  async regenerateSlide(input: SlideRegenerationContext): Promise<SlideRegenerationResult> {
    const [slide] = buildFallbackSlides(input.prompt || '重新生成页面', 1)
    return { slide }
  }

  private normalizeDeck(value: Record<string, unknown>, input: DeckPlanRequest | AIDeck): AIDeck {
    const fallback = 'slides' in input ? input : buildFallbackDeck(input)
    const rawSlides = Array.isArray(value.slides) ? value.slides : fallback.slides
    const slides = rawSlides
      .map((slide, index) => this.normalizeSlide(slide, index, fallback.topic))
      .filter(Boolean) as AISlide[]

    return {
      id: typeof value.id === 'string' ? value.id : fallback.id,
      topic: typeof value.topic === 'string' ? value.topic : fallback.topic,
      goalPageCount: typeof value.goalPageCount === 'number' ? value.goalPageCount : fallback.goalPageCount,
      actualPageCount: slides.length || fallback.actualPageCount,
      language: typeof value.language === 'string' ? value.language : fallback.language,
      outlineSummary: typeof value.outlineSummary === 'string' ? value.outlineSummary : fallback.outlineSummary,
      templateId: typeof value.templateId === 'string' ? value.templateId : (fallback.templateId ?? DEFAULT_TEMPLATE_ID),
      designSystem: typeof value.designSystem === 'string' ? value.designSystem : DEFAULT_DESIGN_SYSTEM,
      themeName: typeof value.themeName === 'string' ? value.themeName : fallback.themeName,
      designRequirements: Array.isArray(value.designRequirements) ? value.designRequirements.filter(item => typeof item === 'string') as string[] : fallback.designRequirements,
      designCharacteristics: Array.isArray(value.designCharacteristics) ? value.designCharacteristics.filter(item => typeof item === 'string') as string[] : fallback.designCharacteristics,
      contentBlueprint: Array.isArray(value.contentBlueprint) ? value.contentBlueprint.filter(item => typeof item === 'string') as string[] : slides.map(slide => slide.title || slide.id),
      slides: slides.length ? slides : fallback.slides,
    }
  }

  private normalizeSlide(value: unknown, index: number, topic: string): AISlide | null {
    if (!value || typeof value !== 'object') return null
    const slide = value as Record<string, unknown>
    const rawTitle = typeof slide.title === 'string' ? slide.title : `${topic} · 第 ${index + 1} 页`
    const title = sanitizeVisibleText(rawTitle) || `${topic} · 第 ${index + 1} 页`
    const bullets = Array.isArray(slide.bullets) ? sanitizeVisibleList(slide.bullets.filter(item => typeof item === 'string') as string[]) : []
    const summary = sanitizeVisibleText(typeof slide.summary === 'string' ? slide.summary : '')
    const subtitle = sanitizeVisibleText(typeof slide.subtitle === 'string' ? slide.subtitle : '')
    const keyHighlights = Array.isArray(slide.keyHighlights)
      ? sanitizeVisibleList(slide.keyHighlights.filter(item => typeof item === 'string') as string[])
      : []
    const bodySections = sanitizeSectionList(slide.bodySections)

    return {
      id: typeof slide.id === 'string' ? slide.id : `ai_slide_${index + 1}`,
      kind: typeof slide.kind === 'string' ? slide.kind : index === 0 ? 'cover' : 'content',
      title,
      subtitle,
      summary,
      bullets,
      bodySections,
      keyHighlights,
      visualTone: typeof slide.visualTone === 'string' ? slide.visualTone : '',
      imageIntent: typeof slide.imageIntent === 'string' ? slide.imageIntent : '',
      regeneratable: slide.regeneratable !== false,
      designRequirements: Array.isArray(slide.designRequirements) ? slide.designRequirements.filter(item => typeof item === 'string') as string[] : [],
      designFeatures: Array.isArray(slide.designFeatures) ? slide.designFeatures.filter(item => typeof item === 'string') as string[] : [],
      layoutInstructions: typeof slide.layoutInstructions === 'string' ? slide.layoutInstructions : '',
      validationResult: typeof slide.validationResult === 'string' ? slide.validationResult : '',
      metadata: this.normalizeMetadata(slide.metadata, index, slide.kind, title, bullets),
    }
  }

  private normalizeMetadata(value: unknown, index: number, kind: unknown, title: string, bullets: unknown[]) {
    const metadata = value && typeof value === 'object' ? value as Record<string, unknown> : {}
    const layoutTemplate = typeof metadata.layoutTemplate === 'string'
      ? metadata.layoutTemplate
      : this.inferLayoutTemplate(typeof kind === 'string' ? kind : 'content', title, index, bullets)

    return {
      ...metadata,
      layoutTemplate,
      pageNumber: typeof metadata.pageNumber === 'number' ? metadata.pageNumber : index + 1,
      palette: DESIGN_COLORS,
      cnFont: 'Microsoft YaHei',
      enFont: 'Arial',
    }
  }

  private inferLayoutTemplate(kind: string, title: string, index: number, bullets: unknown[]): LayoutTemplate {
    if (kind === 'cover' || index === 0) return 'master_cover'
    if (kind === 'closing') return 'master_closing'
    if (kind === 'summary') return title.includes('结束') || title.includes('感谢') ? 'master_closing' : 'master_summary'

    const normalizedTitle = title.toLowerCase()
    const bulletText = bullets.filter(item => typeof item === 'string').join(' ')

    if (normalizedTitle.includes('目录') || normalizedTitle.includes('概览')) return 'master_toc'
    if (normalizedTitle.includes('时间') || normalizedTitle.includes('起源') || normalizedTitle.includes('发展') || bulletText.includes('阶段')) return 'master_timeline'
    if (normalizedTitle.includes('对比') || normalizedTitle.includes('差异')) return 'master_compare'
    if (normalizedTitle.includes('周期') || normalizedTitle.includes('报价') || normalizedTitle.includes('计划') || normalizedTitle.includes('排期') || bulletText.includes('负责')) return 'master_table'
    if (normalizedTitle.includes('总结') || normalizedTitle.includes('清单') || normalizedTitle.includes('误区')) return 'master_summary'
    if (bullets.length >= 4) return 'master_grid'
    if (normalizedTitle.includes('章节') || normalizedTitle.includes('背景')) return 'master_section'
    if (normalizedTitle.includes('结束') || normalizedTitle.includes('感谢')) return 'master_closing'
    if (normalizedTitle.includes('角色') || normalizedTitle.includes('位置') || normalizedTitle.includes('装备') || normalizedTitle.includes('器材')) return 'master_split'
    if (index < DEFAULT_LAYOUT_SEQUENCE.length) return DEFAULT_LAYOUT_SEQUENCE[index]
    return index % 2 === 0 ? 'master_split' : 'master_grid'
  }

  private async requestChatCompletion(baseURL: string, apiKey: string, payload: Record<string, unknown>) {
    const controller = new AbortController()
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    try {
      const response = await Promise.race([
        this.fetchImpl(`${baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            controller.abort()
            reject(new Error(`OpenAI request timed out after ${this.requestTimeoutMs}ms`))
          }, this.requestTimeoutMs)
        }),
      ])

      if (!response.ok) {
        throw new Error(`OpenAI request failed with ${response.status}`)
      }

      return await response.json() as any
    }
    finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }
}
