import { nanoid } from 'nanoid'
import type { PPTElement, PPTShapeElement, PPTTextElement, Slide } from '@/types/slides'
import type { AISlide } from '../types/slide'
import { checkTextType } from '@/ai/utils/outline'

const slideKindMap = {
  cover: 'cover',
  content: 'content',
  summary: 'contents',
  closing: 'end',
} as const

type TextCapableElement = PPTTextElement | PPTShapeElement
interface SlotFillSpec {
  items: string[]
  bulletList?: boolean
}

type LayoutTemplate =
  | 'master_split'
  | 'master_timeline'
  | 'master_compare'
  | 'master_table'

const SLOT_HORIZONTAL_PADDING = 20
const SLOT_VERTICAL_PADDING = 20
const MIN_FONT_SIZE = 10

const getTextWeightLength = (text: string) => {
  let length = 0
  for (const char of text) {
    if (/\s/.test(char)) length += 0.3
    else if (/[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af]/.test(char)) length += 1
    else if (/[A-Z0-9]/.test(char)) length += 0.72
    else length += 0.58
  }
  return length
}

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const toParagraphs = (items: string[], options?: { strongFirst?: boolean; bulletList?: boolean }) => {
  if (options?.bulletList) {
    return items.map(item => `<p>• ${escapeHtml(item)}</p>`).join('')
  }

  return items
    .map((item, index) => {
      if (options?.strongFirst && index === 0) return `<p><strong>${escapeHtml(item)}</strong></p>`
      return `<p>${escapeHtml(item)}</p>`
    })
    .join('')
}

const createTextElement = (input: {
  left: number
  top: number
  width: number
  height: number
  content: string
  fontSize: number
  color: string
  textType: PPTTextElement['textType']
}): PPTTextElement => ({
  id: nanoid(10),
  type: 'text',
  left: input.left,
  top: input.top,
  width: input.width,
  height: input.height,
  rotate: 0,
  content: input.content.includes('<p>')
    ? input.content.replace(/<p>/g, `<p><span style="font-size: ${input.fontSize}px;">`).replace(/<\/p>/g, '</span></p>')
    : `<p><span style="font-size: ${input.fontSize}px;">${input.content}</span></p>`,
  defaultFontName: 'Microsoft YaHei',
  defaultColor: input.color,
  lineHeight: 1.45,
  paragraphSpace: 6,
  textType: input.textType,
})

const buildContentBlocks = (slide: AISlide) => {
  const supportingSummary = [slide.subtitle, slide.summary]
    .filter((item): item is string => Boolean(item?.trim()))
  const bulletItems = slide.bullets?.filter(Boolean) || []
  const sectionItems = slide.bodySections?.flatMap(section => {
    const parts = [section.heading, section.text].filter(Boolean)
    return parts.length ? [`${parts[0]}${parts[1] ? `：${parts[1]}` : ''}`] : []
  }) || []
  const highlightItems = slide.keyHighlights?.filter(Boolean) || []

  const detailItems = bulletItems.length ? bulletItems : sectionItems.length ? sectionItems : highlightItems

  return {
    summaryHtml: supportingSummary.length ? toParagraphs(supportingSummary, { strongFirst: slide.kind === 'cover' }) : '',
    detailHtml: detailItems.length ? toParagraphs(detailItems, { bulletList: true }) : '',
  }
}

const buildDetailItems = (slide: AISlide) => {
  const bulletItems = slide.bullets?.filter(Boolean) || []
  if (bulletItems.length) return bulletItems

  const sectionItems = slide.bodySections?.flatMap(section => {
    const heading = section.heading?.trim()
    const text = section.text?.trim()
    if (!heading && !text) return []
    if (heading && text) return [`${heading}：${text}`]
    return [heading || text || '']
  }).filter(Boolean) || []
  if (sectionItems.length) return sectionItems

  return slide.keyHighlights?.filter(Boolean) || []
}

const isTextElement = (element: PPTElement): element is PPTTextElement => element.type === 'text'

const isShapeTextElement = (element: PPTElement): element is PPTShapeElement =>
  element.type === 'shape' && !!element.text

const isTextCapableElement = (element: PPTElement): element is TextCapableElement =>
  isTextElement(element) || isShapeTextElement(element)

const sortTextSlots = (elements: TextCapableElement[]) =>
  [...elements].sort((a, b) => {
    if (a.top !== b.top) return a.top - b.top
    if (a.left !== b.left) return a.left - b.left
    return b.width * b.height - a.width * a.height
  })

const updateTextCapableElement = (element: TextCapableElement, content: string): TextCapableElement => {
  if (isTextElement(element)) {
    return {
      ...element,
      content,
    }
  }

  return {
    ...element,
    text: {
      ...element.text!,
      content,
    },
  }
}

const getElementHtml = (element: TextCapableElement) => isTextElement(element) ? element.content : element.text!.content

const getElementLineHeight = (element: TextCapableElement) =>
  isTextElement(element) ? (element.lineHeight || 1.5) : (element.text?.lineHeight || 1.2)

const getElementFontSize = (html: string) => {
  const match = html.match(/font-size:\s*(\d+(?:\.\d+)?)px/i)
  return match ? Number(match[1]) : 16
}

const getElementTextType = (element: TextCapableElement) =>
  isTextElement(element) ? element.textType : element.text?.type

const getLayoutTemplate = (slide: AISlide): LayoutTemplate | null => {
  const layoutTemplate = slide.metadata?.layoutTemplate
  if (
    layoutTemplate === 'master_split'
    || layoutTemplate === 'master_timeline'
    || layoutTemplate === 'master_compare'
    || layoutTemplate === 'master_table'
  ) {
    return layoutTemplate
  }
  return null
}

const isHeaderOrFooterSlot = (element: TextCapableElement) => {
  const textType = getElementTextType(element)
  return textType === 'header' || textType === 'footer'
}

const isHeaderContentSlot = (element: TextCapableElement) =>
  Boolean(checkTextType(element, 'content') && element.top < 200 && element.width >= 240)

const isSplitItemSlot = (element: TextCapableElement) =>
  Boolean(
    checkTextType(element, 'item')
    && element.left < 450
    && element.top >= 200,
  )

const isTimelineItemSlot = (element: TextCapableElement) =>
  Boolean(
    checkTextType(element, 'item')
    && element.top >= 200
    && element.width >= 180
    && element.width <= 340,
  )

const isCompareTitleSlot = (element: TextCapableElement, side: 'left' | 'right') =>
  Boolean(
    checkTextType(element, 'itemTitle')
    && element.top >= 200
    && (side === 'left' ? element.left < 430 : element.left >= 430),
  )

const isCompareBodySlot = (element: TextCapableElement, side: 'left' | 'right') =>
  Boolean(
    checkTextType(element, 'item')
    && element.top >= 240
    && (side === 'left' ? element.left < 430 : element.left >= 430),
  )

const isTableHeadingSlot = (element: TextCapableElement) =>
  Boolean(
    checkTextType(element, 'item')
    && element.top >= 240
    && element.left < 300
    && element.width <= 240,
  )

const isTableDetailSlot = (element: TextCapableElement) =>
  Boolean(
    (checkTextType(element, 'item') || checkTextType(element, 'content'))
    && element.top >= 240
    && element.left >= 300
    && element.width >= 260,
  )

const isReplaceableTextSlot = (element: TextCapableElement) => {
  const textType = getElementTextType(element)
  return Boolean(
    textType === 'title'
    || (textType === 'content' && element.width >= 180)
    || textType === 'item'
    || textType === 'itemTitle',
  )
}

const getMaxLinesForElement = (element: TextCapableElement) => {
  const textType = getElementTextType(element)
  if (textType === 'title') return 2
  if (textType === 'itemTitle') return 2
  if (textType === 'item') return 3
  if (textType === 'content') return 4
  return 4
}

const estimateFittedFontSize = (element: TextCapableElement, texts: string[]) => {
  const html = getElementHtml(element)
  const baseSize = getElementFontSize(html)
  const lineHeight = getElementLineHeight(element)
  const width = Math.max(80, element.width - SLOT_HORIZONTAL_PADDING)
  const height = Math.max(24, element.height - SLOT_VERTICAL_PADDING)
  const maxLines = getMaxLinesForElement(element)

  let fontSize = baseSize
  while (fontSize >= MIN_FONT_SIZE) {
    const charWidth = Math.max(fontSize * 0.52, 7)
    const totalLines = texts.reduce((sum, text) => {
      const weightedLength = Math.max(1, getTextWeightLength(text.trim() || ' '))
      const lineCount = Math.max(1, Math.ceil((weightedLength * charWidth) / width))
      return sum + lineCount
    }, 0)
    const allowedLinesByHeight = Math.max(1, Math.floor(height / Math.max(fontSize * lineHeight, 1)))
    const allowedLines = Math.max(1, Math.min(maxLines, allowedLinesByHeight))

    if (totalLines <= allowedLines) return fontSize
    fontSize -= fontSize <= 18 ? 1 : 2
  }

  return MIN_FONT_SIZE
}

const applyFontSizeToHtml = (html: string, fontSize: number) => {
  if (/font-size:\s*\d+(?:\.\d+)?px/i.test(html)) {
    return html.replace(/font-size:\s*\d+(?:\.\d+)?px/gi, `font-size: ${fontSize}px`)
  }
  return html.replace(/<p([^>]*)>/i, `<p$1 style="font-size: ${fontSize}px;">`)
}

const buildStyledHtml = (element: TextCapableElement, items: string[], options?: { bulletList?: boolean }) => {
  const sourceHtml = getElementHtml(element)
  const parser = new DOMParser()
  const doc = parser.parseFromString(sourceHtml || '<p></p>', 'text/html')
  const baseNode = doc.body.querySelector('p') || doc.body.firstElementChild || doc.createElement('p')
  const fittedFontSize = estimateFittedFontSize(element, items.map(item => options?.bulletList ? `• ${item}` : item))

  return items.map((item) => {
    const clone = baseNode.cloneNode(true) as HTMLElement
    const treeWalker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT)
    const firstTextNode = treeWalker.nextNode()
    const nextText = options?.bulletList ? `• ${item}` : item

    if (firstTextNode) {
      firstTextNode.textContent = nextText
      let node
      while ((node = treeWalker.nextNode())) {
        node.parentNode?.removeChild(node)
      }
    }
    else {
      clone.textContent = nextText
    }

    return applyFontSizeToHtml(clone.outerHTML, fittedFontSize)
  }).join('')
}

const applySlotMapToTemplate = (
  template: Slide,
  slotMap: Map<string, SlotFillSpec>,
  shouldClear: (element: TextCapableElement) => boolean,
) => template.elements.map((element) => {
  if (!isTextCapableElement(element)) return element
  const fill = slotMap.get(element.id)
  if (fill) {
    return updateTextCapableElement(element, buildStyledHtml(element, fill.items, { bulletList: fill.bulletList }))
  }
  if (shouldClear(element)) {
    return updateTextCapableElement(element, buildStyledHtml(element, ['']))
  }
  return element
})

const buildTemplateClearRule = (layoutTemplate: LayoutTemplate) => {
  if (layoutTemplate === 'master_split') {
    return (element: TextCapableElement) =>
      Boolean(checkTextType(element, 'title'))
      || isHeaderContentSlot(element)
      || isSplitItemSlot(element)
  }

  if (layoutTemplate === 'master_timeline') {
    return (element: TextCapableElement) =>
      Boolean(checkTextType(element, 'title'))
      || isHeaderContentSlot(element)
      || isTimelineItemSlot(element)
  }

  if (layoutTemplate === 'master_compare') {
    return (element: TextCapableElement) =>
      Boolean(checkTextType(element, 'title'))
      || isHeaderContentSlot(element)
      || isCompareTitleSlot(element, 'left')
      || isCompareTitleSlot(element, 'right')
      || isCompareBodySlot(element, 'left')
      || isCompareBodySlot(element, 'right')
  }

  return (element: TextCapableElement) =>
    Boolean(checkTextType(element, 'title'))
    || isHeaderContentSlot(element)
    || isTableHeadingSlot(element)
    || isTableDetailSlot(element)
}

const buildHeaderSlotMap = (slide: AISlide, textElements: TextCapableElement[]) => {
  const slotMap = new Map<string, SlotFillSpec>()
  const titleSlot = sortTextSlots(textElements.filter(element => checkTextType(element, 'title')))[0]
  const headerContentSlots = sortTextSlots(textElements.filter(isHeaderContentSlot))
  const subtitleSlot = headerContentSlots[0]
  const summarySlot = headerContentSlots[1]

  if (titleSlot && slide.title) {
    slotMap.set(titleSlot.id, { items: [slide.title] })
  }

  if (subtitleSlot && slide.subtitle?.trim()) {
    slotMap.set(subtitleSlot.id, { items: [slide.subtitle.trim()] })
  }

  const summaryText = slide.summary?.trim() || (!summarySlot ? slide.subtitle?.trim() : '')
  if (summarySlot && summaryText) {
    slotMap.set(summarySlot.id, { items: [summaryText] })
  }
  else if (!subtitleSlot && headerContentSlots[0] && summaryText) {
    slotMap.set(headerContentSlots[0].id, { items: [summaryText] })
  }

  return slotMap
}

const renderTemplateSpecificLayout = (slide: AISlide, template: Slide) => {
  const layoutTemplate = getLayoutTemplate(slide)
  if (!layoutTemplate) return null

  const textElements = template.elements.filter(isTextCapableElement)
  const slotMap = buildHeaderSlotMap(slide, textElements)

  if (!slotMap.size) return null

  if (layoutTemplate === 'master_split') {
    const detailItems = buildDetailItems(slide).slice(0, 4)
    const itemSlots = sortTextSlots(textElements.filter(isSplitItemSlot))

    itemSlots.forEach((slot, index) => {
      const item = detailItems[index]
      if (item) slotMap.set(slot.id, { items: [item] })
    })

    return applySlotMapToTemplate(
      template,
      slotMap,
      element => isReplaceableTextSlot(element) && buildTemplateClearRule(layoutTemplate)(element),
    )
  }

  if (layoutTemplate === 'master_timeline') {
    const items = buildDetailItems(slide).slice(0, 4)
    const itemSlots = sortTextSlots(textElements.filter(isTimelineItemSlot))

    itemSlots.forEach((slot, index) => {
      const item = items[index]
      if (item) slotMap.set(slot.id, { items: [item] })
    })

    return applySlotMapToTemplate(
      template,
      slotMap,
      element => isReplaceableTextSlot(element) && buildTemplateClearRule(layoutTemplate)(element),
    )
  }

  if (layoutTemplate === 'master_compare') {
    const sections = slide.bodySections?.slice(0, 2) || []
    const fallbackItems = buildDetailItems(slide).slice(0, 2)
    const leftSection = sections[0]
    const rightSection = sections[1]
    const leftTitleSlot = sortTextSlots(textElements.filter(element => isCompareTitleSlot(element, 'left')))[0]
    const rightTitleSlot = sortTextSlots(textElements.filter(element => isCompareTitleSlot(element, 'right')))[0]
    const leftBodySlot = sortTextSlots(textElements.filter(element => isCompareBodySlot(element, 'left')))[0]
    const rightBodySlot = sortTextSlots(textElements.filter(element => isCompareBodySlot(element, 'right')))[0]

    if (leftTitleSlot) slotMap.set(leftTitleSlot.id, { items: [leftSection?.heading?.trim() || '对照 A'] })
    if (rightTitleSlot) slotMap.set(rightTitleSlot.id, { items: [rightSection?.heading?.trim() || '对照 B'] })
    if (leftBodySlot) slotMap.set(leftBodySlot.id, { items: [leftSection?.text?.trim() || fallbackItems[0] || ''] })
    if (rightBodySlot) slotMap.set(rightBodySlot.id, { items: [rightSection?.text?.trim() || fallbackItems[1] || ''] })

    return applySlotMapToTemplate(
      template,
      slotMap,
      element => isReplaceableTextSlot(element) && buildTemplateClearRule(layoutTemplate)(element),
    )
  }

  if (layoutTemplate === 'master_table') {
    const sections = (slide.bodySections?.length
      ? slide.bodySections.map(section => ({
          heading: section.heading?.trim() || '',
          text: section.text?.trim() || '',
        }))
      : buildDetailItems(slide).map((item, index) => ({
          heading: `模块 ${index + 1}`,
          text: item,
        })))
      .slice(0, 5)

    const headingSlots = sortTextSlots(textElements.filter(isTableHeadingSlot))
    const detailSlots = sortTextSlots(textElements.filter(isTableDetailSlot))

    sections.forEach((section, index) => {
      const headingSlot = headingSlots[index]
      const detailSlot = detailSlots[index]
      if (headingSlot) slotMap.set(headingSlot.id, { items: [section.heading] })
      if (detailSlot) slotMap.set(detailSlot.id, { items: [section.text] })
    })

    return applySlotMapToTemplate(
      template,
      slotMap,
      element => isReplaceableTextSlot(element) && buildTemplateClearRule(layoutTemplate)(element),
    )
  }

  return null
}

const renderUsingExistingSlots = (slide: AISlide, template: Slide) => {
  const templateSpecific = renderTemplateSpecificLayout(slide, template)
  if (templateSpecific) return templateSpecific

  const detailItems = buildDetailItems(slide)
  const textElements = template.elements.filter(isTextCapableElement)
  const titleSlots = sortTextSlots(textElements.filter(element => checkTextType(element, 'title')))
  const summarySlots = sortTextSlots(textElements.filter(element =>
    checkTextType(element, 'content') && element.width >= 180,
  ))
  const itemTitleSlots = sortTextSlots(textElements.filter(element => checkTextType(element, 'itemTitle')))
  const itemSlots = sortTextSlots(textElements.filter(element => checkTextType(element, 'item')))

  if (!titleSlots.length && textElements.length < 3) return null

  const summarySource = [slide.subtitle, slide.summary].filter((item): item is string => Boolean(item?.trim()))
  const summaryHtml = summarySource.length ? toParagraphs(summarySource) : ''
  const itemTitleTexts = slide.bodySections?.map(section => section.heading?.trim()).filter(Boolean) || []
  const itemBodyTexts = slide.bodySections?.map(section => section.text?.trim()).filter(Boolean) || detailItems

  const slotMap = new Map<string, SlotFillSpec>()

  if (titleSlots.length) {
    slotMap.set(titleSlots[0].id, { items: [slide.title] })
  }

  if (summarySlots.length && summarySource.length) {
    slotMap.set(summarySlots[0].id, { items: summarySource })
  }

  itemTitleSlots.forEach((slot, index) => {
    const text = itemTitleTexts[index]
    if (text) slotMap.set(slot.id, { items: [text] })
  })

  itemSlots.forEach((slot, index) => {
    const text = itemBodyTexts[index]
    if (text) slotMap.set(slot.id, { items: [text] })
  })

  if (!itemSlots.length && summarySlots.length > 1) {
    detailItems.forEach((item, index) => {
      const slot = summarySlots[index + 1]
      if (slot) slotMap.set(slot.id, { items: [item], bulletList: true })
    })
  }

  const updatedElements = template.elements.map((element) => {
    if (!isTextCapableElement(element)) return element
    const fill = slotMap.get(element.id)
    if (!fill) {
      if (isReplaceableTextSlot(element)) {
        return updateTextCapableElement(element, buildStyledHtml(element, ['']))
      }
      return element
    }
    const content = buildStyledHtml(element, fill.items, { bulletList: fill.bulletList })
    return updateTextCapableElement(element, content)
  })

  if (slotMap.size >= 2) {
    return updatedElements
  }

  const textSlots = sortTextSlots(template.elements.filter(isTextCapableElement))
  if (textSlots.length < 3) return null

  const contentQueue: SlotFillSpec[] = [
    { items: [slide.title] },
    { items: summarySource.length ? summarySource : [slide.summary || slide.subtitle || ''] },
    { items: detailItems.length ? detailItems : [''], bulletList: true },
  ]

  return template.elements.map((element) => {
    if (!isTextCapableElement(element)) return element
    const slotIndex = textSlots.findIndex(slot => slot.id === element.id)
    const fill = slotIndex >= 0 ? contentQueue[slotIndex] : undefined
    if (!fill) {
      return updateTextCapableElement(element, buildStyledHtml(element, ['']))
    }
    const content = buildStyledHtml(element, fill.items, { bulletList: fill.bulletList })
    return updateTextCapableElement(element, content)
  })
}

export const renderAISlideToPPTistSlide = (slide: AISlide, template: Slide) => {
  const preservedElements = renderUsingExistingSlots(slide, template)
  if (preservedElements) {
    return {
      ...template,
      id: slide.id || nanoid(10),
      type: slideKindMap[slide.kind],
      background: template.background,
      elements: preservedElements,
    }
  }

  const { summaryHtml, detailHtml } = buildContentBlocks(slide)
  const isCover = slide.kind === 'cover'
  const titleHeight = isCover ? 120 : 96
  const summaryTop = isCover ? 190 : 152
  const detailTop = summaryHtml ? summaryTop + 92 : summaryTop
  const elements: PPTTextElement[] = [
    createTextElement({
      left: 72,
      top: isCover ? 84 : 60,
      width: 856,
      height: titleHeight,
      content: escapeHtml(slide.title),
      fontSize: isCover ? 28 : 24,
      color: '#132238',
      textType: 'title',
    }),
  ]

  if (summaryHtml) {
    elements.push(createTextElement({
      left: 72,
      top: summaryTop,
      width: 856,
      height: isCover ? 88 : 72,
      content: summaryHtml,
      fontSize: isCover ? 18 : 16,
      color: '#4f6278',
      textType: 'content',
    }))
  }

  if (detailHtml) {
    elements.push(createTextElement({
      left: 72,
      top: detailTop,
      width: 856,
      height: 220,
      content: detailHtml,
      fontSize: 16,
      color: '#24384d',
      textType: 'content',
    }))
  }

  return {
    ...template,
    id: slide.id || nanoid(10),
    type: slideKindMap[slide.kind],
    background: template.background,
    elements,
  }
}
