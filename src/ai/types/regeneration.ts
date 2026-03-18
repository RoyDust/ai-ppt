import type { AISlide } from './slide'

export interface SlideRegenerationInput {
  deckId: string
  slideId: string
}

export interface SlideRegenerationResponse {
  slide: AISlide
}
