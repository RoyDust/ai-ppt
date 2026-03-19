export interface AISlide {
  id: string
  kind: string
  title?: string
  summary?: string
  bullets?: string[]
  regeneratable?: boolean
  notes?: string
  designRequirements?: string[]
  designFeatures?: string[]
  layoutInstructions?: string
  validationResult?: string
  metadata?: Record<string, unknown>
}
