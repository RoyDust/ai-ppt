import { describe, expect, it } from 'vitest'
import { clampPlannedPageCount } from '../../libs/ai-orchestrator/src/planner/page-count.service'

describe('page count service', () => {
  it('keeps generated counts within the agreed range', () => {
    expect(clampPlannedPageCount(10, 14)).toBe(12)
    expect(clampPlannedPageCount(10, 7)).toBe(9)
  })
})
