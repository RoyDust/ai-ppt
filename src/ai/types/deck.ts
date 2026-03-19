import type { Slide } from '@/types/slides'
import type { AISlide } from './slide'

export interface AIDeck {
  id: string
  topic: string
  goalPageCount: number
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
  topic: string
  goalPageCount: number
  language: string
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
  versionId: string
  slides: Slide[]
}
