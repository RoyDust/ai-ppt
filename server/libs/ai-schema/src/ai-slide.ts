export interface AISlideBodySection {
  heading: string
  text: string
}

export interface AISlidePlanningDraft {
  pageGoal?: string
  coreMessage?: string
  audienceTakeaway?: string
  supportingPoints?: string[]
  evidenceHints?: string[]
  narrativeFlow?: string
  recommendedLayout?: string
  visualDirection?: string
  designNotes?: string[]
  forbiddenContent?: string[]
  sourceAnchors?: string[]
}

export interface AISlide {
  id: string
  kind: string
  title?: string
  subtitle?: string
  summary?: string
  bullets?: string[]
  planningDraft?: AISlidePlanningDraft
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
