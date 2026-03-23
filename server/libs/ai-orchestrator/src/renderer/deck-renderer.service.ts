import type { AIDeck } from '../../../ai-schema/src/ai-deck'
import type { AISlide } from '../../../ai-schema/src/ai-slide'
import type { LLMProvider } from '../providers/llm-provider.interface'
import { DeckToSlidesService } from '../../../pptist-adapter/src/deck-to-slides.service'
import { buildRenderBatches, selectRenderConcurrency } from './render-batch.utils'
import type { RenderBatch } from './render-batch.types'

export class DeckRendererService {
  constructor(
    private readonly provider?: LLMProvider,
    private readonly deckToSlidesService = new DeckToSlidesService(),
  ) {}

  async render(deck: AIDeck) {
    const finalDeck = await this.renderDeckWithProvider(deck)
    return {
      deck: finalDeck,
      slides: this.deckToSlidesService.convert(finalDeck),
    }
  }

  private async renderDeckWithProvider(deck: AIDeck) {
    if (!this.provider) return deck
    if (!this.provider.renderDeckBatch) {
      return (await this.provider.renderDeck({ deck })).deck
    }

    const batches = buildRenderBatches(deck)
    if (!batches.length) return deck

    const batchEntries = await this.processBatches(batches)
    const slides = batchEntries
      .sort((left, right) => left.batch.batchIndex - right.batch.batchIndex)
      .flatMap(entry => entry.slides)

    return {
      ...deck,
      actualPageCount: slides.length || deck.actualPageCount,
      slides,
    }
  }

  private async processBatches(batches: RenderBatch[]) {
    const concurrency = selectRenderConcurrency(batches.length)
    const completed: Array<{ batch: RenderBatch; slides: AISlide[] }> = []
    const pending = [...batches]

    const worker = async () => {
      while (pending.length) {
        const batch = pending.shift()
        if (!batch) return
        const slides = await this.renderBatchWithRetry(batch)
        completed.push({ batch, slides })
      }
    }

    await Promise.all(Array.from({ length: concurrency }, () => worker()))
    return completed
  }

  private async renderBatchWithRetry(batch: RenderBatch): Promise<AISlide[]> {
    const attempts = this.expandBatchAttempts(batch)
    let lastError: unknown

    for (const candidate of attempts) {
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

        return result.slides
      }
      catch (error) {
        lastError = error
      }
    }

    throw lastError instanceof Error ? lastError : new Error(`Failed to render batch ${batch.batchIndex}`)
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
}
