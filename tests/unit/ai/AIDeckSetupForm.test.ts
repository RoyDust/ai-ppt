import { createApp, h, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AIDeckSetupForm from '@/ai/components/AIDeckSetupForm.vue'
import {
  DEFAULT_AI_DECK_PAGE_COUNT,
  MAX_AI_DECK_PAGE_COUNT,
  MIN_AI_DECK_PAGE_COUNT,
  normalizeDeckPlanInput,
} from '@/ai/types/deck'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('AIDeckSetupForm input governance helpers', () => {
  it('rejects blank topic in simple mode', () => {
    const result = normalizeDeckPlanInput({
      inputMode: 'simple',
      topic: '   ',
      goalPageCount: 10,
      language: 'zh-CN',
    })

    expect(result.ok).toBe(false)
    expect(result.errors.topic).toContain('主题')
  })

  it('falls back to text parsing for malformed research json paste', () => {
    const result = normalizeDeckPlanInput({
      inputMode: 'research',
      topic: '',
      goalPageCount: 11,
      language: 'zh-CN',
      researchBrief: '{"projectBackground":["A"],',
    })

    expect(result.ok).toBe(true)
    expect(result.warnings.researchBrief).toContain('JSON')
    expect(result.payload.researchInput).toEqual({
      projectBackground: ['{"projectBackground":["A"],'],
    })
  })

  it('normalizes page count and cleans oversized or empty research blocks', () => {
    const noisyLine = `  ${'A'.repeat(700)}  `
    const result = normalizeDeckPlanInput({
      inputMode: 'research',
      topic: '  2026 消费者研究  ',
      goalPageCount: MAX_AI_DECK_PAGE_COUNT + 10,
      language: 'zh-CN',
      researchInput: {
        projectBackground: ['', '  背景一  ', noisyLine],
        projectObjectives: [' ', '  目标一  '],
        sampleDesign: [],
        researchFramework: ['  框架一  ', ''],
      },
    })

    expect(result.ok).toBe(true)
    expect(result.payload.goalPageCount).toBe(MAX_AI_DECK_PAGE_COUNT)
    expect(result.payload.topic).toBe('2026 消费者研究')
    expect(result.payload.researchInput).toEqual({
      projectBackground: ['背景一', 'A'.repeat(280)],
      projectObjectives: ['目标一'],
      researchFramework: ['框架一'],
    })
  })

  it('clamps low page counts to the default lower bound', () => {
    const result = normalizeDeckPlanInput({
      inputMode: 'simple',
      topic: '研究汇报',
      goalPageCount: MIN_AI_DECK_PAGE_COUNT - 5,
      language: 'zh-CN',
    })

    expect(result.ok).toBe(true)
    expect(result.payload.goalPageCount).toBe(MIN_AI_DECK_PAGE_COUNT)
    expect(result.payload.goalPageCount).not.toBe(DEFAULT_AI_DECK_PAGE_COUNT)
  })

  it('keeps explicit zero page count through component submit wiring and clamps it to the lower bound', async () => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    })

    const submitted: any[] = []
    const host = document.createElement('div')
    document.body.appendChild(host)

    createApp({
      render: () => h(AIDeckSetupForm, {
        topic: '',
        goalPageCount: DEFAULT_AI_DECK_PAGE_COUNT,
        language: 'zh-CN',
        onSubmit: (payload: unknown) => submitted.push(payload),
      }),
    }).mount(host)

    const inputs = host.querySelectorAll('input')
    const topicInput = inputs[0] as HTMLInputElement
    const pageCountInput = inputs[1] as HTMLInputElement
    const buttons = host.querySelectorAll('button')
    const submitButton = buttons[buttons.length - 1] as HTMLButtonElement

    topicInput.value = '季度复盘'
    topicInput.dispatchEvent(new Event('input', { bubbles: true }))
    pageCountInput.value = '0'
    pageCountInput.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()

    submitButton.click()
    await nextTick()

    expect(submitted).toEqual([
      {
        inputMode: 'simple',
        topic: '季度复盘',
        goalPageCount: MIN_AI_DECK_PAGE_COUNT,
        language: 'zh-CN',
      },
    ])
  })
})
