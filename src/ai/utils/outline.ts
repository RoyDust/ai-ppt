import type { PPTElement, Slide, TextType } from '@/types/slides'

export const normalizeOutlineItems = (items: string[]) =>
  items.map(item => item.trim()).filter(Boolean)

export const checkTextType = (el: PPTElement, type: TextType) =>
  (el.type === 'text' && el.textType === type) || (el.type === 'shape' && el.text && el.text.type === type)

export const getUseableTemplates = (templates: Slide[], n: number, type: TextType) => {
  if (n === 1) {
    const list = templates.filter(slide => {
      const items = slide.elements.filter(el => checkTextType(el, type))
      const titles = slide.elements.filter(el => checkTextType(el, 'title'))
      const texts = slide.elements.filter(el => checkTextType(el, 'content'))

      return !items.length && titles.length === 1 && texts.length === 1
    })

    if (list.length) return list
  }

  let target: Slide | null = null
  const list = templates.filter(slide => slide.elements.filter(el => checkTextType(el, type)).length >= n)

  if (list.length === 0) {
    const sorted = [...templates].sort((a, b) => {
      const aLen = a.elements.filter(el => checkTextType(el, type)).length
      const bLen = b.elements.filter(el => checkTextType(el, type)).length
      return aLen - bLen
    })
    target = sorted[sorted.length - 1] ?? null
  }
  else {
    target = list.reduce((closest, current) => {
      const currentLen = current.elements.filter(el => checkTextType(el, type)).length
      const closestLen = closest.elements.filter(el => checkTextType(el, type)).length
      return currentLen - n <= closestLen - n ? current : closest
    })
  }

  if (!target) return templates

  const targetLen = target.elements.filter(el => checkTextType(el, type)).length
  return templates.filter(slide => slide.elements.filter(el => checkTextType(el, type)).length === targetLen)
}
