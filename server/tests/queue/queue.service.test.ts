import { describe, expect, it, vi } from 'vitest'

describe('QueueService', () => {
  it('tracks running progress and partial success metadata', async () => {
    vi.mock('@nestjs/common', () => ({
      Injectable: () => () => undefined,
    }))
    const { QueueService } = await import('../../libs/queue/src/queue.service')
    const queue = new QueueService()
    const job = queue.enqueueAsync('deck_render', { deckId: 'd1' }, async (ctx: any) => {
      ctx.updateProgress({ totalBatches: 3, completedBatches: 1 })
      return { ok: true, status: 'partial_success' }
    })

    await new Promise(resolve => setTimeout(resolve, 0))
    const stored = queue.getJob(job.id)

    expect(stored?.status).toBe('partial_success')
    expect(stored?.progress?.completedBatches).toBe(1)
  })
})
