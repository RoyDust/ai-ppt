import type { AIDeck } from '../../../ai-schema/src/ai-deck'
import type { SlideRegenerationContext } from '../../../ai-schema/src/regeneration-context'
import type { DeckRenderBatchInput, DeckRenderBatchResponse } from '../renderer/render-batch.types'

export interface ResearchProjectInput {
  projectBackground?: string[]
  projectObjectives?: string[]
  sampleDesign?: string[]
  researchFramework?: string[]
}

export interface PageCountRange {
  key: 'compact' | 'standard' | 'extended'
  label: string
  min: number
  max: number
  suggested: number
}

export interface DeckPlanRequest {
  topic: string
  language: string
  goalPageCount: number
  pageCountRange?: PageCountRange
  inputMode?: 'simple' | 'research'
  researchBrief?: string
  researchInput?: ResearchProjectInput
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
  renderDeckBatch?(input: DeckRenderBatchInput): Promise<DeckRenderBatchResponse>
  regenerateSlide(input: SlideRegenerationContext): Promise<SlideRegenerationResult>
}
