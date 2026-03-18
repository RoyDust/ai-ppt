export interface AISlide {
  id: string
  kind: string
  title?: string
  summary?: string
  bullets?: string[]
  regeneratable?: boolean
  notes?: string
  metadata?: Record<string, unknown>
}
