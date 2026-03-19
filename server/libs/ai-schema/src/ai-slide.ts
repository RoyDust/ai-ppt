export interface AISlideBodySection {
  heading: string
  text: string
}

export interface AISlide {
  id: string
  kind: string
  title?: string
  subtitle?: string
  summary?: string
  bullets?: string[]
  bodySections?: AISlideBodySection[]
  keyHighlights?: string[]
  visualTone?: string
  imageIntent?: string
  regeneratable?: boolean
  notes?: string
  designRequirements?: string[]
  designFeatures?: string[]
  layoutInstructions?: string
  validationResult?: string
  metadata?: Record<string, unknown>
}
