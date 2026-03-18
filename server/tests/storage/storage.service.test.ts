import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('storage service', () => {
  it('uses local filesystem storage in v1', () => {
    const file = fs.readFileSync('libs/storage/src/storage.service.ts', 'utf8')
    expect(file).toContain('writeFile')
  })
})
