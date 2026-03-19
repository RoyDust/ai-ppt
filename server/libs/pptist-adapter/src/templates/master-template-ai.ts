import type { AIDeck } from '../../../ai-schema/src/ai-deck'
import type { AISlide } from '../../../ai-schema/src/ai-slide'
import { registerDeckTemplate, type AIDeckTemplate, type PPTistSlide } from './template-registry'

type MasterLayoutTemplate =
  | 'master_cover'
  | 'master_section'
  | 'master_toc'
  | 'master_timeline'
  | 'master_split'
  | 'master_grid'
  | 'master_compare'
  | 'master_table'
  | 'master_summary'
  | 'master_closing'

const RECT_PATH = 'M 0 0 L 200 0 L 200 200 L 0 200 Z'
const CHIP_PATH = 'M 10 0 L 190 0 Q 200 0 200 10 L 200 30 Q 200 40 190 40 L 10 40 Q 0 40 0 30 L 0 10 Q 0 0 10 0 Z'
const CIRCLE_PATH = 'M 100 0 C 155 0 200 45 200 100 C 200 155 155 200 100 200 C 45 200 0 155 0 100 C 0 45 45 0 100 0 Z'
const PLACEHOLDER_IMAGE = 'https://placehold.co/960x540/1f2430/ffffff?text=MASTER_TEMPLATE_AI'
const COVER_LOGO = '/ppt/MASTER_TEMPLATE_AI_cover_logo.png'
const FONT_CN = 'Microsoft YaHei'
const FONT_EN = 'Arial'

const COLORS = {
  bg: '#ffffff',
  paper: '#f6f7fb',
  ink: '#0f1423',
  muted: '#5b6477',
  line: '#d9deea',
  purple: '#b50fb5',
  pink: '#ef155f',
  orange: '#fd6525',
  yellow: '#ffc300',
  green: '#75bd42',
  white: '#ffffff',
  darkOverlay: '#161b27',
  lightPurple: '#f8ebf8',
  lightOrange: '#fff2ea',
  lightYellow: '#fff8dd',
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const clampText = (value: string, max: number) => {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, Math.max(0, max - 1)).trim()}…`
}

const richParagraph = (text: string, fontSize: number, color: string, weight = false, align: 'left' | 'center' | 'right' = 'left') =>
  `<p style="text-align: ${align};">${weight ? '<strong>' : ''}<span style="font-size: ${fontSize}px;"><span style="font-family: ${FONT_CN};"><span style="color: ${color};">${escapeHtml(text)}</span></span></span>${weight ? '</strong>' : ''}</p>`

const baseSlide = (slide: AISlide, background = COLORS.bg): PPTistSlide => ({
  id: slide.id,
  background: { type: 'solid', color: background },
  elements: [],
})

const getLayoutTemplate = (slide: AISlide): MasterLayoutTemplate => {
  const layout = slide.metadata?.layoutTemplate
  if (typeof layout === 'string') return layout as MasterLayoutTemplate
  if (slide.kind === 'cover') return 'master_cover'
  if (slide.kind === 'summary') return 'master_summary'
  if (slide.kind === 'closing') return 'master_closing'
  return 'master_split'
}

const getPageNumber = (slide: AISlide, fallback: number) => {
  const pageNumber = slide.metadata?.pageNumber
  return typeof pageNumber === 'number' ? pageNumber : fallback
}

const getBullets = (slide: AISlide, fallback: string[]) => {
  const items = [
    ...(slide.keyHighlights ?? []),
    ...(slide.bullets ?? []),
    ...((slide.bodySections ?? []).map(section => `${section.heading} ${section.text}`.trim())),
  ].map(item => item.trim()).filter(Boolean)
  return items.length ? items : fallback
}

const getSubtitle = (slide: AISlide) =>
  clampText(slide.subtitle || slide.summary || '', 40)

const getSummary = (slide: AISlide, fallback = '') =>
  clampText(slide.summary || fallback, 88)

const getTitleSize = (title: string, large = 28) => {
  if (title.length > 28) return large - 6
  if (title.length > 20) return large - 3
  return large
}

const footerBand = (slide: AISlide, pageNumber: number) => [
  {
    id: `${slide.id}_footer_band_purple`,
    type: 'shape',
    left: 0,
    top: 500,
    width: 240,
    height: 40,
    rotate: 0,
    viewBox: [200, 200],
    path: RECT_PATH,
    fill: COLORS.purple,
  },
  {
    id: `${slide.id}_footer_band_pink`,
    type: 'shape',
    left: 240,
    top: 500,
    width: 220,
    height: 40,
    rotate: 0,
    viewBox: [200, 200],
    path: RECT_PATH,
    fill: COLORS.pink,
  },
  {
    id: `${slide.id}_footer_band_orange`,
    type: 'shape',
    left: 460,
    top: 500,
    width: 220,
    height: 40,
    rotate: 0,
    viewBox: [200, 200],
    path: RECT_PATH,
    fill: COLORS.orange,
  },
  {
    id: `${slide.id}_footer_band_yellow`,
    type: 'shape',
    left: 680,
    top: 500,
    width: 280,
    height: 40,
    rotate: 0,
    viewBox: [200, 200],
    path: RECT_PATH,
    fill: COLORS.yellow,
  },
  {
    id: `${slide.id}_footer_label`,
    type: 'text',
    left: 36,
    top: 506,
    width: 260,
    height: 20,
    rotate: 0,
    content: richParagraph('MASTER TEMPLATE AI', 11, COLORS.white, true),
    defaultFontName: FONT_EN,
    defaultColor: COLORS.white,
    textType: 'footer',
  },
  {
    id: `${slide.id}_page_number`,
    type: 'text',
    left: 858,
    top: 504,
    width: 72,
    height: 22,
    rotate: 0,
    content: richParagraph(String(pageNumber).padStart(2, '0'), 16, COLORS.ink, true, 'right'),
    defaultFontName: FONT_EN,
    defaultColor: COLORS.ink,
    textType: 'footer',
  },
]

const titleBlock = (slide: AISlide, summaryFallback = '') => [
  {
    id: `${slide.id}_eyebrow`,
    type: 'text',
    left: 64,
    top: 34,
    width: 180,
    height: 18,
    rotate: 0,
    content: richParagraph('PROJECT PLAN', 11, COLORS.purple, true),
    defaultFontName: FONT_EN,
    defaultColor: COLORS.purple,
    textType: 'header',
  },
  {
    id: `${slide.id}_title`,
    type: 'text',
    left: 64,
    top: 60,
    width: 760,
    height: 42,
    rotate: 0,
    content: richParagraph(clampText(slide.title || '', 34), getTitleSize(slide.title || '', 28), COLORS.ink, true),
    defaultFontName: FONT_CN,
    defaultColor: COLORS.ink,
    textType: 'title',
  },
  {
    id: `${slide.id}_title_accent`,
    type: 'shape',
    left: 64,
    top: 112,
    width: 120,
    height: 4,
    rotate: 0,
    viewBox: [200, 200],
    path: RECT_PATH,
    fill: COLORS.orange,
  },
  {
    id: `${slide.id}_subtitle`,
    type: 'text',
    left: 64,
    top: 128,
    width: 760,
    height: 20,
    rotate: 0,
    content: richParagraph(getSubtitle(slide), 13, COLORS.purple, true),
    defaultFontName: FONT_CN,
    defaultColor: COLORS.purple,
    textType: 'content',
  },
  {
    id: `${slide.id}_summary`,
    type: 'text',
    left: 64,
    top: 152,
    width: 760,
    height: 34,
    rotate: 0,
    content: richParagraph(getSummary(slide, summaryFallback), 14, COLORS.muted),
    defaultFontName: FONT_CN,
    defaultColor: COLORS.muted,
    textType: 'content',
  },
]

const cornerLogo = (slide: AISlide) => ({
  id: `${slide.id}_logo_hint`,
  type: 'text',
  left: 808,
  top: 34,
  width: 100,
  height: 36,
  rotate: 0,
  content: `${richParagraph('客户', 11, COLORS.muted, true, 'right')}${richParagraph('logo#', 16, COLORS.ink, true, 'right')}`,
  defaultFontName: FONT_CN,
  defaultColor: COLORS.ink,
  textType: 'content',
})

const renderCover = (deck: AIDeck, slide: AISlide, pageNumber: number): PPTistSlide => {
  const title = clampText(slide.title || deck.topic || '项目名称', 22)
  const titleLines = [title, '项目计划书']
  const signature = clampText(slide.subtitle || slide.summary || `${deck.topic || '项目主题'} 提案汇报`, 24)

  return {
    ...baseSlide(slide, COLORS.bg),
    type: 'cover',
    elements: [
      {
        id: `${slide.id}_cover_logo`,
        type: 'image',
        src: COVER_LOGO,
        left: 170,
        top: 64,
        width: 88,
        height: 18,
        rotate: 0,
        fixedRatio: false,
      },
      {
        id: `${slide.id}_cover_divider`,
        type: 'shape',
        left: 157,
        top: 64,
        width: 2,
        height: 20,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: '#c9ced7',
      },
      {
        id: `${slide.id}_logo_hint`,
        type: 'text',
        left: 48,
        top: 64,
        width: 106,
        height: 24,
        rotate: 0,
        content: `${richParagraph('#客户logo#', 14, COLORS.ink, true)}`,
        defaultFontName: FONT_CN,
        defaultColor: COLORS.ink,
        textType: 'content',
      },
      {
        id: `${slide.id}_title`,
        type: 'text',
        left: 83,
        top: 154,
        width: 520,
        height: 154,
        rotate: 0,
        content: titleLines.map((line, index) => `
          <p>
            <strong>
              <span style="font-size: 38px;">
                <span style="font-family: ${FONT_CN};">
                <span style="color: ${index === 0 ? COLORS.orange : COLORS.purple};">${escapeHtml(line)}</span>
                </span>
              </span>
            </strong>
          </p>
        `).join(''),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.orange,
        textType: 'title',
      },
      {
        id: `${slide.id}_company_signature`,
        type: 'text',
        left: 135,
        top: 364,
        width: 290,
        height: 42,
        rotate: 0,
        content: richParagraph(signature, 13, COLORS.muted),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.muted,
        textType: 'content',
      },
      ...footerBand(slide, pageNumber),
    ],
  }
}

const renderSection = (slide: AISlide, pageNumber: number): PPTistSlide => ({
  ...baseSlide(slide, COLORS.bg),
  type: 'content',
  elements: [
    {
      id: `${slide.id}_section_mark`,
      type: 'text',
      left: 70,
      top: 96,
      width: 180,
      height: 40,
      rotate: 0,
      content: `${richParagraph('PART', 14, COLORS.purple, true)}${richParagraph(String(pageNumber).padStart(2, '0'), 30, COLORS.ink, true)}`,
      defaultFontName: FONT_EN,
      defaultColor: COLORS.ink,
      textType: 'partNumber',
    },
    {
      id: `${slide.id}_section_title`,
      type: 'text',
      left: 70,
      top: 186,
      width: 620,
      height: 72,
      rotate: 0,
      content: richParagraph(clampText(slide.title || '', 26), getTitleSize(slide.title || '', 32), COLORS.ink, true),
      defaultFontName: FONT_CN,
      defaultColor: COLORS.ink,
      textType: 'title',
    },
    {
      id: `${slide.id}_section_summary`,
      type: 'text',
      left: 70,
      top: 274,
      width: 520,
      height: 64,
      rotate: 0,
      content: richParagraph(getSummary(slide, '章节页用于切换话题和节奏。'), 17, COLORS.muted),
      defaultFontName: FONT_CN,
      defaultColor: COLORS.muted,
      textType: 'content',
    },
    {
      id: `${slide.id}_section_block`,
      type: 'shape',
      left: 700,
      top: 98,
      width: 190,
      height: 286,
      rotate: 0,
      viewBox: [200, 200],
      path: RECT_PATH,
      fill: COLORS.lightPurple,
    },
    {
      id: `${slide.id}_section_block_line_1`,
      type: 'shape',
      left: 728,
      top: 134,
      width: 134,
      height: 8,
      rotate: 0,
      viewBox: [200, 200],
      path: RECT_PATH,
      fill: COLORS.purple,
    },
    {
      id: `${slide.id}_section_block_line_2`,
      type: 'shape',
      left: 728,
      top: 168,
      width: 108,
      height: 8,
      rotate: 0,
      viewBox: [200, 200],
      path: RECT_PATH,
      fill: COLORS.pink,
    },
    {
      id: `${slide.id}_section_block_line_3`,
      type: 'shape',
      left: 728,
      top: 202,
      width: 144,
      height: 8,
      rotate: 0,
      viewBox: [200, 200],
      path: RECT_PATH,
      fill: COLORS.orange,
    },
    cornerLogo(slide),
    ...footerBand(slide, pageNumber),
  ],
})

const renderToc = (slide: AISlide, pageNumber: number): PPTistSlide => {
  const items = getBullets(slide, ['项目背景', '研究设计', '周期与排期', '报价与交付']).slice(0, 6)
  return {
    ...baseSlide(slide, COLORS.bg),
    type: 'content',
    elements: [
      ...titleBlock(slide, '目录页用于让用户在一页内看懂演示结构。'),
      cornerLogo(slide),
      ...items.flatMap((item, index) => {
        const row = index
        const top = 204 + row * 42
        return [
          {
            id: `${slide.id}_toc_no_${index + 1}`,
            type: 'shape',
            left: 76,
            top,
            width: 28,
            height: 28,
            rotate: 0,
            viewBox: [200, 200],
            path: CIRCLE_PATH,
            fill: index % 2 === 0 ? COLORS.purple : COLORS.orange,
            text: {
              content: richParagraph(String(index + 1), 12, COLORS.white, true, 'center'),
              defaultFontName: FONT_EN,
              defaultColor: COLORS.white,
              align: 'middle',
            },
          },
          {
            id: `${slide.id}_toc_text_${index + 1}`,
            type: 'text',
            left: 118,
            top: top - 2,
            width: 286,
            height: 28,
            rotate: 0,
            content: richParagraph(clampText(item, 24), 15, COLORS.ink, index === 0),
            defaultFontName: FONT_CN,
            defaultColor: COLORS.ink,
            textType: 'item',
          },
        ]
      }),
      {
        id: `${slide.id}_toc_panel`,
        type: 'shape',
        left: 532,
        top: 194,
        width: 312,
        height: 232,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: COLORS.lightOrange,
      },
      {
        id: `${slide.id}_toc_panel_title`,
        type: 'text',
        left: 556,
        top: 222,
        width: 250,
        height: 24,
        rotate: 0,
        content: richParagraph('导读提示', 16, COLORS.orange, true),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.orange,
        textType: 'itemTitle',
      },
      {
        id: `${slide.id}_toc_panel_body`,
        type: 'text',
        left: 556,
        top: 262,
        width: 248,
        height: 110,
        rotate: 0,
        content: richParagraph(getSummary(slide, '用目录页建立阅读顺序，确保每一部分职责清晰。'), 15, COLORS.muted),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.muted,
        textType: 'content',
      },
      ...footerBand(slide, pageNumber),
    ],
  }
}

const renderTimeline = (slide: AISlide, pageNumber: number): PPTistSlide => {
  const items = getBullets(slide, ['起点', '转折', '扩张', '成熟']).slice(0, 4)
  return {
    ...baseSlide(slide, COLORS.paper),
    type: 'content',
    elements: [
      ...titleBlock(slide, '时间线页强调阶段变化与因果关系。'),
      cornerLogo(slide),
      {
        id: `${slide.id}_timeline_line`,
        type: 'shape',
        left: 468,
        top: 204,
        width: 6,
        height: 220,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: COLORS.purple,
      },
      ...items.flatMap((item, index) => {
        const isLeft = index % 2 === 0
        const top = 216 + index * 48
        const cardLeft = isLeft ? 84 : 514
        const fill = isLeft ? COLORS.lightPurple : COLORS.lightOrange
        return [
          {
            id: `${slide.id}_milestone_${index + 1}`,
            type: 'shape',
            left: cardLeft,
            top,
            width: 300,
            height: 38,
            rotate: 0,
            viewBox: [200, 200],
            path: RECT_PATH,
            fill,
          },
          {
            id: `${slide.id}_milestone_text_${index + 1}`,
            type: 'text',
            left: cardLeft + 18,
            top: top + 7,
            width: 262,
            height: 20,
            rotate: 0,
            content: richParagraph(clampText(item, 26), 14, COLORS.ink, true),
            defaultFontName: FONT_CN,
            defaultColor: COLORS.ink,
            textType: 'item',
          },
          {
            id: `${slide.id}_milestone_dot_${index + 1}`,
            type: 'shape',
            left: 452,
            top: top - 2,
            width: 36,
            height: 36,
            rotate: 0,
            viewBox: [200, 200],
            path: CIRCLE_PATH,
            fill: isLeft ? COLORS.purple : COLORS.orange,
            text: {
              content: richParagraph(String(index + 1), 12, COLORS.white, true, 'center'),
              defaultFontName: FONT_EN,
              defaultColor: COLORS.white,
              align: 'middle',
            },
          },
        ]
      }),
      ...footerBand(slide, pageNumber),
    ],
  }
}

const renderSplit = (slide: AISlide, pageNumber: number): PPTistSlide => {
  const items = getBullets(slide, ['要点一', '要点二', '要点三']).slice(0, 4)
  return {
    ...baseSlide(slide, COLORS.bg),
    type: 'content',
    elements: [
      ...titleBlock(slide, '左右混排用于承接文字与示意图片。'),
      cornerLogo(slide),
      {
        id: `${slide.id}_left_panel`,
        type: 'shape',
        left: 64,
        top: 204,
        width: 356,
        height: 232,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: COLORS.paper,
      },
      {
        id: `${slide.id}_divider`,
        type: 'shape',
        left: 450,
        top: 204,
        width: 4,
        height: 232,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: COLORS.orange,
      },
      ...items.map((item, index) => ({
        id: `${slide.id}_split_item_${index + 1}`,
        type: 'text',
        left: 88,
        top: 224 + index * 44,
        width: 292,
        height: 26,
        rotate: 0,
        content: richParagraph(`${index + 1}. ${clampText(item, 22)}`, 14, COLORS.ink, index === 0),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.ink,
        textType: 'item',
      })),
      {
        id: `${slide.id}_image`,
        type: 'image',
        src: PLACEHOLDER_IMAGE,
        left: 516,
        top: 204,
        width: 320,
        height: 232,
        rotate: 0,
        fixedRatio: false,
      },
      ...footerBand(slide, pageNumber),
    ],
  }
}

const renderGrid = (slide: AISlide, pageNumber: number): PPTistSlide => {
  const items = getBullets(slide, ['核心点一', '核心点二', '核心点三', '核心点四']).slice(0, 4)
  return {
    ...baseSlide(slide, COLORS.bg),
    type: 'content',
    elements: [
      ...titleBlock(slide, '网格页适合并列规则、模块或能力点。'),
      cornerLogo(slide),
      ...items.flatMap((item, index) => {
        const col = index % 2
        const row = Math.floor(index / 2)
        const left = 74 + col * 392
        const top = 214 + row * 108
        const fill = index % 2 === 0 ? COLORS.lightPurple : COLORS.lightOrange
        return [
          {
            id: `${slide.id}_grid_card_${index + 1}`,
            type: 'shape',
            left,
            top,
            width: 344,
            height: 84,
            rotate: 0,
            viewBox: [200, 200],
            path: RECT_PATH,
            fill,
          },
          {
            id: `${slide.id}_grid_no_${index + 1}`,
            type: 'shape',
            left: left + 18,
            top: top + 18,
            width: 34,
            height: 34,
            rotate: 0,
            viewBox: [200, 200],
            path: CIRCLE_PATH,
            fill: index % 2 === 0 ? COLORS.purple : COLORS.orange,
            text: {
              content: richParagraph(String(index + 1), 13, COLORS.white, true, 'center'),
              defaultFontName: FONT_EN,
              defaultColor: COLORS.white,
              align: 'middle',
            },
          },
          {
            id: `${slide.id}_grid_text_${index + 1}`,
            type: 'text',
            left: left + 66,
            top: top + 20,
            width: 256,
            height: 40,
            rotate: 0,
            content: richParagraph(clampText(item, 32), 14, COLORS.ink, true),
            defaultFontName: FONT_CN,
            defaultColor: COLORS.ink,
            textType: 'item',
          },
        ]
      }),
      ...footerBand(slide, pageNumber),
    ],
  }
}

const renderCompare = (slide: AISlide, pageNumber: number): PPTistSlide => {
  const sections = slide.bodySections?.slice(0, 2).map(section => ({
    heading: clampText(section.heading || '', 18),
    text: clampText(section.text || '', 78),
  })) ?? []
  const items = getBullets(slide, ['左侧对照内容', '右侧对照内容']).slice(0, 2)
  const leftTitle = sections[0]?.heading || '对照 A'
  const rightTitle = sections[1]?.heading || '对照 B'
  const leftBody = sections[0]?.text || clampText(items[0] || '', 78)
  const rightBody = sections[1]?.text || clampText(items[1] || '', 78)
  return {
    ...baseSlide(slide, COLORS.bg),
    type: 'content',
    elements: [
      ...titleBlock(slide, '对比页必须形成清晰的 A/B 分区。'),
      cornerLogo(slide),
      {
        id: `${slide.id}_compare_left`,
        type: 'shape',
        left: 74,
        top: 214,
        width: 344,
        height: 212,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: COLORS.lightPurple,
      },
      {
        id: `${slide.id}_compare_right`,
        type: 'shape',
        left: 478,
        top: 214,
        width: 344,
        height: 212,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: COLORS.lightYellow,
      },
      {
        id: `${slide.id}_compare_left_title`,
        type: 'text',
        left: 98,
        top: 238,
        width: 230,
        height: 24,
        rotate: 0,
        content: richParagraph(leftTitle, 16, COLORS.purple, true),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.purple,
        textType: 'itemTitle',
      },
      {
        id: `${slide.id}_compare_right_title`,
        type: 'text',
        left: 502,
        top: 238,
        width: 230,
        height: 24,
        rotate: 0,
        content: richParagraph(rightTitle, 16, COLORS.orange, true),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.orange,
        textType: 'itemTitle',
      },
      {
        id: `${slide.id}_compare_left_body`,
        type: 'text',
        left: 98,
        top: 278,
        width: 294,
        height: 118,
        rotate: 0,
        content: richParagraph(leftBody, 14, COLORS.ink),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.ink,
        textType: 'item',
      },
      {
        id: `${slide.id}_compare_right_body`,
        type: 'text',
        left: 502,
        top: 278,
        width: 294,
        height: 118,
        rotate: 0,
        content: richParagraph(rightBody, 14, COLORS.ink),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.ink,
        textType: 'item',
      },
      ...footerBand(slide, pageNumber),
    ],
  }
}

const renderTable = (slide: AISlide, pageNumber: number): PPTistSlide => {
  const sections = slide.bodySections?.length
    ? slide.bodySections.slice(0, 5).map(section => [section.heading || '项目', section.text || '说明'])
    : getBullets(slide, ['项目一', '项目二', '项目三', '项目四']).slice(0, 4).map((item, index) => [`模块 ${index + 1}`, item])

  return {
    ...baseSlide(slide, COLORS.bg),
    type: 'content',
    elements: [
      ...titleBlock(slide, '表格式页面用于周期、报价、清单或结构化信息。'),
      cornerLogo(slide),
      {
        id: `${slide.id}_table_header_left`,
        type: 'shape',
        left: 74,
        top: 214,
        width: 220,
        height: 34,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: COLORS.purple,
      },
      {
        id: `${slide.id}_table_header_right`,
        type: 'shape',
        left: 294,
        top: 214,
        width: 528,
        height: 34,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: COLORS.orange,
      },
      {
        id: `${slide.id}_table_header_left_text`,
        type: 'text',
        left: 92,
        top: 222,
        width: 120,
        height: 20,
        rotate: 0,
        content: richParagraph('项目内容', 13, COLORS.white, true),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.white,
        textType: 'itemTitle',
      },
      {
        id: `${slide.id}_table_header_right_text`,
        type: 'text',
        left: 316,
        top: 222,
        width: 180,
        height: 20,
        rotate: 0,
        content: richParagraph('时间需求 / 具体说明', 13, COLORS.white, true),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.white,
        textType: 'itemTitle',
      },
      ...sections.flatMap(([heading, text], index) => {
        const top = 248 + index * 42
        const fill = index % 2 === 0 ? COLORS.paper : COLORS.white
        return [
          {
            id: `${slide.id}_table_row_left_${index + 1}`,
            type: 'shape',
            left: 74,
            top,
            width: 220,
            height: 42,
            rotate: 0,
            viewBox: [200, 200],
            path: RECT_PATH,
            fill,
          },
          {
            id: `${slide.id}_table_row_right_${index + 1}`,
            type: 'shape',
            left: 294,
            top,
            width: 528,
            height: 42,
            rotate: 0,
            viewBox: [200, 200],
            path: RECT_PATH,
            fill,
          },
          {
            id: `${slide.id}_table_heading_${index + 1}`,
            type: 'text',
            left: 92,
            top: top + 10,
            width: 184,
            height: 20,
            rotate: 0,
            content: richParagraph(clampText(heading, 18), 13, COLORS.ink, true),
            defaultFontName: FONT_CN,
            defaultColor: COLORS.ink,
            textType: 'item',
          },
          {
            id: `${slide.id}_table_text_${index + 1}`,
            type: 'text',
            left: 316,
            top: top + 10,
            width: 474,
            height: 20,
            rotate: 0,
            content: richParagraph(clampText(text, 42), 13, COLORS.muted),
            defaultFontName: FONT_CN,
            defaultColor: COLORS.muted,
            textType: 'item',
          },
        ]
      }),
      ...footerBand(slide, pageNumber),
    ],
  }
}

const renderSummary = (slide: AISlide, pageNumber: number): PPTistSlide => {
  const items = getBullets(slide, ['结论一', '结论二', '结论三']).slice(0, 5)
  return {
    ...baseSlide(slide, COLORS.bg),
    type: 'content',
    elements: [
      ...titleBlock(slide, '总结页用于浓缩关键信息和结论。'),
      cornerLogo(slide),
      {
        id: `${slide.id}_summary_box`,
        type: 'shape',
        left: 74,
        top: 212,
        width: 390,
        height: 222,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: COLORS.lightPurple,
      },
      ...items.map((item, index) => ({
        id: `${slide.id}_summary_item_${index + 1}`,
        type: 'text',
        left: 98,
        top: 234 + index * 34,
        width: 336,
        height: 22,
        rotate: 0,
        content: richParagraph(`• ${clampText(item, 28)}`, 14, COLORS.ink, index === 0),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.ink,
        textType: 'item',
      })),
      {
        id: `${slide.id}_summary_panel`,
        type: 'shape',
        left: 512,
        top: 212,
        width: 310,
        height: 222,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: COLORS.lightOrange,
      },
      {
        id: `${slide.id}_summary_panel_title`,
        type: 'text',
        left: 538,
        top: 238,
        width: 190,
        height: 22,
        rotate: 0,
        content: richParagraph('验证结果', 16, COLORS.orange, true),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.orange,
        textType: 'itemTitle',
      },
      {
        id: `${slide.id}_summary_panel_text`,
        type: 'text',
        left: 538,
        top: 278,
        width: 238,
        height: 110,
        rotate: 0,
        content: richParagraph(clampText(slide.validationResult || getSummary(slide, ''), 74), 15, COLORS.muted),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.muted,
        textType: 'content',
      },
      ...footerBand(slide, pageNumber),
    ],
  }
}

const renderClosing = (deck: AIDeck, slide: AISlide, pageNumber: number): PPTistSlide => ({
  ...baseSlide(slide, COLORS.paper),
  type: 'content',
  elements: [
    {
      id: `${slide.id}_closing_photo`,
      type: 'image',
      src: PLACEHOLDER_IMAGE,
      left: 0,
      top: 0,
      width: 960,
      height: 540,
      rotate: 0,
      fixedRatio: false,
    },
    {
      id: `${slide.id}_closing_overlay`,
      type: 'shape',
      left: 0,
      top: 0,
      width: 960,
      height: 540,
      rotate: 0,
      viewBox: [200, 200],
      path: RECT_PATH,
      fill: COLORS.darkOverlay,
      opacity: 0.56,
    },
    {
      id: `${slide.id}_closing_title`,
      type: 'text',
      left: 200,
      top: 160,
      width: 560,
      height: 56,
      rotate: 0,
      content: richParagraph(clampText(slide.title || '感谢观看', 24), 32, COLORS.white, true, 'center'),
      defaultFontName: FONT_CN,
      defaultColor: COLORS.white,
      textType: 'title',
    },
    {
      id: `${slide.id}_closing_summary`,
      type: 'text',
      left: 220,
      top: 238,
      width: 520,
      height: 44,
      rotate: 0,
      content: richParagraph(getSummary(slide, `${deck.topic} 的核心内容到此结束。`), 17, COLORS.yellow, false, 'center'),
      defaultFontName: FONT_CN,
      defaultColor: COLORS.yellow,
      textType: 'content',
    },
    ...footerBand(slide, pageNumber),
  ],
})

const masterTemplateAI: AIDeckTemplate = {
  id: 'MASTER_TEMPLATE_AI',
  render(deck, slide) {
    const pageNumber = getPageNumber(slide, deck.slides.findIndex(item => item.id === slide.id) + 1)
    const layout = getLayoutTemplate(slide)

    switch (layout) {
      case 'master_cover':
        return renderCover(deck, slide, pageNumber)
      case 'master_section':
        return renderSection(slide, pageNumber)
      case 'master_toc':
        return renderToc(slide, pageNumber)
      case 'master_timeline':
        return renderTimeline(slide, pageNumber)
      case 'master_grid':
        return renderGrid(slide, pageNumber)
      case 'master_compare':
        return renderCompare(slide, pageNumber)
      case 'master_table':
        return renderTable(slide, pageNumber)
      case 'master_summary':
        return renderSummary(slide, pageNumber)
      case 'master_closing':
        return renderClosing(deck, slide, pageNumber)
      case 'master_split':
      default:
        return renderSplit(slide, pageNumber)
    }
  },
}

registerDeckTemplate(masterTemplateAI)

export { masterTemplateAI }
