import type { AISlide } from './ai-slide'

export interface AIDeck {
  id: string
  topic: string
  goalPageCount: number
  actualPageCount: number
  language: string
  outlineSummary: string
  slides: AISlide[]
}
