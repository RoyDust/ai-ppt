export type AISlideKind = 'cover' | 'content' | 'summary' | 'closing'

export interface AISlide {
  id: string
  kind: AISlideKind
  title: string
  summary?: string
  bullets?: string[]
  regeneratable: boolean
  designRequirements?: string[]
  designFeatures?: string[]
  layoutInstructions?: string
  validationResult?: string
  metadata?: Record<string, unknown>
}
