import { describe, expect, it } from 'vitest'
import { renderAISlideToPPTistSlide } from '@/ai/adapters/renderSlide'

describe('frontend ai adapter', () => {
  it('renders a semantic slide into a PPTist-compatible slide shell', () => {
    const rendered = renderAISlideToPPTistSlide(
      { id: 'slide_1', kind: 'content', title: '职业规划的重要性', regeneratable: true },
      { id: 'template_1', elements: [], background: { type: 'solid', color: '#fff' } } as any,
    )

    expect(rendered.id).toBeDefined()
    expect(rendered.background).toEqual({ type: 'solid', color: '#fff' })
  })
})
