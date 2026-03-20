export interface SlideRegenerationContext {
  deckId: string
  slideId: string
  prompt?: string
  topic?: string
  language?: string
  templateId?: string
  designSystem?: string
  goalPageCount?: number
  outlineSummary?: string
  regenerateMode?: string
  currentPptSlideSummary?: Record<string, unknown>
  currentSlide?: Record<string, unknown>
  deckOutline?: Record<string, unknown>[]
  neighboringSlides?: Record<string, unknown>[]
}
