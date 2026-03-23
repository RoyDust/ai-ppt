import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useAITasksStore } from '@/ai/stores/aiTasks'

describe('ai task store batched render state', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('stores aggregate batch progress from the parent render task', () => {
    const store = useAITasksStore()
    store.setRenderProgress({ totalBatches: 4, completedBatches: 2, failedBatches: 0, retryingBatches: 1 })
    expect(store.renderProgress.completedBatches).toBe(2)
  })
})
