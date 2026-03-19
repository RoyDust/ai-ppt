import { describe, expect, it } from 'vitest'

import { SlideToPPTistService } from '../../libs/pptist-adapter/src/slide-to-pptist.service'

describe('SlideToPPTistService', () => {
  it('creates a composed cover slide instead of an empty placeholder shell', () => {
    const service = new SlideToPPTistService()

    const rendered = service.convert({
      id: 'slide_1',
      kind: 'cover',
      title: '冰球入门：第一次看比赛要知道什么',
      summary: '先看比赛目标，再看规则，再看节奏与换人。',
      bullets: ['目标：把球打进对方球门', '观赛重点：速度、对抗、空间', '先不追细节，先看整体节奏'],
      regeneratable: true,
      metadata: {
        layoutTemplate: 'master_cover',
        pageNumber: 1,
      },
    })

    expect(rendered.elements.length).toBeGreaterThan(3)
    expect(rendered.elements.some((element: any) => element.type === 'shape')).toBe(true)
    expect(rendered.elements.some((element: any) => element.type === 'text' && String(element.content).includes('冰球入门'))).toBe(true)
    expect(rendered.elements.some((element: any) => element.id === 'slide_1_overlay' && element.fill === '#161b27')).toBe(false)
    expect(rendered.elements.some((element: any) => element.id === 'slide_1_cover_panel')).toBe(true)
    const footerLabel = rendered.elements.find((element: any) => element.id === 'slide_1_footer_label')
    expect(footerLabel?.top).toBeLessThan(510)
  })

  it('renders toc/grid pages with numbered info blocks and footer band', () => {
    const service = new SlideToPPTistService()

    const rendered = service.convert({
      id: 'slide_rules',
      kind: 'content',
      title: '冰球 6 条基础规则',
      summary: '先看规则触发条件，再看对应后果。',
      bullets: [
        '越位：进攻球员先于球进入进攻区会被吹停。',
        '死球后争球重启比赛。',
        '允许合理身体对抗，但不能危险冲撞。',
        '犯规会导致小罚或大罚。',
        '换人可在比赛进行中完成。',
        '守门员有专属保护规则。',
      ],
      regeneratable: true,
      metadata: {
        layoutTemplate: 'master_toc',
        pageNumber: 5,
      },
    })

    const tocRows = rendered.elements.filter((element: any) => String(element.id).includes('_toc_no_'))
    expect(tocRows.length).toBeGreaterThanOrEqual(4)
    expect(rendered.elements.some((element: any) => String(element.id).includes('footer_band_purple'))).toBe(true)
    expect(rendered.elements.some((element: any) => String(element.id).includes('page_number'))).toBe(true)
  })

  it('renders split pages with placeholder image, divider, and footer band', () => {
    const service = new SlideToPPTistService()

    const rendered = service.convert({
      id: 'slide_equipment',
      kind: 'content',
      title: '冰球装备怎么分',
      summary: '左侧快速认装备，右侧用占位图承接大片感。',
      bullets: [
        '头盔：保护头部与面部。',
        '护肩：抵御冲撞并分散力量。',
        '手套：保证抓杆与护手。',
      ],
      regeneratable: true,
      metadata: {
        layoutTemplate: 'master_split',
        pageNumber: 8,
      },
    })

    expect(rendered.elements.some((element: any) => element.type === 'image')).toBe(true)
    expect(rendered.elements.some((element: any) => element.type === 'shape' && element.width <= 8 && element.fill === '#fd6525')).toBe(true)
    expect(rendered.elements.some((element: any) => String(element.id).includes('page_number'))).toBe(true)
  })

  it('renders timeline pages with milestone dots in circles', () => {
    const service = new SlideToPPTistService()

    const rendered = service.convert({
      id: 'slide_timeline',
      kind: 'content',
      title: '比赛历史时间线',
      summary: '按时间顺序看发展主线。',
      bullets: ['起源', '规则定型', '职业化', '全球化'],
      regeneratable: true,
      metadata: {
        layoutTemplate: 'master_timeline',
        pageNumber: 4,
      },
    })

    const stepCircle = rendered.elements.find((element: any) => element.id === 'slide_timeline_milestone_dot_1') as any

    expect(stepCircle?.text?.content).toContain('1')
    expect(rendered.elements.some((element: any) => element.id === 'slide_timeline_timeline_line')).toBe(true)
  })

  it('renders comparison pages with two contrasted columns', () => {
    const service = new SlideToPPTistService()

    const rendered = service.convert({
      id: 'slide_compare',
      kind: 'content',
      title: '足球与冰球观看差异',
      summary: '对比节奏、空间和身体对抗感受。',
      bullets: ['足球更重阵型与空间控制', '冰球节奏更快且换人频繁'],
      bodySections: [
        { heading: '个人突破 -> 团队体系', text: '足球的推进依赖个人处理球与整体阵型配合，观赛时要看持球点如何牵动整体站位。' },
        { heading: '阵型更讲秩序', text: '足球的节奏更分层，防线、 midfield 和前场之间的距离变化，会直接决定空间是否被打开。' },
      ],
      regeneratable: true,
      metadata: {
        layoutTemplate: 'master_compare',
        pageNumber: 7,
      },
    })

    expect(rendered.elements.some((element: any) => element.id === 'slide_compare_compare_left')).toBe(true)
    expect(rendered.elements.some((element: any) => element.id === 'slide_compare_compare_right')).toBe(true)
    expect(rendered.elements.some((element: any) => element.id === 'slide_compare_compare_left_title' && String(element.content).includes('个人突破'))).toBe(true)
    expect(rendered.elements.some((element: any) => element.id === 'slide_compare_compare_right_body' && String(element.content).includes('距离变化'))).toBe(true)
  })

  it('renders table pages with structured header and rows', () => {
    const service = new SlideToPPTistService()

    const rendered = service.convert({
      id: 'slide_table',
      kind: 'content',
      title: '项目周期',
      summary: '按阶段拆解项目时间。',
      bodySections: [
        { heading: '前期沟通', text: '1 天，确认范围' },
        { heading: '方案确认', text: '2 天，修订细节' },
      ],
      regeneratable: true,
      metadata: {
        layoutTemplate: 'master_table',
        pageNumber: 9,
      },
    })

    expect(rendered.elements.some((element: any) => element.id === 'slide_table_table_header_left')).toBe(true)
    expect(rendered.elements.some((element: any) => element.id === 'slide_table_table_heading_1')).toBe(true)
  })
})
