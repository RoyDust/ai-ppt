export type AISlideKind = 'cover' | 'content' | 'summary' | 'closing'

export interface AISlideBodySection {
  heading: string
  text: string
}

export interface AISlide {
  id: string
  kind: AISlideKind
  title: string
  subtitle?: string
  summary?: string
  bullets?: string[]
  bodySections?: AISlideBodySection[]
  keyHighlights?: string[]
  visualTone?: string
  imageIntent?: string
  regeneratable: boolean
  designRequirements?: string[]
  designFeatures?: string[]
  layoutInstructions?: string
  validationResult?: string
  metadata?: Record<string, unknown>
}
