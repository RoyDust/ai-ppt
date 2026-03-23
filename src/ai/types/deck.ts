import type { Slide } from '@/types/slides'
import type { AISlide } from './slide'

export const MIN_AI_DECK_PAGE_COUNT = 8
export const MAX_AI_DECK_PAGE_COUNT = 15
export const DEFAULT_AI_DECK_PAGE_COUNT = 10
export const MAX_AI_DECK_TEXT_LENGTH = 280

export type AIPageCountRangeKey = 'compact' | 'standard' | 'extended'

export interface AIPageCountRange {
  key: AIPageCountRangeKey
  label: string
  min: number
  max: number
  suggested: number
}

export const AI_DECK_PAGE_COUNT_RANGES: AIPageCountRange[] = [
  { key: 'compact', label: '8-10 页', min: 8, max: 10, suggested: 9 },
  { key: 'standard', label: '11-15 页', min: 11, max: 15, suggested: 12 },
  { key: 'extended', label: '16-20 页', min: 16, max: 20, suggested: 18 },
]

export const DEFAULT_AI_DECK_PAGE_COUNT_RANGE = AI_DECK_PAGE_COUNT_RANGES[1]

export type AIPPTInputMode = 'simple' | 'research'

export interface ResearchProjectInput {
  projectBackground?: string[]
  projectObjectives?: string[]
  sampleDesign?: string[]
  researchFramework?: string[]
}

export interface AIDeck {
  id: string
  topic: string
  goalPageCount: number
  pageCountRange?: AIPageCountRange
  actualPageCount: number
  language: string
  outlineSummary: string
  templateId?: string
  designSystem?: string
  themeName?: string
  designRequirements?: string[]
  designCharacteristics?: string[]
  contentBlueprint?: string[]
  slides: AISlide[]
}

export interface DeckPlanInput {
  inputMode?: AIPPTInputMode
  topic: string
  goalPageCount: number
  pageCountRange?: AIPageCountRange
  language: string
  researchBrief?: string
  researchInput?: ResearchProjectInput
}

export interface DeckRenderInput extends DeckPlanInput {
  overwrite?: boolean
  deck?: AIDeck
  deckId?: string
}

export interface DeckPlanResponse {
  deck: AIDeck
  slides: AISlide[]
  plannedPageCount: number
}

export interface DeckRenderResponse {
  id: string
  status: 'queued' | 'succeeded' | 'failed'
  type?: string
}

export interface AITaskResponse {
  id: string
  status: 'queued' | 'succeeded' | 'failed'
  type?: string
  error?: string
  output?: {
    deck: AIDeck
    slides: Slide[]
  }
}

export interface DeckAcceptResponse {
  deckId?: string
  versionId: string
  slides: Slide[]
}

export interface DeckPlanInputNormalizationResult {
  ok: boolean
  payload: DeckPlanInput
  errors: Partial<Record<'topic' | 'researchBrief', string>>
  warnings: Partial<Record<'researchBrief', string>>
}

const normalizeLine = (value: string) => value.replace(/\s+/g, ' ').trim()

const clampText = (value: string) => normalizeLine(value).slice(0, MAX_AI_DECK_TEXT_LENGTH)

const cleanupItems = (items?: string[]) => {
  if (!Array.isArray(items)) return undefined

  const cleaned = items
    .map(item => clampText(item))
    .filter(Boolean)

  return cleaned.length ? cleaned : undefined
}

const readObject = (value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

const readStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return undefined
  return value.map(item => String(item ?? ''))
}

const parseResearchText = (value: string): ResearchProjectInput | undefined => {
  const cleaned = value
    .split(/\n+/)
    .map(line => clampText(line))
    .filter(Boolean)

  if (!cleaned.length) return undefined

  return {
    projectBackground: cleaned,
  }
}

const parseResearchJson = (value: string): ResearchProjectInput | undefined => {
  const parsed = JSON.parse(value) as unknown
  const source = readObject(parsed)
  const normalized: ResearchProjectInput = {
    projectBackground: readStringArray(source.projectBackground),
    projectObjectives: readStringArray(source.projectObjectives),
    sampleDesign: readStringArray(source.sampleDesign),
    researchFramework: readStringArray(source.researchFramework),
  }

  return cleanupResearchProjectInput(normalized)
}

export const cleanupResearchProjectInput = (input?: ResearchProjectInput): ResearchProjectInput | undefined => {
  if (!input) return undefined

  const normalized: ResearchProjectInput = {
    projectBackground: cleanupItems(input.projectBackground),
    projectObjectives: cleanupItems(input.projectObjectives),
    sampleDesign: cleanupItems(input.sampleDesign),
    researchFramework: cleanupItems(input.researchFramework),
  }

  return Object.values(normalized).some(Boolean) ? normalized : undefined
}

export const normalizePageCount = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_AI_DECK_PAGE_COUNT
  return Math.max(MIN_AI_DECK_PAGE_COUNT, Math.min(MAX_AI_DECK_PAGE_COUNT, Math.round(value)))
}

export const resolvePageCountRange = (value?: Partial<AIPageCountRange> | null) => {
  const key = value?.key
  if (key) {
    const byKey = AI_DECK_PAGE_COUNT_RANGES.find(item => item.key === key)
    if (byKey) return byKey
  }

  if (typeof value?.min === 'number' && typeof value?.max === 'number') {
    return {
      key: (value.key as AIPageCountRangeKey | undefined) ?? DEFAULT_AI_DECK_PAGE_COUNT_RANGE.key,
      label: value.label ?? `${value.min}-${value.max} 页`,
      min: value.min,
      max: value.max,
      suggested: typeof value.suggested === 'number' ? value.suggested : Math.round((value.min + value.max) / 2),
    } as AIPageCountRange
  }

  return undefined
}

export const inferPageCountRangeByGoal = (goalPageCount?: number) => {
  if (!Number.isFinite(goalPageCount)) return DEFAULT_AI_DECK_PAGE_COUNT_RANGE
  return AI_DECK_PAGE_COUNT_RANGES.find(item => goalPageCount! >= item.min && goalPageCount! <= item.max)
    ?? DEFAULT_AI_DECK_PAGE_COUNT_RANGE
}

export const normalizeDeckPlanInput = (input: DeckPlanInput): DeckPlanInputNormalizationResult => {
  const inputMode = input.inputMode ?? 'simple'
  const topic = clampText(input.topic)
  const pageCountRange = resolvePageCountRange(input.pageCountRange) ?? inferPageCountRangeByGoal(input.goalPageCount)
  const payload: DeckPlanInput = {
    inputMode,
    topic,
    goalPageCount: pageCountRange.suggested,
    pageCountRange,
    language: input.language,
  }
  const errors: DeckPlanInputNormalizationResult['errors'] = {}
  const warnings: DeckPlanInputNormalizationResult['warnings'] = {}

  if (inputMode === 'simple' && !topic) {
    errors.topic = '请输入主题后再生成大纲'
  }

  if (inputMode === 'research') {
    let researchInput = cleanupResearchProjectInput(input.researchInput)
    const researchBrief = input.researchBrief?.trim()

    if (!researchInput && researchBrief) {
      try {
        researchInput = parseResearchJson(researchBrief)
      }
      catch {
        warnings.researchBrief = 'JSON 格式未通过校验，已按普通文本解析'
        researchInput = parseResearchText(researchBrief)
      }
    }

    if (!researchInput) {
      errors.researchBrief = '请提供研究背景、目标或研究框架'
    }
    else {
      payload.researchInput = researchInput
      if (!payload.topic) {
        payload.topic = researchInput.projectObjectives?.[0]
          || researchInput.projectBackground?.[0]
          || researchInput.researchFramework?.[0]
          || '研究项目规划'
      }
    }
  }

  return {
    ok: Object.keys(errors).length === 0,
    payload,
    errors,
    warnings,
  }
}
