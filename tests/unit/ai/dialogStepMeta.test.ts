import { describe, expect, it } from 'vitest'
import { getAIPPTDialogMeta } from '@/ai/utils/dialogStepMeta'

describe('getAIPPTDialogMeta', () => {
  it('builds setup-step workbench metadata with configuration summary', () => {
    const meta = getAIPPTDialogMeta({
      step: 'setup',
      goalPageCount: 12,
      language: 'en-US',
      topic: 'AI 产品路线图',
      isPlanning: false,
      isRendering: false,
    })

    expect(meta.activeStep).toBe('setup')
    expect(meta.badgeLabel).toBe('规划阶段')
    expect(meta.summaryItems).toEqual([
      { label: '主题', value: 'AI 产品路线图' },
      { label: '目标页数', value: '12 页' },
      { label: '输出语言', value: 'English' },
    ])
    expect(meta.guidance[0]).toContain('规划')
  })

  it('shows rendering status note from existing state only', () => {
    const meta = getAIPPTDialogMeta({
      step: 'generating',
      goalPageCount: 10,
      language: 'zh-CN',
      topic: '年度总结',
      isPlanning: false,
      isRendering: true,
      lastPolledAt: '16:08:00',
    })

    expect(meta.badgeLabel).toBe('渲染阶段')
    expect(meta.statusNote).toBe('最近轮询：16:08:00')
    expect(meta.summaryItems).toContainEqual({ label: '渲染方式', value: '二次 AI 生成' })
  })
})
