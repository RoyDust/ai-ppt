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

export type RenderBatchStatus = 'pending' | 'running' | 'retrying' | 'succeeded' | 'failed'
export type RenderBatchFailureCategory = 'timeout' | 'rate_limit' | 'server_error' | 'invalid_output' | 'unknown'

export interface RenderBatchProgress {
  batchIndex: number
  batchCount: number
  slideStart: number
  slideEnd: number
  status: RenderBatchStatus
  retryCount: number
  canRetry: boolean
  failureCategory?: RenderBatchFailureCategory
  errorMessage?: string
  renderedSlides?: AISlide[]
}

export interface RenderTaskProgress {
  totalBatches: number
  completedBatches: number
  failedBatches: number
  retryingBatches: number
  batches: RenderBatchProgress[]
}

export interface DeckRenderOptions {
  retryBatchIndexes?: number[]
  previousProgress?: RenderTaskProgress
  onProgress?: (progress: RenderTaskProgress) => void | Promise<void>
}

export interface DeckRenderExecutionResult {
  deck: AIDeck
  slides: unknown[]
  progress: RenderTaskProgress
  partialSuccess: boolean
  status?: 'partial_success'
}

export type CompactDeckContext = Pick<
  AIDeck,
  'topic' | 'language' | 'outlineSummary' | 'goalPageCount' | 'actualPageCount' | 'templateId' | 'designSystem' | 'themeName' | 'contentBlueprint'
>
