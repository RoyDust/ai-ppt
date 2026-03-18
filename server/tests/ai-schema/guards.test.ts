import { describe, expect, it } from 'vitest'
import { isAIDeck } from '../../libs/ai-schema/src/guards'

describe('server ai schema guards', () => {
  it('accepts a minimal deck payload', () => {
    expect(
      isAIDeck({
        id: 'deck_1',
        topic: '大学生职业生涯规划',
        goalPageCount: 10,
        actualPageCount: 11,
        language: 'zh-CN',
        outlineSummary: '围绕职业认知展开',
        slides: [],
      }),
    ).toBe(true)
  })
})
