import type { AIDeck } from '../../../ai-schema/src/ai-deck'
import type { CompactDeckContext, RenderBatch, RenderBatchSharedContext } from './render-batch.types'

const DEFAULT_BATCH_SIZE = 2
const MAX_RENDER_CONCURRENCY = 4

export const buildSharedRenderContext = (deck: AIDeck, batchIndex: number): RenderBatchSharedContext => {
  const compactDeck: CompactDeckContext = {
    topic: deck.topic,
    language: deck.language,
    outlineSummary: deck.outlineSummary,
    goalPageCount: deck.goalPageCount,
    actualPageCount: deck.actualPageCount,
    templateId: deck.templateId,
    designSystem: deck.designSystem,
    themeName: deck.themeName,
    contentBlueprint: deck.contentBlueprint?.slice(0, 8),
  }

  return {
    ...compactDeck,
    batchIndex,
  }
}

export const buildRenderBatches = (deck: AIDeck, batchSize = DEFAULT_BATCH_SIZE): RenderBatch[] => {
  if (!deck.slides.length) return []

  const normalizedBatchSize = Math.max(2, Math.min(4, Math.floor(batchSize)))
  const batchCount = Math.ceil(deck.slides.length / normalizedBatchSize)

  return Array.from({ length: batchCount }, (_, batchIndex) => {
    const slideStart = batchIndex * normalizedBatchSize
    const slideEnd = Math.min(deck.slides.length, slideStart + normalizedBatchSize)

    return {
      batchIndex,
      batchCount,
      slideStart,
      slideEnd,
      slides: deck.slides.slice(slideStart, slideEnd),
      sharedContext: buildSharedRenderContext(deck, batchIndex),
    }
  })
}

export const selectRenderConcurrency = (batchCount: number) => {
  if (batchCount <= 1) return 1
  return Math.min(MAX_RENDER_CONCURRENCY, Math.ceil((batchCount + 1) / 2))
}
