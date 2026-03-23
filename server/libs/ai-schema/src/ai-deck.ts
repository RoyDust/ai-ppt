import type { AISlide } from './ai-slide'

export interface AIPageCountRange {
  key: 'compact' | 'standard' | 'extended'
  label: string
  min: number
  max: number
  suggested: number
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
