export interface SlideRegenerationContext {
  deckId: string
  slideId: string
  prompt?: string
  currentSlide?: Record<string, unknown>
  neighboringSlides?: Record<string, unknown>[]
}
