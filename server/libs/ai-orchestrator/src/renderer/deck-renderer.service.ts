import type { AIDeck } from '../../../ai-schema/src/ai-deck'
import type { AISlide } from '../../../ai-schema/src/ai-slide'
import type { LLMProvider } from '../providers/llm-provider.interface'
import { DeckToSlidesService } from '../../../pptist-adapter/src/deck-to-slides.service'
import { buildRenderBatches, selectRenderConcurrency } from './render-batch.utils'
import type {
  DeckRenderExecutionResult,
  DeckRenderOptions,
  RenderBatch,
  RenderBatchFailureCategory,
  RenderBatchProgress,
  RenderTaskProgress,
} from './render-batch.types'

export class DeckRendererService {
  constructor(
    private readonly provider?: LLMProvider,
    private readonly deckToSlidesService = new DeckToSlidesService(),
  ) {}

  async render(deck: AIDeck, options: DeckRenderOptions = {}): Promise<DeckRenderExecutionResult> {
    return await this.renderDeckWithProvider(deck, options)
  }

  async retryFailedBatches(deck: AIDeck, options: Omit<DeckRenderOptions, 'retryBatchIndexes'> & { retryBatchIndexes: number[] }) {
    return await this.render(deck, options)
  }

  private async renderDeckWithProvider(deck: AIDeck, options: DeckRenderOptions): Promise<DeckRenderExecutionResult> {
    if (!this.provider) {
      return {
        deck,
        slides: this.deckToSlidesService.convert(deck),
        partialSuccess: false,
        progress: {
          totalBatches: 0,
          completedBatches: 0,
          failedBatches: 0,
          retryingBatches: 0,
          batches: [],
        },
      }
    }
    if (!this.provider.renderDeckBatch) {
      const finalDeck = (await this.provider.renderDeck({ deck })).deck
      return {
        deck: finalDeck,
        slides: this.deckToSlidesService.convert(finalDeck),
        partialSuccess: false,
        progress: {
          totalBatches: 1,
          completedBatches: 1,
          failedBatches: 0,
          retryingBatches: 0,
          batches: [],
        },
      }
    }

    const batches = buildRenderBatches(deck)
    if (!batches.length) {
      return {
        deck,
        slides: this.deckToSlidesService.convert(deck),
        partialSuccess: false,
        progress: {
          totalBatches: 0,
          completedBatches: 0,
          failedBatches: 0,
          retryingBatches: 0,
          batches: [],
        },
      }
    }

    const progress = this.initializeProgress(batches, options.previousProgress)
    const selectedBatchIndexes = new Set(options.retryBatchIndexes ?? batches.map(batch => batch.batchIndex))

    await this.publishProgress(progress, options)
    await this.processBatches(
      batches.filter(batch => selectedBatchIndexes.has(batch.batchIndex)),
      progress,
      options,
    )

    const successfulSlides = progress.batches
      .sort((left, right) => left.batchIndex - right.batchIndex)
      .flatMap(batch => batch.renderedSlides ?? [])

    const hasFailures = progress.failedBatches > 0
    if (hasFailures) {
      return {
        deck,
        slides: [],
        progress,
        partialSuccess: true,
        status: 'partial_success',
      }
    }

    const finalDeck = {
      ...deck,
      actualPageCount: successfulSlides.length || deck.actualPageCount,
      slides: successfulSlides,
    }
    return {
      deck: finalDeck,
      slides: this.deckToSlidesService.convert(finalDeck),
      progress,
      partialSuccess: false,
    }
  }

  private async processBatches(
    batches: RenderBatch[],
    progress: RenderTaskProgress,
    options: DeckRenderOptions,
  ) {
    const concurrency = selectRenderConcurrency(batches.length)
    const pending = [...batches]

    const worker = async () => {
      while (pending.length) {
        const batch = pending.shift()
        if (!batch) return
        const state = progress.batches[batch.batchIndex]
        if (!state) continue
        state.status = state.renderedSlides?.length ? 'retrying' : 'running'
        await this.recalculateProgress(progress, options)
        const result = await this.renderBatchWithRetry(batch)
        if (result.ok) {
          state.status = 'succeeded'
          state.retryCount = result.retryCount
          state.canRetry = false
          state.failureCategory = undefined
          state.errorMessage = undefined
          state.renderedSlides = result.slides
        }
        else {
          state.status = 'failed'
          state.retryCount = result.retryCount
          state.canRetry = true
          state.failureCategory = result.failureCategory
          state.errorMessage = result.errorMessage
        }
        await this.recalculateProgress(progress, options)
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()))
  }

  private async renderBatchWithRetry(batch: RenderBatch) {
    const attempts = this.expandBatchAttempts(batch)
    let lastError: unknown
    let retryCount = 0

    for (const [attemptIndex, candidate] of attempts.entries()) {
      try {
        const result = await this.provider?.renderDeckBatch?.({
          sharedContext: candidate.sharedContext,
          batchIndex: candidate.batchIndex,
          batchCount: candidate.batchCount,
          slides: candidate.slides,
        })

        if (!result?.slides?.length) {
          throw new Error(`Empty render result for batch ${candidate.batchIndex}`)
        }

        return {
          ok: true as const,
          slides: result.slides,
          retryCount: attemptIndex + 1,
        }
      }
      catch (error) {
        lastError = error
        retryCount = attemptIndex + 1
      }
    }

    return {
      ok: false as const,
      retryCount,
      errorMessage: lastError instanceof Error ? lastError.message : `Failed to render batch ${batch.batchIndex}`,
      failureCategory: this.classifyBatchFailure(lastError),
    }
  }

  private expandBatchAttempts(batch: RenderBatch) {
    const degradedContext = {
      ...batch.sharedContext,
      outlineSummary: batch.sharedContext.outlineSummary.slice(0, 120),
      contentBlueprint: batch.sharedContext.contentBlueprint?.slice(0, 4),
    }

    const minimalContext = {
      ...degradedContext,
      outlineSummary: batch.sharedContext.topic,
      contentBlueprint: undefined,
    }

    return [
      batch,
      {
        ...batch,
        sharedContext: degradedContext,
      },
      {
        ...batch,
        sharedContext: minimalContext,
      },
    ]
  }

  private initializeProgress(batches: RenderBatch[], previousProgress?: RenderTaskProgress): RenderTaskProgress {
    const previousByIndex = new Map(previousProgress?.batches.map(batch => [batch.batchIndex, batch]) ?? [])
    const progress: RenderTaskProgress = {
      totalBatches: batches.length,
      completedBatches: 0,
      failedBatches: 0,
      retryingBatches: 0,
      batches: batches.map(batch => {
        const previous = previousByIndex.get(batch.batchIndex)
        return {
          batchIndex: batch.batchIndex,
          batchCount: batch.batchCount,
          slideStart: batch.slideStart,
          slideEnd: batch.slideEnd,
          status: previous?.status === 'succeeded' ? 'succeeded' : 'pending',
          retryCount: previous?.retryCount ?? 0,
          canRetry: previous?.canRetry ?? false,
          failureCategory: previous?.failureCategory,
          errorMessage: previous?.errorMessage,
          renderedSlides: previous?.renderedSlides,
        }
      }),
    }
    this.updateAggregateCounts(progress)
    return progress
  }

  private async recalculateProgress(progress: RenderTaskProgress, options: DeckRenderOptions) {
    this.updateAggregateCounts(progress)
    await this.publishProgress(progress, options)
  }

  private updateAggregateCounts(progress: RenderTaskProgress) {
    progress.completedBatches = progress.batches.filter(batch => batch.status === 'succeeded').length
    progress.failedBatches = progress.batches.filter(batch => batch.status === 'failed').length
    progress.retryingBatches = progress.batches.filter(batch => batch.status === 'running' || batch.status === 'retrying').length
  }

  private async publishProgress(progress: RenderTaskProgress, options: DeckRenderOptions) {
    await options.onProgress?.(this.cloneProgress(progress))
  }

  private cloneProgress(progress: RenderTaskProgress): RenderTaskProgress {
    return {
      ...progress,
      batches: progress.batches.map(batch => ({
        ...batch,
        renderedSlides: batch.renderedSlides?.map(slide => ({ ...slide })),
      })),
    }
  }

  private classifyBatchFailure(error: unknown): RenderBatchFailureCategory {
    const message = error instanceof Error ? error.message : String(error ?? '')

    if (/timed out|abort/i.test(message)) return 'timeout'
    if (/\b429\b|rate limit/i.test(message)) return 'rate_limit'
    if (/\b5\d{2}\b/.test(message)) return 'server_error'
    if (/Invalid model output|No JSON object|Missing model content|Empty render result/i.test(message)) return 'invalid_output'
    return 'unknown'
  }
}
