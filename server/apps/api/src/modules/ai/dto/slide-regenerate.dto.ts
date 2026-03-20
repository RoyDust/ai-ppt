export class SlideRegenerateDto {
  deckId!: string
  slideId!: string
  instructions?: string
  topic?: string
  language?: string
  templateId?: string
  designSystem?: string
  goalPageCount?: number
  outlineSummary?: string
  regenerateMode?: string
  currentPptSlideSummary?: Record<string, unknown>
  currentSlide?: Record<string, unknown>
  previousSlide?: Record<string, unknown>
  nextSlide?: Record<string, unknown>
  deckOutline?: Record<string, unknown>[]
}
