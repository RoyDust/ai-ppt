import type { AIDeck } from '../../../ai-schema/src/ai-deck'
import type { AISlide } from '../../../ai-schema/src/ai-slide'
import type { SlideRegenerationContext } from '../../../ai-schema/src/regeneration-context'
import type {
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
}

const DEFAULT_MODEL = 'gpt-4.1-mini'
const DESIGN_COLORS = ['#8ecae6', '#219ebc', '#023047', '#ffb703', '#fb8500']
const DEFAULT_DESIGN_SYSTEM = 'vitality-tech'
const DEFAULT_THEME_NAME = 'Vitality Tech'

type LayoutTemplate =
  | 'cover_photo'
  | 'section_photo'
  | 'rules_grid_3x2'
  | 'split_image_list'
  | 'process_infographic'
  | 'warning_penalty'
  | 'summary_checklist'

const DEFAULT_LAYOUT_SEQUENCE: LayoutTemplate[] = [
  'cover_photo',
  'section_photo',
  'rules_grid_3x2',
  'split_image_list',
  'split_image_list',
  'process_infographic',
  'warning_penalty',
  'summary_checklist',
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

const buildFallbackSlides = (topic: string, goalPageCount: number) => {
  const actualCount = Math.max(6, Math.min(goalPageCount, 10))
  const baseSlides: Array<Partial<AISlide>> = [
    {
      kind: 'cover',
      title: `${topic}`,
      summary: `这份演示将用零基础视角解释“${topic}”，先建立整体认知，再补充规则、结构和观看方法。`,
      bullets: ['先建立观看框架', '优先解释容易混淆的概念', '每页只保留一个核心 takeaway'],
      designRequirements: ['封面允许使用占位大图营造大片感', '必须展示统一科技活力配色和强标题'],
      designFeatures: ['全幅摄影占位', '高对比标题', '底部信息标签'],
      layoutInstructions: '封面采用 cover_photo，左侧强标题与摘要，右侧或底层使用占位大图。',
      validationResult: '读者在 5 秒内知道演示面向谁、解决什么问题。',
      metadata: { layoutTemplate: 'cover_photo', pageNumber: 1 },
    },
    {
      kind: 'content',
      title: '先建立整体认知',
      summary: '先让观众知道这件事是什么、为什么重要、该先看什么。',
      bullets: ['一句话定义主题', '它和常见相近概念有什么区别', '第一次接触时最值得先关注的 3 个点'],
      designRequirements: ['作为章节分隔页，语气醒目有力', '允许使用占位图背景强化气氛'],
      designFeatures: ['章节标题', '斜切装饰条', '大片感占位图'],
      layoutInstructions: '使用 section_photo，带章节序号和强对比标题。',
      validationResult: '新手能说出这件事“是什么、为什么、先看什么”。',
      metadata: { layoutTemplate: 'section_photo', pageNumber: 2 },
    },
    {
      kind: 'content',
      title: '核心规则与运行机制',
      summary: '解释运作方式，重点是“流程如何开始、如何推进、如何结束”。',
      bullets: ['规则/流程的最小闭环', '哪些情形最容易看不懂', '一张页内流程图串起来', '换人和暂停如何影响节奏', '犯规后比赛如何继续', '守门员相关特殊规则'],
      designRequirements: ['采用信息图表式布局，6 个规则点以 3x2 网格排列', '第一排蓝色，第二排橙色'],
      designFeatures: ['圆形编号', '标题+详细描述', '底部说明区域'],
      layoutInstructions: '使用 rules_grid_3x2，右下角显示第 3 页页码角标。',
      validationResult: '观众能复述基本流程，不再被术语卡住。',
      metadata: { layoutTemplate: 'rules_grid_3x2', pageNumber: 3 },
    },
    {
      kind: 'content',
      title: '关键角色、位置或组成部分',
      summary: '让观众知道“谁在做什么，每个部分负责什么”。',
      bullets: ['按角色拆解职责', '说明彼此如何配合', '给出观看时的识别提示'],
      designRequirements: ['左右双栏混排', '视觉上突出角色分工'],
      designFeatures: ['左文字右图示', '中轴分隔', '角色标签'],
      layoutInstructions: '使用 split_image_list，左侧职责列表，右侧为占位图或示意区。',
      validationResult: '观众能认出关键角色，并知道各自作用。',
      metadata: { layoutTemplate: 'split_image_list', pageNumber: 4 },
    },
    {
      kind: 'content',
      title: '装备、工具或准备动作',
      summary: '补足“看得见但不理解”的部分，解释装备与动作背后的用途。',
      bullets: ['列出关键装备/工具及作用', '指出常见误解', '补充赛前或执行前的准备动作'],
      designRequirements: ['左侧装备列表 + 右侧占位图混排', '强调装备用途和识别线索'],
      designFeatures: ['蓝色标题装饰线', '橙色垂直分隔线', '列表标签'],
      layoutInstructions: '使用 split_image_list，右下角放页码角标。',
      validationResult: '观众能把看见的对象和它的用途对应起来。',
      metadata: { layoutTemplate: 'split_image_list', pageNumber: 5 },
    },
    {
      kind: 'content',
      title: '关键战术、判断方法与观看技巧',
      summary: '从“看热闹”过渡到“会看门道”。',
      bullets: ['最常见的 2 到 3 个关键战术/策略', '如何从画面中识别它们', '新手应该如何快速判断局势'],
      designRequirements: ['页面必须像流程信息图，不像普通说明文档'],
      designFeatures: ['水平流程节点', '步骤箭头', '右下角圆形页码'],
      layoutInstructions: '使用 process_infographic，右侧保留流程图区。',
      validationResult: '观众能在实际场景中找到判断抓手。',
      metadata: { layoutTemplate: 'process_infographic', pageNumber: 6 },
    },
    {
      kind: 'summary',
      title: '犯规与处罚怎么快速看懂',
      summary: '把最容易误解的犯规情形压缩成一页警示式页面。',
      bullets: ['高杆：球杆抬太高击到对手', '绊人：让对手失去平衡倒地', '抱人或钩人：限制对手移动', '危险冲撞：超出合理对抗范围'],
      designRequirements: ['风格要像警示页', '重点突出处罚与后果'],
      designFeatures: ['警示色块', '处罚标签', '风险提醒'],
      layoutInstructions: '使用 warning_penalty，内容按违规类型和处罚后果排列。',
      validationResult: '观众带着这页清单就能开始看懂内容。',
      metadata: { layoutTemplate: 'warning_penalty', pageNumber: 7 },
    },
    {
      kind: 'summary',
      title: '新手观赛清单',
      summary: '把前面的信息压缩成一页可以立即使用的 checklist。',
      bullets: ['先看目标和节奏', '再看角色分工', '接着盯规则触发点', '最后留意战术节奏变化'],
      designRequirements: ['总结必须可复用', '必须有行动清单和复盘提示'],
      designFeatures: ['清单布局', '重点高亮', '行动导向'],
      layoutInstructions: '使用 summary_checklist，保留总结区域和右下角页码。',
      validationResult: '观众带着这页清单就能开始看懂内容。',
      metadata: { layoutTemplate: 'summary_checklist', pageNumber: 8 },
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
    designSystem: DEFAULT_DESIGN_SYSTEM,
    themeName: DEFAULT_THEME_NAME,
    designRequirements: [
      '固定采用活力与科技配色：#8ecae6 #219ebc #023047 #ffb703 #fb8500',
      '中文强制使用 Microsoft YaHei，英文强制使用 Arial',
      '封面和章节页允许使用占位大图，其余页面优先信息图表布局',
      '每页必须有页码角标、标题装饰线或结构化色块之一',
      '正文不能空泛，必须给出解释、观看抓手或判断方法',
    ],
    designCharacteristics: ['活力与科技', '信息图表感', '大片式章节页', '高对比标题', '明确页型分工'],
    contentBlueprint: slides.map(slide => slide.title),
    slides,
  }
}

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai'
  readonly model: string
  private readonly fetchImpl: typeof fetch

  constructor(private readonly options: OpenAIProviderOptions = {}) {
    this.model = options.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async planDeck(input: DeckPlanRequest): Promise<DeckPlanResult> {
    const apiKey = this.options.apiKey ?? process.env.OPENAI_API_KEY
    const baseURL = (this.options.baseURL ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')

    if (!apiKey) {
      return { deck: buildFallbackDeck(input) }
    }

    try {
      const response = await this.fetchImpl(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.6,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: [
                '你是顶级演示文稿策划专家。',
                '目标不是简单列标题，而是生成可直接用于 PPT 设计的规划结果。',
                '输出 JSON，字段必须包含：id, topic, goalPageCount, actualPageCount, language, outlineSummary, designSystem, themeName, designRequirements, designCharacteristics, contentBlueprint, slides。',
                '每个 slide 必须包含：id, kind, title, summary, bullets, regeneratable, designRequirements, designFeatures, layoutInstructions, validationResult, metadata。',
                'metadata 内必须包含 layoutTemplate 和 pageNumber。',
                'layoutTemplate 只能从以下集合选择：cover_photo, section_photo, rules_grid_3x2, split_image_list, process_infographic, warning_penalty, summary_checklist。',
                'slides 需要真正拆解主题，避免重复用户原话，避免“第 N 页”式占位标题。',
                '面向新手时，优先解决理解门槛、常见误区、观看抓手和行动清单。',
                'title、summary、bullets 是最终会显示在 PPT 上的可见内容，绝对不要输出“副标题：”“关键词：”“设计说明：”“布局说明：”“提示：”这类标签化元文本。',
                '不要把设计意图、版式建议、占位图说明、装饰说明写进 title、summary、bullets。',
                `全局设计系统固定为 ${DEFAULT_DESIGN_SYSTEM}，严格使用配色 ${DESIGN_COLORS.join(' ')}`,
                '中文字体固定 Microsoft YaHei，英文字体固定 Arial。',
                '当适合做封面或章节页时允许使用占位大图，但不要依赖真实图片素材。',
                '规则页要产出可视化规则卡，流程页要产出步骤式信息图，警示页要突出处罚与后果。',
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
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI request failed with ${response.status}`)
      }

      const json = await response.json() as any
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

  async regenerateSlide(input: SlideRegenerationContext): Promise<SlideRegenerationResult> {
    const [slide] = buildFallbackSlides(input.prompt || '重新生成页面', 1)
    return { slide }
  }

  private normalizeDeck(value: Record<string, unknown>, input: DeckPlanRequest): AIDeck {
    const fallback = buildFallbackDeck(input)
    const rawSlides = Array.isArray(value.slides) ? value.slides : fallback.slides
    const slides = rawSlides
      .map((slide, index) => this.normalizeSlide(slide, index, input.topic))
      .filter(Boolean) as AISlide[]

    return {
      id: typeof value.id === 'string' ? value.id : fallback.id,
      topic: typeof value.topic === 'string' ? value.topic : input.topic,
      goalPageCount: typeof value.goalPageCount === 'number' ? value.goalPageCount : input.goalPageCount,
      actualPageCount: slides.length || fallback.actualPageCount,
      language: typeof value.language === 'string' ? value.language : input.language,
      outlineSummary: typeof value.outlineSummary === 'string' ? value.outlineSummary : fallback.outlineSummary,
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

    return {
      id: typeof slide.id === 'string' ? slide.id : `ai_slide_${index + 1}`,
      kind: typeof slide.kind === 'string' ? slide.kind : index === 0 ? 'cover' : 'content',
      title,
      summary,
      bullets,
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
    if (kind === 'cover' || index === 0) return 'cover_photo'
    if (kind === 'summary') return title.includes('清单') ? 'summary_checklist' : 'warning_penalty'

    const normalizedTitle = title.toLowerCase()
    const bulletText = bullets.filter(item => typeof item === 'string').join(' ')

    if (normalizedTitle.includes('规则') || bulletText.includes('规则') || bullets.length >= 5) return 'rules_grid_3x2'
    if (normalizedTitle.includes('流程') || normalizedTitle.includes('战术') || bulletText.includes('步骤') || bulletText.includes('流程')) return 'process_infographic'
    if (normalizedTitle.includes('装备') || normalizedTitle.includes('角色') || normalizedTitle.includes('位置') || bulletText.includes('护') || bulletText.includes('装备')) return 'split_image_list'
    if (normalizedTitle.includes('犯规') || normalizedTitle.includes('处罚') || bulletText.includes('处罚') || bulletText.includes('犯规')) return 'warning_penalty'
    if (normalizedTitle.includes('清单') || normalizedTitle.includes('总结')) return 'summary_checklist'
    if (index < DEFAULT_LAYOUT_SEQUENCE.length) return DEFAULT_LAYOUT_SEQUENCE[index]
    return index % 2 === 0 ? 'split_image_list' : 'process_infographic'
  }
}
