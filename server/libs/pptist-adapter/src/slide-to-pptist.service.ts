import type { AISlide } from '../../ai-schema/src/ai-slide'

export class SlideToPPTistService {
  convert(slide: AISlide) {
    return {
      id: slide.id,
      title: slide.title,
      elements: [],
    }
  }
}
