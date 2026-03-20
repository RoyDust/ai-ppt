import type { AISlide } from './slide'
import type { Slide } from '@/types/slides'
import type { AIDeck } from './deck'

export interface CurrentPptSlideTextSummary {
  textType?: string
  text: string
  left: number
  top: number
  width: number
  height: number
}

export interface CurrentPptSlideSummary {
  title?: string
  summary?: string[]
  bullets?: string[]
  textElements: CurrentPptSlideTextSummary[]
}

export interface SlideRegenerationInput {
  deckId: string
  slideId: string
  instructions?: string
  topic?: string
  language?: string
  templateId?: string
  designSystem?: string
  goalPageCount?: number
  outlineSummary?: string
  regenerateMode?: string
  currentPptSlideSummary?: CurrentPptSlideSummary
  currentSlide?: AISlide
  previousSlide?: AISlide
  nextSlide?: AISlide
  deckOutline?: Array<Pick<AISlide, 'id' | 'kind' | 'title'>>
}

export interface SlideRegenerationResponse {
  slide: AISlide
}

export interface SlideAcceptInput {
  deckId: string
  createdBy: string
  sourceTaskId: string
  parentVersionId: string
  pptistSlidesJson: Slide[]
  aiDeckJson?: AIDeck
}

export interface SlideAcceptResponse {
  id?: string
  versionId: string
  parentVersionId?: string
  slides: Slide[]
}
