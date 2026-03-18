import type { AIPPTSlide } from '@/types/AIPPT'
import type { Slide } from '@/types/slides'
import type { AIDeck } from '../types/deck'
import { renderAISlideToPPTistSlide } from './renderSlide'

const splitContentSlide = (slide: Extract<AIPPTSlide, { type: 'content' }>) => {
  const items = slide.data.items

  if (items.length === 5 || items.length === 6) {
    return [
      { ...slide, data: { ...slide.data, items: items.slice(0, 3) } },
      { ...slide, data: { ...slide.data, items: items.slice(3) }, offset: 3 },
    ]
  }
  if (items.length === 7 || items.length === 8) {
    return [
      { ...slide, data: { ...slide.data, items: items.slice(0, 4) } },
      { ...slide, data: { ...slide.data, items: items.slice(4) }, offset: 4 },
    ]
  }
  if (items.length === 9 || items.length === 10) {
    return [
      { ...slide, data: { ...slide.data, items: items.slice(0, 3) } },
      { ...slide, data: { ...slide.data, items: items.slice(3, 6) }, offset: 3 },
      { ...slide, data: { ...slide.data, items: items.slice(6) }, offset: 6 },
    ]
  }
  if (items.length > 10) {
    return [
      { ...slide, data: { ...slide.data, items: items.slice(0, 4) } },
      { ...slide, data: { ...slide.data, items: items.slice(4, 8) }, offset: 4 },
      { ...slide, data: { ...slide.data, items: items.slice(8) }, offset: 8 },
    ]
  }

  return [slide]
}

const splitContentsSlide = (slide: Extract<AIPPTSlide, { type: 'contents' }>) => {
  const items = slide.data.items

  if (items.length === 11) {
    return [
      { ...slide, data: { ...slide.data, items: items.slice(0, 6) } },
      { ...slide, data: { ...slide.data, items: items.slice(6) }, offset: 6 },
    ]
  }
  if (items.length > 11) {
    return [
      { ...slide, data: { ...slide.data, items: items.slice(0, 10) } },
      { ...slide, data: { ...slide.data, items: items.slice(10) }, offset: 10 },
    ]
  }

  return [slide]
}

export const expandAIPPTSlidesForRendering = (slides: AIPPTSlide[]) => {
  const expanded: AIPPTSlide[] = []

  for (const slide of slides) {
    if (slide.type === 'content') expanded.push(...splitContentSlide(slide))
    else if (slide.type === 'contents') expanded.push(...splitContentsSlide(slide))
    else expanded.push(slide)
  }

  return expanded
}

export const renderAIDeckToPPTistSlides = (deck: AIDeck, template: Slide) =>
  deck.slides.map(slide => renderAISlideToPPTistSlide(slide, template))
