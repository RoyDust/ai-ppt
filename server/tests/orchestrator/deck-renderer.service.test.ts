import { describe, expect, it } from 'vitest'
import { vi } from 'vitest'

import { DeckRendererService } from '../../libs/ai-orchestrator/src/renderer/deck-renderer.service'
import { buildRenderBatches, selectRenderConcurrency } from '../../libs/ai-orchestrator/src/renderer/render-batch.utils'

describe('render batch utils', () => {
  it('splits a 10-slide deck into contiguous batches', () => {
    const deck = {
      slides: Array.from({ length: 10 }, (_, index) => ({ id: `s${index + 1}`, title: `Slide ${index + 1}` })),
    } as any

    const batches = buildRenderBatches(deck)
    expect(batches.length).toBeGreaterThan(1)
    expect(batches[0]?.slides[0]?.id).toBe('s1')
    expect(batches.at(-1)?.slides.at(-1)?.id).toBe('s10')
  })

  it('caps dynamic concurrency at four workers', () => {
    expect(selectRenderConcurrency(1)).toBe(1)
    expect(selectRenderConcurrency(3)).toBe(2)
    expect(selectRenderConcurrency(5)).toBe(3)
    expect(selectRenderConcurrency(9)).toBe(4)
  })

  it('retries only failed batches and preserves successful outputs', async () => {
    const renderDeckBatch = vi
      .fn()
      .mockResolvedValueOnce({
        slides: [
          { id: 's1', kind: 'content', title: 'ok-1' },
          { id: 's2', kind: 'content', title: 'ok-2' },
        ],
      })
      .mockRejectedValueOnce(new Error('429'))
      .mockResolvedValueOnce({
        slides: [
          { id: 's3', kind: 'content', title: 'ok-3-retry' },
          { id: 's4', kind: 'content', title: 'ok-4-retry' },
        ],
      })

    const service = new DeckRendererService({ renderDeckBatch } as any, { convert: vi.fn(() => []) } as any)
    const result = await service.render({
      id: 'deck_1',
      topic: 'Topic',
      goalPageCount: 4,
      actualPageCount: 4,
      language: 'zh-CN',
      outlineSummary: 'Summary',
      slides: [
        { id: 's1', kind: 'content', title: '1', bullets: [] },
        { id: 's2', kind: 'content', title: '2', bullets: [] },
        { id: 's3', kind: 'content', title: '3', bullets: [] },
        { id: 's4', kind: 'content', title: '4', bullets: [] },
      ],
    } as any)

    expect(renderDeckBatch).toHaveBeenCalledTimes(3)
    expect(result.deck.slides[0].title).toBe('ok-1')
    expect(result.deck.slides[1].title).toBe('ok-2')
    expect(result.deck.slides[2].title).toBe('ok-3-retry')
    expect(result.deck.slides[3].title).toBe('ok-4-retry')
  })

  it('returns partial success details when some batches still fail after retries', async () => {
    const renderDeckBatch = vi
      .fn()
      .mockResolvedValueOnce({
        slides: [
          { id: 's1', kind: 'content', title: 'ok-1' },
          { id: 's2', kind: 'content', title: 'ok-2' },
        ],
      })
      .mockRejectedValue(new Error('429 rate limit'))

    const service = new DeckRendererService({ renderDeckBatch } as any, { convert: vi.fn(() => []) } as any)
    const result = await service.render({
      id: 'deck_2',
      topic: 'Topic',
      goalPageCount: 4,
      actualPageCount: 4,
      language: 'zh-CN',
      outlineSummary: 'Summary',
      slides: [
        { id: 's1', kind: 'content', title: '1', bullets: [] },
        { id: 's2', kind: 'content', title: '2', bullets: [] },
        { id: 's3', kind: 'content', title: '3', bullets: [] },
        { id: 's4', kind: 'content', title: '4', bullets: [] },
      ],
    } as any)

    expect(result.partialSuccess).toBe(true)
    expect(result.progress.failedBatches).toBe(1)
    expect(result.progress.batches[1]).toMatchObject({
      batchIndex: 1,
      status: 'failed',
      failureCategory: 'rate_limit',
      retryCount: 3,
      canRetry: true,
    })
  })
})
