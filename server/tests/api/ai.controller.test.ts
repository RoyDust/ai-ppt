import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('ai api surface', () => {
  it('defines deck plan and single-slide render endpoints', () => {
    const controller = fs.readFileSync('apps/api/src/modules/ai/ai.controller.ts', 'utf8')
    expect(controller).toContain("@Post('deck/plan')")
    expect(controller).toContain("@Post('slide/render')")
    expect(controller).toContain("@Post('slide/regenerate')")
  })
})
