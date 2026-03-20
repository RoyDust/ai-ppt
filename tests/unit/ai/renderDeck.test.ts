import { describe, expect, it } from 'vitest'
import { renderAISlideToPPTistSlide } from '@/ai/adapters/renderSlide'

describe('frontend ai adapter', () => {
  it('renders a semantic slide into a PPTist-compatible slide shell', () => {
    const rendered = renderAISlideToPPTistSlide(
      { id: 'slide_1', kind: 'content', title: '职业规划的重要性', regeneratable: true },
      { id: 'template_1', elements: [], background: { type: 'solid', color: '#fff' } } as any,
    )

    expect(rendered.id).toBeDefined()
    expect(rendered.background).toEqual({ type: 'solid', color: '#fff' })
  })

  it('replaces template elements with generated text content for single-slide regeneration', () => {
    const rendered = renderAISlideToPPTistSlide(
      {
        id: 'slide_regen_2',
        kind: 'content',
        title: '职业规划的重要性',
        summary: '先建立决策框架，再聚焦核心影响因素。',
        bullets: ['明确能力边界', '识别行业机会', '匹配长期目标'],
        regeneratable: true,
      },
      {
        id: 'template_2',
        type: 'content',
        background: { type: 'solid', color: '#f5f7fb' },
        elements: [
          {
            id: 'legacy_text',
            type: 'text',
            left: 10,
            top: 10,
            width: 200,
            height: 40,
            rotate: 0,
            content: '<p>旧页面内容</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#111111',
          },
        ],
      } as any,
    )

    expect(rendered.id).toBe('slide_regen_2')
    expect(rendered.background).toEqual({ type: 'solid', color: '#f5f7fb' })
    expect(rendered.elements).toHaveLength(3)
    expect(rendered.elements[0].content).toContain('职业规划的重要性')
    expect(rendered.elements[1].content).toContain('先建立决策框架')
    expect(rendered.elements[2].content).toContain('明确能力边界')
    expect(rendered.elements[2].content).toContain('识别行业机会')
    expect(rendered.elements[2].content).not.toContain('旧页面内容')
  })

  it('preserves the original slide text slots and visual styling when replacing a slide', () => {
    const rendered = renderAISlideToPPTistSlide(
      {
        id: 'slide_regen_3',
        kind: 'content',
        title: '新的页面标题',
        summary: '新的页面摘要',
        bullets: ['要点一', '要点二'],
        regeneratable: true,
      },
      {
        id: 'template_3',
        type: 'content',
        background: { type: 'solid', color: '#f5f7fb' },
        elements: [
          {
            id: 'title_slot',
            type: 'text',
            left: 80,
            top: 52,
            width: 640,
            height: 72,
            rotate: 0,
            content: '<p><span style="font-size: 28px; font-weight: 700;">旧标题</span></p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#0f172a',
          },
          {
            id: 'summary_slot',
            type: 'text',
            left: 80,
            top: 146,
            width: 640,
            height: 64,
            rotate: 0,
            content: '<p><span style="font-size: 16px;">旧摘要</span></p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#475569',
          },
          {
            id: 'bullet_slot',
            type: 'text',
            left: 80,
            top: 228,
            width: 420,
            height: 180,
            rotate: 0,
            content: '<p>旧要点</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#1f2937',
          },
          {
            id: 'hero_shape',
            type: 'shape',
            left: 600,
            top: 180,
            width: 220,
            height: 180,
            rotate: 0,
            viewBox: [1000, 1000],
            path: 'M0 0 L1000 0 L1000 1000 L0 1000 Z',
            fixedRatio: false,
            fill: '#111827',
          },
        ],
      } as any,
    )

    expect(rendered.elements).toHaveLength(4)
    expect(rendered.elements[0]).toMatchObject({
      id: 'title_slot',
      left: 80,
      top: 52,
      width: 640,
      height: 72,
      defaultColor: '#0f172a',
    })
    expect(rendered.elements[1]).toMatchObject({
      id: 'summary_slot',
      left: 80,
      top: 146,
      width: 640,
      height: 64,
      defaultColor: '#475569',
    })
    expect(rendered.elements[2]).toMatchObject({
      id: 'bullet_slot',
      left: 80,
      top: 228,
      width: 420,
      height: 180,
      defaultColor: '#1f2937',
    })
    expect(rendered.elements[3]).toMatchObject({
      id: 'hero_shape',
      type: 'shape',
      left: 600,
      top: 180,
    })
    expect(rendered.elements[0].content).toContain('新的页面标题')
    expect(rendered.elements[0].content).toContain('font-size: 28px')
    expect(rendered.elements[1].content).toContain('新的页面摘要')
    expect(rendered.elements[2].content).toContain('要点一')
    expect(rendered.elements[2].content).toContain('要点二')
  })

  it('does not inject regenerated content into narrow sidebar slots', () => {
    const rendered = renderAISlideToPPTistSlide(
      {
        id: 'slide_regen_4',
        kind: 'content',
        title: '核心能力一页总览',
        summary: '本页用于快速建立整体认知。',
        bullets: ['第一条主结论', '第二条主结论', '第三条主结论'],
        regeneratable: true,
      },
      {
        id: 'template_4',
        type: 'content',
        background: { type: 'solid', color: '#f5f7fb' },
        elements: [
          {
            id: 'title_slot',
            type: 'text',
            textType: 'title',
            left: 84,
            top: 52,
            width: 620,
            height: 72,
            rotate: 0,
            content: '<p><span style="font-size: 28px;">旧标题</span></p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#0f172a',
          },
          {
            id: 'summary_slot',
            type: 'text',
            textType: 'content',
            left: 84,
            top: 138,
            width: 620,
            height: 58,
            rotate: 0,
            content: '<p>旧摘要</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#475569',
          },
          {
            id: 'item_slot_1',
            type: 'text',
            textType: 'item',
            left: 108,
            top: 214,
            width: 240,
            height: 66,
            rotate: 0,
            content: '<p>旧要点 1</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#1f2937',
          },
          {
            id: 'item_slot_2',
            type: 'text',
            textType: 'item',
            left: 108,
            top: 302,
            width: 240,
            height: 66,
            rotate: 0,
            content: '<p>旧要点 2</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#1f2937',
          },
          {
            id: 'sidebar_slot',
            type: 'text',
            textType: 'content',
            left: 760,
            top: 60,
            width: 92,
            height: 280,
            rotate: 0,
            content: '<p>保留侧栏</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#475569',
          },
        ],
      } as any,
    )

    const sidebar = rendered.elements.find((element: any) => element.id === 'sidebar_slot') as any
    expect(sidebar.content).toContain('保留侧栏')
    expect(sidebar.content).not.toContain('本页用于快速建立整体认知')
    expect(sidebar.content).not.toContain('第一条主结论')
  })

  it('shrinks font size when regenerated text would otherwise overflow the original slot', () => {
    const rendered = renderAISlideToPPTistSlide(
      {
        id: 'slide_regen_5',
        kind: 'content',
        title: '这是一段明显更长的新标题需要在有限宽度里自动缩小字号避免与其他内容发生堆叠',
        regeneratable: true,
      },
      {
        id: 'template_5',
        type: 'content',
        background: { type: 'solid', color: '#fff' },
        elements: [
          {
            id: 'title_slot',
            type: 'text',
            textType: 'title',
            left: 84,
            top: 52,
            width: 280,
            height: 56,
            rotate: 0,
            content: '<p><span style="font-size: 28px; font-weight: 700;">旧标题</span></p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#0f172a',
            lineHeight: 1.2,
          },
        ],
      } as any,
    )

    const title = rendered.elements[0] as any
    expect(title.content).toContain('新标题')
    expect(title.content).not.toContain('font-size: 28px')
  })

  it('clears unused original text slots before applying regenerated content', () => {
    const rendered = renderAISlideToPPTistSlide(
      {
        id: 'slide_regen_6',
        kind: 'content',
        title: '新的页面标题',
        summary: '新的页面摘要',
        bullets: ['新的要点'],
        regeneratable: true,
      },
      {
        id: 'template_6',
        type: 'content',
        background: { type: 'solid', color: '#fff' },
        elements: [
          {
            id: 'title_slot',
            type: 'text',
            textType: 'title',
            left: 84,
            top: 52,
            width: 620,
            height: 72,
            rotate: 0,
            content: '<p><span style="font-size: 28px;">旧标题</span></p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#0f172a',
          },
          {
            id: 'summary_slot',
            type: 'text',
            textType: 'content',
            left: 84,
            top: 138,
            width: 620,
            height: 58,
            rotate: 0,
            content: '<p>旧摘要</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#475569',
          },
          {
            id: 'item_slot',
            type: 'text',
            textType: 'item',
            left: 108,
            top: 214,
            width: 240,
            height: 66,
            rotate: 0,
            content: '<p>旧要点</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#1f2937',
          },
          {
            id: 'extra_old_slot',
            type: 'text',
            textType: 'item',
            left: 108,
            top: 302,
            width: 240,
            height: 66,
            rotate: 0,
            content: '<p>应该被清空的旧内容</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#1f2937',
          },
        ],
      } as any,
    )

    const cleared = rendered.elements.find((element: any) => element.id === 'extra_old_slot') as any
    expect(cleared.content).not.toContain('应该被清空的旧内容')
  })

  it('maps master_split subtitle and summary into separate header slots', () => {
    const rendered = renderAISlideToPPTistSlide(
      {
        id: 'slide_regen_7',
        kind: 'content',
        title: '独居家电关联购买机会',
        subtitle: '先看高频组合，再解释行为原因',
        summary: '本页需要保留模板原有标题层级，并将副标题和摘要拆开放置，避免挤压到同一个文本框。',
        bullets: ['组合渗透率正在提升', '场景联动高于单品决策', '适合进入组套推荐'],
        regeneratable: true,
        metadata: {
          layoutTemplate: 'master_split',
        },
      } as any,
      {
        id: 'template_7',
        type: 'content',
        background: { type: 'solid', color: '#fff' },
        elements: [
          {
            id: 'split_title',
            type: 'text',
            textType: 'title',
            left: 64,
            top: 60,
            width: 760,
            height: 42,
            rotate: 0,
            content: '<p><span style="font-size: 28px; font-weight: 700;">旧标题</span></p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#0f172a',
          },
          {
            id: 'split_subtitle',
            type: 'text',
            textType: 'content',
            left: 64,
            top: 128,
            width: 760,
            height: 20,
            rotate: 0,
            content: '<p><span style="font-size: 13px;">旧副标题</span></p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#b50fb5',
          },
          {
            id: 'split_summary',
            type: 'text',
            textType: 'content',
            left: 64,
            top: 152,
            width: 760,
            height: 34,
            rotate: 0,
            content: '<p><span style="font-size: 14px;">旧摘要</span></p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#5b6477',
          },
          {
            id: 'split_item_1',
            type: 'text',
            textType: 'item',
            left: 88,
            top: 224,
            width: 292,
            height: 26,
            rotate: 0,
            content: '<p>旧要点1</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#0f172a',
          },
          {
            id: 'split_item_2',
            type: 'text',
            textType: 'item',
            left: 88,
            top: 268,
            width: 292,
            height: 26,
            rotate: 0,
            content: '<p>旧要点2</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#0f172a',
          },
        ],
      } as any,
    )

    const subtitle = rendered.elements.find((element: any) => element.id === 'split_subtitle') as any
    const summary = rendered.elements.find((element: any) => element.id === 'split_summary') as any

    expect(subtitle.content).toContain('先看高频组合')
    expect(subtitle.content).not.toContain('模板原有标题层级')
    expect(summary.content).toContain('模板原有标题层级')
  })

  it('maps master_table body sections into heading and detail columns separately', () => {
    const rendered = renderAISlideToPPTistSlide(
      {
        id: 'slide_regen_8',
        kind: 'content',
        title: '研究执行拆解',
        bodySections: [
          { heading: '定性探索', text: '访谈 200 人，沉淀动机地图与机会假设。' },
          { heading: '定量验证', text: '问卷 800 人，验证组合吸引力与转化潜力。' },
        ],
        regeneratable: true,
        metadata: {
          layoutTemplate: 'master_table',
        },
      } as any,
      {
        id: 'template_8',
        type: 'content',
        background: { type: 'solid', color: '#fff' },
        elements: [
          {
            id: 'table_title',
            type: 'text',
            textType: 'title',
            left: 64,
            top: 60,
            width: 760,
            height: 42,
            rotate: 0,
            content: '<p><span style="font-size: 28px;">旧标题</span></p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#0f172a',
          },
          {
            id: 'table_heading_1',
            type: 'text',
            textType: 'item',
            left: 92,
            top: 258,
            width: 184,
            height: 20,
            rotate: 0,
            content: '<p>旧模块1</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#0f172a',
          },
          {
            id: 'table_text_1',
            type: 'text',
            textType: 'item',
            left: 316,
            top: 258,
            width: 474,
            height: 20,
            rotate: 0,
            content: '<p>旧说明1</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#5b6477',
          },
          {
            id: 'table_heading_2',
            type: 'text',
            textType: 'item',
            left: 92,
            top: 300,
            width: 184,
            height: 20,
            rotate: 0,
            content: '<p>旧模块2</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#0f172a',
          },
          {
            id: 'table_text_2',
            type: 'text',
            textType: 'item',
            left: 316,
            top: 300,
            width: 474,
            height: 20,
            rotate: 0,
            content: '<p>旧说明2</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#5b6477',
          },
        ],
      } as any,
    )

    const heading1 = rendered.elements.find((element: any) => element.id === 'table_heading_1') as any
    const text1 = rendered.elements.find((element: any) => element.id === 'table_text_1') as any
    const heading2 = rendered.elements.find((element: any) => element.id === 'table_heading_2') as any
    const text2 = rendered.elements.find((element: any) => element.id === 'table_text_2') as any

    expect(heading1.content).toContain('定性探索')
    expect(heading1.content).not.toContain('访谈 200 人')
    expect(text1.content).toContain('访谈 200 人')
    expect(heading2.content).toContain('定量验证')
    expect(text2.content).toContain('问卷 800 人')
  })

  it('keeps master_compare content inside left and right compare regions only', () => {
    const rendered = renderAISlideToPPTistSlide(
      {
        id: 'slide_regen_9',
        kind: 'content',
        title: '方案对比',
        subtitle: '横向比较两种执行路径',
        summary: '比较维度包括效率、成本与可复制性。',
        bodySections: [
          { heading: '方案 A', text: '直接从已验证样本切入，速度快但覆盖面偏窄。' },
          { heading: '方案 B', text: '先扩展样本池再做验证，覆盖更全但执行周期更长。' },
        ],
        regeneratable: true,
        metadata: {
          layoutTemplate: 'master_compare',
        },
      } as any,
      {
        id: 'template_9',
        type: 'content',
        background: { type: 'solid', color: '#fff' },
        elements: [
          {
            id: 'compare_title',
            type: 'text',
            textType: 'title',
            left: 64,
            top: 60,
            width: 760,
            height: 42,
            rotate: 0,
            content: '<p><span style="font-size: 28px;">旧标题</span></p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#0f172a',
          },
          {
            id: 'compare_subtitle',
            type: 'text',
            textType: 'content',
            left: 64,
            top: 128,
            width: 760,
            height: 20,
            rotate: 0,
            content: '<p>旧副标题</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#b50fb5',
          },
          {
            id: 'compare_summary',
            type: 'text',
            textType: 'content',
            left: 64,
            top: 152,
            width: 760,
            height: 34,
            rotate: 0,
            content: '<p>旧摘要</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#5b6477',
          },
          {
            id: 'compare_left_title',
            type: 'text',
            textType: 'itemTitle',
            left: 98,
            top: 238,
            width: 230,
            height: 24,
            rotate: 0,
            content: '<p>旧左标题</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#b50fb5',
          },
          {
            id: 'compare_right_title',
            type: 'text',
            textType: 'itemTitle',
            left: 502,
            top: 238,
            width: 230,
            height: 24,
            rotate: 0,
            content: '<p>旧右标题</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#fd6525',
          },
          {
            id: 'compare_left_body',
            type: 'text',
            textType: 'item',
            left: 98,
            top: 278,
            width: 294,
            height: 118,
            rotate: 0,
            content: '<p>旧左正文</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#0f172a',
          },
          {
            id: 'compare_right_body',
            type: 'text',
            textType: 'item',
            left: 502,
            top: 278,
            width: 294,
            height: 118,
            rotate: 0,
            content: '<p>旧右正文</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#0f172a',
          },
          {
            id: 'compare_helper',
            type: 'text',
            textType: 'content',
            left: 820,
            top: 230,
            width: 80,
            height: 160,
            rotate: 0,
            content: '<p>不应写入的辅助文案</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#64748b',
          },
        ],
      } as any,
    )

    const helper = rendered.elements.find((element: any) => element.id === 'compare_helper') as any
    const leftBody = rendered.elements.find((element: any) => element.id === 'compare_left_body') as any
    const rightBody = rendered.elements.find((element: any) => element.id === 'compare_right_body') as any

    expect(leftBody.content).toContain('速度快但覆盖面偏窄')
    expect(rightBody.content).toContain('覆盖更全但执行周期更长')
    expect(helper.content).toContain('不应写入的辅助文案')
    expect(helper.content).not.toContain('速度快但覆盖面偏窄')
    expect(helper.content).not.toContain('覆盖更全但执行周期更长')
  })

  it('writes master_timeline stages only into milestone slots', () => {
    const rendered = renderAISlideToPPTistSlide(
      {
        id: 'slide_regen_10',
        kind: 'content',
        title: '项目推进路径',
        subtitle: '四阶段推进',
        summary: '阶段内容需要严格落入时间线节点，不应写进说明或辅助区域。',
        bullets: ['问题识别', '方案探索', '实验验证', '规模推广'],
        regeneratable: true,
        metadata: {
          layoutTemplate: 'master_timeline',
        },
      } as any,
      {
        id: 'template_10',
        type: 'content',
        background: { type: 'solid', color: '#fff' },
        elements: [
          {
            id: 'timeline_title',
            type: 'text',
            textType: 'title',
            left: 64,
            top: 60,
            width: 760,
            height: 42,
            rotate: 0,
            content: '<p><span style="font-size: 28px;">旧标题</span></p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#0f172a',
          },
          {
            id: 'timeline_subtitle',
            type: 'text',
            textType: 'content',
            left: 64,
            top: 128,
            width: 760,
            height: 20,
            rotate: 0,
            content: '<p>旧副标题</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#b50fb5',
          },
          {
            id: 'timeline_summary',
            type: 'text',
            textType: 'content',
            left: 64,
            top: 152,
            width: 760,
            height: 34,
            rotate: 0,
            content: '<p>旧摘要</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#5b6477',
          },
          {
            id: 'milestone_text_1',
            type: 'text',
            textType: 'item',
            left: 102,
            top: 223,
            width: 262,
            height: 20,
            rotate: 0,
            content: '<p>旧节点1</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#0f172a',
          },
          {
            id: 'milestone_text_2',
            type: 'text',
            textType: 'item',
            left: 532,
            top: 271,
            width: 262,
            height: 20,
            rotate: 0,
            content: '<p>旧节点2</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#0f172a',
          },
          {
            id: 'milestone_text_3',
            type: 'text',
            textType: 'item',
            left: 102,
            top: 319,
            width: 262,
            height: 20,
            rotate: 0,
            content: '<p>旧节点3</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#0f172a',
          },
          {
            id: 'milestone_text_4',
            type: 'text',
            textType: 'item',
            left: 532,
            top: 367,
            width: 262,
            height: 20,
            rotate: 0,
            content: '<p>旧节点4</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#0f172a',
          },
          {
            id: 'timeline_helper',
            type: 'text',
            textType: 'content',
            left: 846,
            top: 210,
            width: 70,
            height: 170,
            rotate: 0,
            content: '<p>保留辅助区域</p>',
            defaultFontName: 'Microsoft YaHei',
            defaultColor: '#64748b',
          },
        ],
      } as any,
    )

    const helper = rendered.elements.find((element: any) => element.id === 'timeline_helper') as any
    const node1 = rendered.elements.find((element: any) => element.id === 'milestone_text_1') as any
    const node4 = rendered.elements.find((element: any) => element.id === 'milestone_text_4') as any

    expect(node1.content).toContain('问题识别')
    expect(node4.content).toContain('规模推广')
    expect(helper.content).toContain('保留辅助区域')
    expect(helper.content).not.toContain('问题识别')
    expect(helper.content).not.toContain('规模推广')
  })

})
