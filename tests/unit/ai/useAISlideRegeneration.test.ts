import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/ai/services/aiDeck', () => ({
  regenerateSlide: vi.fn(() => Promise.resolve({
    slide: {
      id: 'regen_1',
      kind: 'content',
      title: '影响职业选择的关键因素',
      bullets: ['个人兴趣与岗位匹配'],
      regeneratable: true,
    },
  })),
}))

describe('useAISlideRegeneration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('stores a preview slide before any live mutation', async () => {
    const { default: useAISlideRegeneration } = await import('@/ai/hooks/useAISlideRegeneration')
    const regeneration = useAISlideRegeneration()
    await regeneration.regenerateCurrentSlide({ deckId: 'deck_1', slideId: 'slide_1' } as any)
    expect(regeneration.previewSlide.value?.id).toBe('regen_1')
  })
})
