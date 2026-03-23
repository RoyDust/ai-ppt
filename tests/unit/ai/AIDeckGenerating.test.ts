import { createApp, h, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AIDeckGenerating from '@/ai/components/AIDeckGenerating.vue'

afterEach(() => {
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

const flushUi = async () => {
  await Promise.resolve()
  await nextTick()
}

describe('AIDeckGenerating', () => {
  it('shows failed batch details and retry action for partial success renders', async () => {
    const onRetryFailedBatches = vi.fn(async () => undefined)
    const host = document.createElement('div')
    document.body.appendChild(host)

    createApp({
      render: () => h(AIDeckGenerating, {
        lastPolledAt: '16:20:00',
        renderState: 'partial_success',
        renderError: '有 1 个批次生成失败',
        canRetryFailedBatches: true,
        progress: {
          totalBatches: 2,
          completedBatches: 1,
          failedBatches: 1,
          retryingBatches: 0,
          batches: [
            { batchIndex: 0, slideStart: 0, slideEnd: 2, status: 'succeeded', retryCount: 1 },
            { batchIndex: 1, slideStart: 2, slideEnd: 4, status: 'failed', retryCount: 3, failureCategory: 'rate_limit', errorMessage: '429 rate limit', canRetry: true },
          ],
        },
        onRetryFailedBatches,
      }),
    }).mount(host)

    await flushUi()

    expect(host.textContent).toContain('Batch 2')
    expect(host.textContent).toContain('第 3-4 页')
    expect(host.textContent).toContain('rate_limit')
    expect(host.textContent).toContain('429 rate limit')
    expect(host.textContent).toContain('重跑失败批次')

    const retryButton = Array.from(host.querySelectorAll('button')).find(button => button.textContent?.includes('重跑失败批次')) as HTMLButtonElement
    retryButton.click()
    await flushUi()

    expect(onRetryFailedBatches).toHaveBeenCalledTimes(1)
  })
})
