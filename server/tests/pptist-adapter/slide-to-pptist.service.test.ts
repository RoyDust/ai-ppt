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
    })

    expect(rendered.elements.length).toBeGreaterThan(3)
    expect(rendered.elements.some((element: any) => element.type === 'shape')).toBe(true)
    expect(rendered.elements.some((element: any) => element.type === 'text' && String(element.content).includes('冰球入门'))).toBe(true)
  })

  it('renders rules into a 3x2 infographic grid with numbered cards and page badge', () => {
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
        layoutTemplate: 'rules_grid_3x2',
        pageNumber: 5,
      },
    })

    const ruleCards = rendered.elements.filter((element: any) => String(element.id).includes('_rule_card_'))
    expect(ruleCards).toHaveLength(6)
    expect(rendered.elements.some((element: any) => element.type === 'shape' && element.fill === '#219ebc')).toBe(true)
    expect(rendered.elements.some((element: any) => element.type === 'shape' && element.fill === '#fb8500')).toBe(true)
    expect(rendered.elements.some((element: any) => String(element.id).includes('page_badge'))).toBe(true)
  })

  it('renders split image/list pages with placeholder image, divider, and branded page badge', () => {
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
        layoutTemplate: 'split_image_list',
        pageNumber: 8,
      },
    })

    expect(rendered.elements.some((element: any) => element.type === 'image')).toBe(true)
    expect(rendered.elements.some((element: any) => element.type === 'shape' && element.width <= 8 && element.fill === '#fb8500')).toBe(true)
    expect(rendered.elements.some((element: any) => String(element.id).includes('page_badge'))).toBe(true)
  })

  it('renders process infographic step numbers inside circles rather than as separate text overlays', () => {
    const service = new SlideToPPTistService()

    const rendered = service.convert({
      id: 'slide_process',
      kind: 'content',
      title: '比赛怎么进行',
      summary: '从开球到得分的最短理解路径。',
      bullets: ['争球开局', '攻防推进', '射门得分'],
      regeneratable: true,
      metadata: {
        layoutTemplate: 'process_infographic',
        pageNumber: 4,
      },
    })

    const stepCircle = rendered.elements.find((element: any) => element.id === 'slide_process_step_circle_1') as any
    const stepNo = rendered.elements.find((element: any) => element.id === 'slide_process_step_no_1')

    expect(stepCircle?.text?.content).toContain('1')
    expect(stepNo).toBeUndefined()
  })

  it('renders timeline pages with alternating milestones and guide line', () => {
    const service = new SlideToPPTistService()

    const rendered = service.convert({
      id: 'slide_timeline',
      kind: 'content',
      title: '足球如何走向世界',
      summary: '按时间顺序看规则和职业化扩散。',
      bullets: ['古代起源', '英国规则成型', '职业联赛出现', '世界杯推动全球化'],
      regeneratable: true,
      metadata: {
        layoutTemplate: 'timeline_story',
        pageNumber: 6,
      },
    })

    expect(rendered.elements.some((element: any) => element.id === 'slide_timeline_timeline_line')).toBe(true)
    expect(rendered.elements.filter((element: any) => String(element.id).includes('_milestone_')).length).toBe(4)
  })

  it('renders comparison pages with two contrasted columns', () => {
    const service = new SlideToPPTistService()

    const rendered = service.convert({
      id: 'slide_compare',
      kind: 'content',
      title: '足球与冰球观看差异',
      summary: '对比节奏、空间和身体对抗感受。',
      bullets: ['足球更重阵型与空间控制', '冰球节奏更快且换人频繁'],
      regeneratable: true,
      metadata: {
        layoutTemplate: 'compare_two_column',
        pageNumber: 7,
      },
    })

    expect(rendered.elements.some((element: any) => element.id === 'slide_compare_col_left')).toBe(true)
    expect(rendered.elements.some((element: any) => element.id === 'slide_compare_col_right')).toBe(true)
  })
})
