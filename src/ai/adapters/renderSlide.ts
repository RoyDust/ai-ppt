import { nanoid } from 'nanoid'
import type { Slide } from '@/types/slides'
import type { AISlide } from '../types/slide'

const slideKindMap = {
  cover: 'cover',
  content: 'content',
  summary: 'contents',
  closing: 'end',
} as const

export const renderAISlideToPPTistSlide = (slide: AISlide, template: Slide) => {
  return {
    ...template,
    id: slide.id || nanoid(10),
    type: slideKindMap[slide.kind],
    background: template.background,
    elements: template.elements || [],
  }
}
