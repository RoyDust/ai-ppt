import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSlidesStore } from '@/store'

describe('useAIDeckLoader', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads rendered slides into the editor when overwrite is true', async () => {
    const { default: useAIDeckLoader } = await import('@/ai/hooks/useAIDeckLoader')
    const slidesStore = useSlidesStore()
    const loader = useAIDeckLoader()

    loader.loadSlidesIntoEditor([{ id: 'slide_1', elements: [], background: { type: 'solid', color: '#fff' } }] as any, true)
    expect(slidesStore.slides).toHaveLength(1)
  })
})
