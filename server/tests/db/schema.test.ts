import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('database schema', () => {
  it('defines deck_versions and ai_tasks', () => {
    const schema = fs.readFileSync('prisma/schema.prisma', 'utf8')
    expect(schema).toContain('model DeckVersion')
    expect(schema).toContain('model AITask')
  })
})
