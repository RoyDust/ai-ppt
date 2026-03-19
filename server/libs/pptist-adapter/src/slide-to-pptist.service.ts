import type { AIDeck } from '../../ai-schema/src/ai-deck'
import type { AISlide } from '../../ai-schema/src/ai-slide'
import './templates/master-template-ai'
import { getDeckTemplate } from './templates/template-registry'

export class SlideToPPTistService {
  convert(slide: AISlide, deck?: AIDeck) {
    const effectiveDeck: AIDeck = deck ?? {
      id: 'deck_default',
      topic: slide.title || 'AI Deck',
      goalPageCount: 1,
      actualPageCount: 1,
      language: 'zh-CN',
      outlineSummary: slide.summary || '',
      templateId: 'MASTER_TEMPLATE_AI',
      slides: [slide],
    }
    const template = getDeckTemplate(effectiveDeck.templateId)
    if (!template) {
      throw new Error(`Unsupported deck template: ${effectiveDeck.templateId ?? 'unknown'}`)
    }
    return template.render(effectiveDeck, slide)
  }
}
