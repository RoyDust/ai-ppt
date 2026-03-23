import type { AIDeck } from '../../../ai-schema/src/ai-deck'
import type { AISlide } from '../../../ai-schema/src/ai-slide'

export interface RenderBatchSharedContext {
  topic: string
  language: string
  outlineSummary: string
  goalPageCount: number
  actualPageCount: number
  templateId?: string
  designSystem?: string
  themeName?: string
  contentBlueprint?: string[]
  batchIndex: number
}

export interface RenderBatch {
  batchIndex: number
  batchCount: number
  slideStart: number
  slideEnd: number
  slides: AISlide[]
  sharedContext: RenderBatchSharedContext
}

export interface RenderBatchResult {
  batchIndex: number
  slides: AISlide[]
}

export interface DeckRenderBatchInput {
  sharedContext: RenderBatchSharedContext
  batchIndex: number
  batchCount: number
  slides: AISlide[]
}

export interface DeckRenderBatchResponse {
  slides: AISlide[]
}

export type CompactDeckContext = Pick<
  AIDeck,
  'topic' | 'language' | 'outlineSummary' | 'goalPageCount' | 'actualPageCount' | 'templateId' | 'designSystem' | 'themeName' | 'contentBlueprint'
>
