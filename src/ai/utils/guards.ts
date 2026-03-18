import type { AISlide } from '../types/slide'

export const isAISlide = (value: unknown): value is AISlide => {
  if (!value || typeof value !== 'object') return false
  const slide = value as Record<string, unknown>
  return typeof slide.id === 'string' && typeof slide.title === 'string' && typeof slide.regeneratable === 'boolean'
}
