import type { AIDeck } from '../../../ai-schema/src/ai-deck'
import type { AISlide } from '../../../ai-schema/src/ai-slide'

export interface PPTistSlide {
  id: string
  type?: string
  background: Record<string, unknown>
  elements: Array<Record<string, unknown>>
}

export interface AIDeckTemplate {
  id: string
  render: (deck: AIDeck, slide: AISlide) => PPTistSlide
}

const templates = new Map<string, AIDeckTemplate>()

export const registerDeckTemplate = (template: AIDeckTemplate) => {
  templates.set(template.id, template)
}

export const getDeckTemplate = (templateId?: string) => {
  if (templateId && templates.has(templateId)) return templates.get(templateId)!
  return templates.get('MASTER_TEMPLATE_AI')
}
