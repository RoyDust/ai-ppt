export type AISlideKind = 'cover' | 'content' | 'summary' | 'closing'

export interface AISlide {
  id: string
  kind: AISlideKind
  title: string
  bullets?: string[]
  regeneratable: boolean
}
