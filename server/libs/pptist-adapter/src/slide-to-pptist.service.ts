import type { AISlide } from '../../ai-schema/src/ai-slide'

const RECT_PATH = 'M 0 0 L 200 0 L 200 200 L 0 200 Z'
const CHIP_PATH = 'M 6 0 L 194 0 Q 200 0 200 6 L 200 34 Q 200 40 194 40 L 6 40 Q 0 40 0 34 L 0 6 Q 0 0 6 0 Z'
const CIRCLE_PATH = 'M 100 0 C 155 0 200 45 200 100 C 200 155 155 200 100 200 C 45 200 0 155 0 100 C 0 45 45 0 100 0 Z'

const COLORS = {
  sky: '#8ecae6',
  blue: '#219ebc',
  navy: '#023047',
  yellow: '#ffb703',
  orange: '#fb8500',
  white: '#ffffff',
  slate: '#415a77',
  light: '#edf6fb',
  pale: '#f7fbfd',
  warning: '#fff1e8',
}

const PLACEHOLDER_IMAGE = 'https://placehold.co/960x540/023047/ffffff?text=AI+Placeholder+Photo'
const FONT_CN = 'Microsoft YaHei'

type LayoutTemplate =
  | 'cover_photo'
  | 'section_photo'
  | 'rules_grid_3x2'
  | 'split_image_list'
  | 'process_infographic'
  | 'timeline_story'
  | 'compare_two_column'
  | 'stat_cards'
  | 'role_cards'
  | 'equipment_board'
  | 'warning_penalty'
  | 'summary_checklist'

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

const paragraph = (text: string, fontSize: number, color: string, weight = false, align: 'left' | 'center' = 'left') =>
  `<p style="text-align: ${align};">${weight ? '<strong>' : ''}<span style="font-size: ${fontSize}px;"><span style="font-family: ${FONT_CN};"><span style="color: ${color};">${escapeHtml(text)}</span></span></span>${weight ? '</strong>' : ''}</p>`

const getLayoutTemplate = (slide: AISlide): LayoutTemplate => {
  const template = (slide.metadata?.layoutTemplate as string | undefined) ?? ''
  if (template) return template as LayoutTemplate
  if (slide.kind === 'cover') return 'cover_photo'
  if (slide.kind === 'summary') return 'summary_checklist'
  return 'split_image_list'
}

const getPageNumber = (slide: AISlide) => {
  const pageNumber = slide.metadata?.pageNumber
  return typeof pageNumber === 'number' ? pageNumber : 1
}

const getBullets = (slide: AISlide, fallback: string[]) => {
  const bullets = [
    ...(slide.keyHighlights ?? []),
    ...(slide.bullets ?? []),
    ...((slide.bodySections ?? []).map(section => `${section.heading}：${section.text}`)),
  ].map(item => item.trim()).filter(Boolean)
  return bullets.length ? bullets : fallback
}

const getSupportText = (slide: AISlide, fallback: string) => {
  const candidates = [
    slide.subtitle,
    slide.summary,
    ...(slide.bullets ?? []).slice(0, 2),
    ...((slide.bodySections ?? []).slice(0, 2).map(section => `${section.heading} ${section.text}`)),
  ].filter((item): item is string => typeof item === 'string' && item.trim().length > 0)

  const joined = candidates.join(' ').trim()
  return clampText(joined || fallback, 60)
}

const getSubtitle = (slide: AISlide, fallback = '') =>
  clampText((slide.subtitle || slide.summary || fallback).trim(), 46)

const getTitleFontSize = (title: string, large = 28) => {
  if (title.length > 28) return large - 6
  if (title.length > 18) return large - 2
  return large
}

const baseSlide = (slide: AISlide, background = COLORS.white) => ({
  id: slide.id,
  background: { type: 'solid', color: background },
})

const pageBadge = (slide: AISlide, fill = COLORS.blue) => {
  const pageNumber = getPageNumber(slide)
  return [
    {
      id: `${slide.id}_page_badge`,
      type: 'shape',
      left: 892,
      top: 474,
      width: 42,
      height: 42,
      rotate: 0,
      viewBox: [200, 200],
      path: CIRCLE_PATH,
      fill,
      text: {
        content: paragraph(String(pageNumber), 16, COLORS.white, true, 'center'),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.white,
        align: 'middle',
      },
    },
  ]
}

const titleBlock = (slide: AISlide) => ([
  {
    id: `${slide.id}_title`,
    type: 'text',
    left: 72,
    top: 42,
    width: 650,
    height: 52,
    rotate: 0,
    content: paragraph(clampText(slide.title ?? '', 34), getTitleFontSize(slide.title ?? '', 28), COLORS.navy, true),
    defaultFontName: FONT_CN,
    defaultColor: COLORS.navy,
    textType: 'title',
  },
  {
    id: `${slide.id}_title_line`,
    type: 'shape',
    left: 72,
    top: 100,
    width: 180,
    height: 6,
    rotate: 0,
    viewBox: [200, 200],
    path: RECT_PATH,
    fill: COLORS.blue,
  },
  {
    id: `${slide.id}_subtitle`,
    type: 'text',
    left: 72,
    top: 118,
    width: 740,
    height: 26,
    rotate: 0,
    content: paragraph(getSubtitle(slide), 14, COLORS.blue, true),
    defaultFontName: FONT_CN,
    defaultColor: COLORS.blue,
    textType: 'content',
  },
  {
    id: `${slide.id}_summary`,
    type: 'text',
    left: 72,
    top: 144,
    width: 740,
    height: 34,
    rotate: 0,
    content: paragraph(clampText(slide.summary || getSupportText(slide, ''), 92), 15, COLORS.slate),
    defaultFontName: FONT_CN,
    defaultColor: COLORS.slate,
    textType: 'content',
  },
])

const renderCoverPhoto = (slide: AISlide) => {
  const bullets = getBullets(slide, ['看懂比赛目标', '看懂规则节奏', '看懂人物分工']).map(item => clampText(item, 18))
  return {
    ...baseSlide(slide, COLORS.navy),
    type: 'cover',
    elements: [
      {
        id: `${slide.id}_photo`,
        type: 'image',
        src: PLACEHOLDER_IMAGE,
        left: 430,
        top: 0,
        width: 530,
        height: 540,
        rotate: 0,
        fixedRatio: false,
      },
      {
        id: `${slide.id}_overlay`,
        type: 'shape',
        left: 390,
        top: 0,
        width: 570,
        height: 540,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: COLORS.navy,
        opacity: 0.45,
      },
      {
        id: `${slide.id}_panel`,
        type: 'shape',
        left: 0,
        top: 0,
        width: 470,
        height: 540,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: COLORS.navy,
      },
      {
        id: `${slide.id}_kicker`,
        type: 'text',
        left: 72,
        top: 64,
        width: 220,
        height: 26,
        rotate: 0,
        content: paragraph('AI PRESENTATION', 14, COLORS.sky, true),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.sky,
        textType: 'header',
      },
      {
        id: `${slide.id}_title`,
        type: 'text',
        left: 72,
        top: 118,
        width: 300,
        height: 132,
        rotate: 0,
        content: paragraph(clampText(slide.title ?? '', 24), getTitleFontSize(slide.title ?? '', 34), COLORS.white, true),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.white,
        textType: 'title',
      },
      {
        id: `${slide.id}_subtitle`,
        type: 'text',
        left: 72,
        top: 250,
        width: 308,
        height: 26,
        rotate: 0,
        content: paragraph(getSubtitle(slide), 14, COLORS.sky, true),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.sky,
        textType: 'content',
      },
      {
        id: `${slide.id}_summary`,
        type: 'text',
        left: 72,
        top: 284,
        width: 308,
        height: 70,
        rotate: 0,
        content: paragraph(clampText(slide.summary || getSupportText(slide, '这份演示将帮助完全没看过比赛的人快速建立认知框架。'), 72), 16, '#d7e4ec'),
        defaultFontName: FONT_CN,
        defaultColor: '#d7e4ec',
        textType: 'content',
      },
      ...bullets.slice(0, 3).map((bullet, index) => ({
        id: `${slide.id}_chip_${index + 1}`,
        type: 'shape',
        left: 72,
        top: 370 + index * 48,
        width: 262,
        height: 36,
        rotate: 0,
        viewBox: [200, 40],
        path: CHIP_PATH,
        fill: index === 0 ? COLORS.blue : index === 1 ? COLORS.yellow : COLORS.orange,
        text: {
          content: paragraph(bullet, 13, index === 1 ? COLORS.navy : COLORS.white, false, 'center'),
          defaultFontName: FONT_CN,
          defaultColor: index === 1 ? COLORS.navy : COLORS.white,
          align: 'middle',
        },
      })),
      ...pageBadge(slide, COLORS.orange),
    ],
  }
}

const renderSectionPhoto = (slide: AISlide) => ({
  ...baseSlide(slide, COLORS.navy),
  type: 'content',
  elements: [
    {
      id: `${slide.id}_photo`,
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
      id: `${slide.id}_overlay`,
      type: 'shape',
      left: 0,
      top: 0,
      width: 960,
      height: 540,
      rotate: 0,
      viewBox: [200, 200],
      path: RECT_PATH,
      fill: COLORS.navy,
      opacity: 0.58,
    },
    {
      id: `${slide.id}_section_no`,
      type: 'text',
      left: 74,
      top: 88,
      width: 120,
      height: 40,
      rotate: 0,
      content: paragraph(`0${getPageNumber(slide)}`, 26, COLORS.yellow, true),
      defaultFontName: FONT_CN,
      defaultColor: COLORS.yellow,
      textType: 'partNumber',
    },
    {
      id: `${slide.id}_title`,
      type: 'text',
      left: 72,
      top: 176,
      width: 620,
      height: 92,
      rotate: 0,
      content: paragraph(clampText(slide.title ?? '', 26), getTitleFontSize(slide.title ?? '', 36), COLORS.white, true),
      defaultFontName: FONT_CN,
      defaultColor: COLORS.white,
      textType: 'title',
    },
      {
        id: `${slide.id}_subtitle`,
        type: 'text',
        left: 72,
        top: 286,
        width: 540,
        height: 24,
        rotate: 0,
        content: paragraph(getSubtitle(slide), 14, COLORS.yellow, true),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.yellow,
        textType: 'content',
      },
      {
        id: `${slide.id}_summary`,
        type: 'text',
        left: 72,
        top: 314,
        width: 540,
        height: 42,
        rotate: 0,
        content: paragraph(clampText(slide.summary || getSupportText(slide, ''), 78), 17, '#d7e4ec'),
        defaultFontName: FONT_CN,
        defaultColor: '#d7e4ec',
        textType: 'content',
    },
    {
      id: `${slide.id}_slash`,
      type: 'shape',
      left: 720,
      top: 0,
      width: 240,
      height: 540,
      rotate: 12,
      viewBox: [200, 200],
      path: RECT_PATH,
      fill: COLORS.orange,
      opacity: 0.18,
    },
    ...pageBadge(slide, COLORS.blue),
  ],
})

const renderRulesGrid = (slide: AISlide) => {
  const bullets = getBullets(slide, ['规则 1', '规则 2', '规则 3', '规则 4', '规则 5', '规则 6']).slice(0, 6).map(item => clampText(item, 30))
  return {
    ...baseSlide(slide, COLORS.pale),
    type: 'content',
    elements: [
      ...titleBlock(slide),
      ...bullets.flatMap((bullet, index) => {
        const col = index % 3
        const row = Math.floor(index / 3)
        const left = 72 + col * 274
        const top = 180 + row * 132
        const fill = row === 0 ? COLORS.blue : COLORS.orange
        const textColor = COLORS.white
        return [
          {
            id: `${slide.id}_rule_card_${index + 1}`,
            type: 'shape',
            left,
            top,
            width: 242,
            height: 112,
            rotate: 0,
            viewBox: [200, 200],
            path: RECT_PATH,
            fill,
            opacity: 0.94,
          },
          {
            id: `${slide.id}_rule_no_${index + 1}`,
            type: 'shape',
            left: left + 18,
            top: top + 16,
            width: 32,
            height: 32,
            rotate: 0,
            viewBox: [200, 200],
            path: CIRCLE_PATH,
            fill: row === 0 ? COLORS.navy : COLORS.white,
            text: {
              content: paragraph(String(index + 1), 13, row === 0 ? COLORS.white : COLORS.navy, true, 'center'),
              defaultFontName: FONT_CN,
              defaultColor: row === 0 ? COLORS.white : COLORS.navy,
              align: 'middle',
            },
          },
          {
            id: `${slide.id}_rule_title_${index + 1}`,
            type: 'text',
            left: left + 60,
            top: top + 14,
            width: 154,
            height: 24,
            rotate: 0,
            content: paragraph(`规则 ${index + 1}`, 16, textColor, true),
            defaultFontName: FONT_CN,
            defaultColor: textColor,
            textType: 'itemTitle',
          },
          {
            id: `${slide.id}_rule_body_${index + 1}`,
            type: 'text',
            left: left + 18,
            top: top + 52,
            width: 206,
            height: 44,
            rotate: 0,
            content: paragraph(bullet, 12, textColor),
            defaultFontName: FONT_CN,
            defaultColor: textColor,
            textType: 'item',
          },
        ]
      }),
      {
        id: `${slide.id}_footer_box`,
        type: 'shape',
        left: 72,
        top: 458,
        width: 760,
        height: 48,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: COLORS.sky,
        opacity: 0.24,
      },
      {
        id: `${slide.id}_footer_text`,
        type: 'text',
        left: 92,
        top: 470,
        width: 724,
        height: 24,
        rotate: 0,
        content: paragraph(clampText(slide.summary || '底部说明区总结比赛规则要点，帮助新手快速复盘。', 72), 14, COLORS.navy),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.navy,
        textType: 'footer',
      },
      ...pageBadge(slide, COLORS.blue),
    ],
  }
}

const renderSplitImageList = (slide: AISlide) => {
  const bullets = getBullets(slide, ['要点一', '要点二', '要点三']).slice(0, 4).map(item => clampText(item, 32))
  return {
    ...baseSlide(slide, COLORS.white),
    type: 'content',
    elements: [
      ...titleBlock(slide),
      {
        id: `${slide.id}_divider`,
        type: 'shape',
        left: 480,
        top: 166,
        width: 6,
        height: 290,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: COLORS.orange,
      },
      ...bullets.flatMap((bullet, index) => [
        {
          id: `${slide.id}_bullet_bg_${index + 1}`,
          type: 'shape',
          left: 72,
          top: 186 + index * 72,
          width: 360,
          height: 54,
          rotate: 0,
          viewBox: [200, 200],
          path: RECT_PATH,
          fill: COLORS.blue,
          opacity: 0.1 + index * 0.12,
        },
        {
          id: `${slide.id}_bullet_text_${index + 1}`,
          type: 'text',
          left: 92,
          top: 200 + index * 72,
          width: 324,
          height: 26,
          rotate: 0,
          content: paragraph(bullet, 14, COLORS.navy, index === 0),
          defaultFontName: FONT_CN,
          defaultColor: COLORS.navy,
          textType: 'item',
        },
      ]),
      {
        id: `${slide.id}_image`,
        type: 'image',
        src: PLACEHOLDER_IMAGE,
        left: 532,
        top: 184,
        width: 336,
        height: 240,
        rotate: 0,
        fixedRatio: false,
      },
      {
        id: `${slide.id}_image_overlay`,
        type: 'shape',
        left: 532,
        top: 184,
        width: 336,
        height: 240,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: COLORS.navy,
        opacity: 0.18,
      },
      ...pageBadge(slide, COLORS.blue),
    ],
  }
}

const renderProcessInfographic = (slide: AISlide) => {
  const bullets = getBullets(slide, ['先看开局', '再看推进', '最后看得分']).slice(0, 4).map(item => clampText(item, 16))
  return {
    ...baseSlide(slide, COLORS.light),
    type: 'content',
    elements: [
      {
        id: `${slide.id}_title_band`,
        type: 'shape',
        left: 56,
        top: 34,
        width: 848,
        height: 114,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: COLORS.white,
      },
      {
        id: `${slide.id}_title`,
        type: 'text',
        left: 78,
        top: 50,
        width: 560,
        height: 44,
        rotate: 0,
        content: paragraph(clampText(slide.title ?? '', 30), getTitleFontSize(slide.title ?? '', 30), COLORS.navy, true),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.navy,
        textType: 'title',
      },
      {
        id: `${slide.id}_title_line`,
        type: 'shape',
        left: 78,
        top: 102,
        width: 164,
        height: 6,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: COLORS.orange,
      },
      {
        id: `${slide.id}_summary`,
        type: 'text',
        left: 268,
        top: 82,
        width: 420,
        height: 28,
        rotate: 0,
        content: paragraph(clampText(slide.summary || '', 56), 14, COLORS.slate),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.slate,
        textType: 'content',
      },
      {
        id: `${slide.id}_info_tag`,
        type: 'shape',
        left: 724,
        top: 58,
        width: 138,
        height: 28,
        rotate: 0,
        viewBox: [200, 40],
        path: CHIP_PATH,
        fill: COLORS.blue,
        text: {
          content: paragraph('PROCESS MAP', 12, COLORS.white, true, 'center'),
          defaultFontName: FONT_CN,
          defaultColor: COLORS.white,
          align: 'middle',
        },
      },
      ...bullets.flatMap((bullet, index) => {
        const left = 72 + index * 205
        return [
          {
            id: `${slide.id}_step_circle_${index + 1}`,
            type: 'shape',
            left,
            top: 236,
            width: 58,
            height: 58,
            rotate: 0,
            viewBox: [200, 200],
            path: CIRCLE_PATH,
            fill: index % 2 === 0 ? COLORS.blue : COLORS.orange,
            text: {
              content: paragraph(String(index + 1), 18, COLORS.white, true, 'center'),
              defaultFontName: FONT_CN,
              defaultColor: COLORS.white,
              align: 'middle',
            },
          },
          {
            id: `${slide.id}_step_text_${index + 1}`,
            type: 'text',
            left: left + 12,
            top: 314,
            width: 128,
            height: 52,
            rotate: 0,
            content: paragraph(bullet, 13, COLORS.navy, true, 'center'),
            defaultFontName: FONT_CN,
            defaultColor: COLORS.navy,
            textType: 'item',
          },
          index < bullets.length - 1
            ? {
                id: `${slide.id}_arrow_${index + 1}`,
                type: 'shape',
                left: left + 70,
                top: 260,
                width: 120,
                height: 8,
                rotate: 0,
                viewBox: [200, 200],
                path: RECT_PATH,
                fill: COLORS.orange,
              }
            : null,
        ].filter(Boolean)
      }),
      {
        id: `${slide.id}_info_box`,
        type: 'shape',
        left: 692,
        top: 180,
        width: 196,
        height: 214,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: COLORS.white,
      },
      {
        id: `${slide.id}_info_text`,
        type: 'text',
        left: 712,
        top: 206,
        width: 152,
        height: 150,
        rotate: 0,
        content: paragraph(getSupportText(slide, '右侧信息区提炼本页重点，帮助观众快速跟上比赛节奏。'), 14, COLORS.slate),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.slate,
        textType: 'content',
      },
      ...pageBadge(slide, COLORS.blue),
    ],
  }
}

const renderTimelineStory = (slide: AISlide) => {
  const bullets = getBullets(slide, ['起源', '规则', '职业化', '全球化']).slice(0, 4).map(item => clampText(item, 20))
  return {
    ...baseSlide(slide, COLORS.pale),
    type: 'content',
    elements: [
      ...titleBlock(slide),
      {
        id: `${slide.id}_timeline_line`,
        type: 'shape',
        left: 474,
        top: 176,
        width: 8,
        height: 270,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: COLORS.blue,
      },
      ...bullets.flatMap((bullet, index) => {
        const isLeft = index % 2 === 0
        const top = 188 + index * 62
        const cardLeft = isLeft ? 82 : 518
        const circleLeft = 449
        return [
          {
            id: `${slide.id}_milestone_${index + 1}`,
            type: 'shape',
            left: cardLeft,
            top,
            width: 320,
            height: 54,
            rotate: 0,
            viewBox: [200, 200],
            path: RECT_PATH,
            fill: isLeft ? '#dff1f7' : '#fff0e3',
          },
          {
            id: `${slide.id}_timeline_text_${index + 1}`,
            type: 'text',
            left: cardLeft + 18,
            top: top + 14,
            width: 282,
            height: 24,
            rotate: 0,
            content: paragraph(bullet, 15, COLORS.navy, true),
            defaultFontName: FONT_CN,
            defaultColor: COLORS.navy,
            textType: 'item',
          },
          {
            id: `${slide.id}_timeline_dot_${index + 1}`,
            type: 'shape',
            left: circleLeft,
            top: top + 10,
            width: 38,
            height: 38,
            rotate: 0,
            viewBox: [200, 200],
            path: CIRCLE_PATH,
            fill: isLeft ? COLORS.blue : COLORS.orange,
            text: {
              content: paragraph(String(index + 1), 14, COLORS.white, true, 'center'),
              defaultFontName: FONT_CN,
              defaultColor: COLORS.white,
              align: 'middle',
            },
          },
        ]
      }),
      ...pageBadge(slide, COLORS.orange),
    ],
  }
}

const renderCompareTwoColumn = (slide: AISlide) => {
  const bullets = getBullets(slide, ['左侧观点', '右侧观点']).slice(0, 2).map(item => clampText(item, 42))
  return {
    ...baseSlide(slide, COLORS.white),
    type: 'content',
    elements: [
      ...titleBlock(slide),
      {
        id: `${slide.id}_col_left`,
        type: 'shape',
        left: 72,
        top: 188,
        width: 356,
        height: 252,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: '#e7f6fb',
      },
      {
        id: `${slide.id}_col_right`,
        type: 'shape',
        left: 532,
        top: 188,
        width: 356,
        height: 252,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: '#fff1e5',
      },
      {
        id: `${slide.id}_divider`,
        type: 'shape',
        left: 472,
        top: 188,
        width: 16,
        height: 252,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: COLORS.navy,
      },
      {
        id: `${slide.id}_left_title`,
        type: 'text',
        left: 96,
        top: 212,
        width: 120,
        height: 24,
        rotate: 0,
        content: paragraph('对照 A', 16, COLORS.navy, true),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.navy,
        textType: 'itemTitle',
      },
      {
        id: `${slide.id}_right_title`,
        type: 'text',
        left: 556,
        top: 212,
        width: 120,
        height: 24,
        rotate: 0,
        content: paragraph('对照 B', 16, COLORS.navy, true),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.navy,
        textType: 'itemTitle',
      },
      {
        id: `${slide.id}_left_body`,
        type: 'text',
        left: 96,
        top: 258,
        width: 308,
        height: 112,
        rotate: 0,
        content: paragraph(bullets[0] || '左侧内容', 15, COLORS.navy),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.navy,
        textType: 'item',
      },
      {
        id: `${slide.id}_right_body`,
        type: 'text',
        left: 556,
        top: 258,
        width: 308,
        height: 112,
        rotate: 0,
        content: paragraph(bullets[1] || '右侧内容', 15, COLORS.navy),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.navy,
        textType: 'item',
      },
      ...pageBadge(slide, COLORS.blue),
    ],
  }
}

const renderStatCards = (slide: AISlide) => {
  const bullets = getBullets(slide, ['指标一', '指标二', '指标三']).slice(0, 3).map(item => clampText(item, 22))
  return {
    ...baseSlide(slide, COLORS.light),
    type: 'content',
    elements: [
      ...titleBlock(slide),
      ...bullets.flatMap((bullet, index) => {
        const left = 86 + index * 264
        const accent = [COLORS.blue, COLORS.orange, COLORS.navy][index] || COLORS.blue
        return [
          {
            id: `${slide.id}_stat_card_${index + 1}`,
            type: 'shape',
            left,
            top: 214,
            width: 220,
            height: 180,
            rotate: 0,
            viewBox: [200, 200],
            path: RECT_PATH,
            fill: COLORS.white,
          },
          {
            id: `${slide.id}_stat_bar_${index + 1}`,
            type: 'shape',
            left,
            top: 214,
            width: 220,
            height: 10,
            rotate: 0,
            viewBox: [200, 200],
            path: RECT_PATH,
            fill: accent,
          },
          {
            id: `${slide.id}_stat_no_${index + 1}`,
            type: 'text',
            left: left + 18,
            top: 246,
            width: 90,
            height: 42,
            rotate: 0,
            content: paragraph(String(index + 1).padStart(2, '0'), 28, accent, true),
            defaultFontName: FONT_CN,
            defaultColor: accent,
            textType: 'itemNumber',
          },
          {
            id: `${slide.id}_stat_text_${index + 1}`,
            type: 'text',
            left: left + 18,
            top: 314,
            width: 182,
            height: 54,
            rotate: 0,
            content: paragraph(bullet, 14, COLORS.navy, true),
            defaultFontName: FONT_CN,
            defaultColor: COLORS.navy,
            textType: 'item',
          },
        ]
      }),
      ...pageBadge(slide, COLORS.orange),
    ],
  }
}

const renderRoleCards = (slide: AISlide) => {
  const bullets = getBullets(slide, ['角色一', '角色二', '角色三']).slice(0, 3).map(item => clampText(item, 22))
  return {
    ...baseSlide(slide, COLORS.white),
    type: 'content',
    elements: [
      ...titleBlock(slide),
      ...bullets.flatMap((bullet, index) => {
        const left = 80 + index * 266
        return [
          {
            id: `${slide.id}_role_card_${index + 1}`,
            type: 'shape',
            left,
            top: 206,
            width: 226,
            height: 214,
            rotate: 0,
            viewBox: [200, 200],
            path: RECT_PATH,
            fill: index === 1 ? '#fff4e8' : '#e8f2f7',
          },
          {
            id: `${slide.id}_role_icon_${index + 1}`,
            type: 'shape',
            left: left + 82,
            top: 226,
            width: 60,
            height: 60,
            rotate: 0,
            viewBox: [200, 200],
            path: CIRCLE_PATH,
            fill: index === 1 ? COLORS.orange : COLORS.blue,
            text: {
              content: paragraph(String(index + 1), 18, COLORS.white, true, 'center'),
              defaultFontName: FONT_CN,
              defaultColor: COLORS.white,
              align: 'middle',
            },
          },
          {
            id: `${slide.id}_role_text_${index + 1}`,
            type: 'text',
            left: left + 24,
            top: 314,
            width: 178,
            height: 52,
            rotate: 0,
            content: paragraph(bullet, 15, COLORS.navy, true, 'center'),
            defaultFontName: FONT_CN,
            defaultColor: COLORS.navy,
            textType: 'item',
          },
        ]
      }),
      ...pageBadge(slide, COLORS.blue),
    ],
  }
}

const renderEquipmentBoard = (slide: AISlide) => {
  const bullets = getBullets(slide, ['头盔', '护具', '球杆']).slice(0, 4).map(item => clampText(item, 24))
  return {
    ...baseSlide(slide, '#fefefe'),
    type: 'content',
    elements: [
      ...titleBlock(slide),
      {
        id: `${slide.id}_equipment_panel`,
        type: 'shape',
        left: 72,
        top: 192,
        width: 330,
        height: 246,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: '#eef7fb',
      },
      ...bullets.flatMap((bullet, index) => [
        {
          id: `${slide.id}_equipment_tag_${index + 1}`,
          type: 'shape',
          left: 94,
          top: 214 + index * 52,
          width: 284,
          height: 34,
          rotate: 0,
          viewBox: [200, 40],
          path: CHIP_PATH,
          fill: index % 2 === 0 ? COLORS.blue : COLORS.orange,
          text: {
            content: paragraph(bullet, 13, COLORS.white, true, 'center'),
            defaultFontName: FONT_CN,
            defaultColor: COLORS.white,
            align: 'middle',
          },
        },
      ]),
      {
        id: `${slide.id}_equipment_image`,
        type: 'image',
        src: PLACEHOLDER_IMAGE,
        left: 460,
        top: 192,
        width: 396,
        height: 246,
        rotate: 0,
        fixedRatio: false,
      },
      ...pageBadge(slide, COLORS.orange),
    ],
  }
}

const renderWarningPenalty = (slide: AISlide) => {
  const bullets = getBullets(slide, ['犯规类型', '处罚结果', '观看提示']).slice(0, 4).map(item => clampText(item, 26))
  return {
    ...baseSlide(slide, '#fffaf7'),
    type: 'content',
    elements: [
      ...titleBlock(slide),
      {
        id: `${slide.id}_warning_bar`,
        type: 'shape',
        left: 72,
        top: 176,
        width: 816,
        height: 16,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: COLORS.orange,
      },
      ...bullets.flatMap((bullet, index) => [
        {
          id: `${slide.id}_warn_card_${index + 1}`,
          type: 'shape',
          left: 72 + (index % 2) * 410,
          top: 226 + Math.floor(index / 2) * 118,
          width: 378,
          height: 88,
          rotate: 0,
          viewBox: [200, 200],
          path: RECT_PATH,
          fill: index % 2 === 0 ? COLORS.warning : '#fff7df',
        },
        {
          id: `${slide.id}_warn_tag_${index + 1}`,
          type: 'shape',
          left: 92 + (index % 2) * 410,
          top: 246 + Math.floor(index / 2) * 118,
          width: 72,
          height: 24,
          rotate: 0,
          viewBox: [200, 40],
          path: CHIP_PATH,
          fill: COLORS.orange,
        },
        {
          id: `${slide.id}_warn_text_${index + 1}`,
          type: 'text',
          left: 180 + (index % 2) * 410,
          top: 242 + Math.floor(index / 2) * 118,
          width: 240,
          height: 42,
          rotate: 0,
          content: paragraph(bullet, 13, COLORS.navy, true),
          defaultFontName: FONT_CN,
          defaultColor: COLORS.navy,
          textType: 'item',
        },
      ]),
      ...pageBadge(slide, COLORS.orange),
    ],
  }
}

const renderSummaryChecklist = (slide: AISlide) => {
  const bullets = getBullets(slide, ['先看目标', '再看角色', '再看规则', '最后看节奏']).slice(0, 5).map(item => clampText(item, 28))
  return {
    ...baseSlide(slide, COLORS.white),
    type: 'contents',
    elements: [
      ...titleBlock(slide),
      ...bullets.flatMap((bullet, index) => [
        {
          id: `${slide.id}_check_circle_${index + 1}`,
          type: 'shape',
          left: 92,
          top: 186 + index * 58,
          width: 28,
          height: 28,
          rotate: 0,
          viewBox: [200, 200],
          path: CIRCLE_PATH,
          fill: index % 2 === 0 ? COLORS.blue : COLORS.orange,
        },
        {
          id: `${slide.id}_check_text_${index + 1}`,
          type: 'text',
          left: 140,
          top: 184 + index * 58,
          width: 560,
          height: 30,
          rotate: 0,
        content: paragraph(bullet, 15, COLORS.navy, true),
          defaultFontName: FONT_CN,
          defaultColor: COLORS.navy,
          textType: 'item',
        },
      ]),
      {
        id: `${slide.id}_closing_box`,
        type: 'shape',
        left: 666,
        top: 188,
        width: 222,
        height: 188,
        rotate: 0,
        viewBox: [200, 200],
        path: RECT_PATH,
        fill: COLORS.sky,
        opacity: 0.28,
      },
      {
        id: `${slide.id}_closing_text`,
        type: 'text',
        left: 690,
        top: 218,
        width: 176,
        height: 120,
        rotate: 0,
        content: paragraph(getSupportText(slide, '这一页把关键要点压缩成清单，便于快速复习和回看。'), 14, COLORS.navy),
        defaultFontName: FONT_CN,
        defaultColor: COLORS.navy,
        textType: 'content',
      },
      ...pageBadge(slide, COLORS.blue),
    ],
  }
}

export class SlideToPPTistService {
  convert(slide: AISlide) {
    switch (getLayoutTemplate(slide)) {
      case 'cover_photo':
        return renderCoverPhoto(slide)
      case 'section_photo':
        return renderSectionPhoto(slide)
      case 'rules_grid_3x2':
        return renderRulesGrid(slide)
      case 'split_image_list':
        return renderSplitImageList(slide)
      case 'process_infographic':
        return renderProcessInfographic(slide)
      case 'timeline_story':
        return renderTimelineStory(slide)
      case 'compare_two_column':
        return renderCompareTwoColumn(slide)
      case 'stat_cards':
        return renderStatCards(slide)
      case 'role_cards':
        return renderRoleCards(slide)
      case 'equipment_board':
        return renderEquipmentBoard(slide)
      case 'warning_penalty':
        return renderWarningPenalty(slide)
      case 'summary_checklist':
      default:
        return renderSummaryChecklist(slide)
    }
  }
}
