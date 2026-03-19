import type { AIDeck } from '../../../ai-schema/src/ai-deck'
import type { SlideRegenerationContext } from '../../../ai-schema/src/regeneration-context'

export interface DeckPlanRequest {
  topic: string
  language: string
  goalPageCount: number
}

export interface DeckPlanResult {
  deck: AIDeck
}

export interface DeckRenderRequest {
  deck: AIDeck
}

export interface DeckRenderResult {
  deck: AIDeck
}

export interface SlideRegenerationResult {
  slide: Record<string, unknown>
}

export interface LLMProvider {
  readonly name: string
  planDeck(input: DeckPlanRequest): Promise<DeckPlanResult>
  renderDeck(input: DeckRenderRequest): Promise<DeckRenderResult>
  regenerateSlide(input: SlideRegenerationContext): Promise<SlideRegenerationResult>
}
