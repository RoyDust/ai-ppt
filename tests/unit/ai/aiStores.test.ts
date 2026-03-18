import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAITasksStore } from '@/ai/stores/aiTasks'

describe('frontend ai stores', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('tracks planning state separately from editor state', () => {
    const store = useAITasksStore()
    store.setPlanningState('loading')
    expect(store.planningState).toBe('loading')
  })
})
