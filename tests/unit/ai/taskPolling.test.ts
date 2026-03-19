import { describe, expect, it, vi } from 'vitest'

import { pollAITaskUntilSettled } from '@/ai/utils/taskPolling'

describe('pollAITaskUntilSettled', () => {
  it('keeps polling queued tasks beyond the old 12 second cap until success', async () => {
    vi.useFakeTimers()

    const getTask = vi
      .fn()
      .mockResolvedValueOnce({ id: 'task_1', status: 'queued' })
      .mockResolvedValueOnce({ id: 'task_1', status: 'queued' })
      .mockResolvedValueOnce({ id: 'task_1', status: 'queued' })
      .mockResolvedValueOnce({ id: 'task_1', status: 'succeeded' })

    const promise = pollAITaskUntilSettled(getTask, 'task_1', {
      intervalMs: 5000,
      timeoutMs: 30000,
    })

    await vi.runAllTimersAsync()
    const result = await promise

    expect(getTask).toHaveBeenCalledTimes(4)
    expect(result.status).toBe('succeeded')

    vi.useRealTimers()
  })

  it('returns a failed task when polling times out', async () => {
    vi.useFakeTimers()

    const getTask = vi.fn().mockResolvedValue({ id: 'task_2', status: 'queued' })

    const promise = pollAITaskUntilSettled(getTask, 'task_2', {
      intervalMs: 5000,
      timeoutMs: 10000,
    })

    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.status).toBe('failed')
    expect(result.error).toContain('超时')

    vi.useRealTimers()
  })
})
