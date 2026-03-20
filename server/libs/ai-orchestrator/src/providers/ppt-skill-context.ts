import fs from 'node:fs'
import path from 'node:path'

type SkillStage = 'plan' | 'render' | 'regenerate'

let cachedSkillContext: Record<SkillStage, string> | null = null

const loadSkillFile = (filename: string) => {
  const filePath = path.resolve(__dirname, '../../../../../src/skills', filename)
  try {
    return fs.readFileSync(filePath, 'utf8').trim()
  }
  catch {
    return ''
  }
}

const compact = (value: string) =>
  value
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const buildSkillContext = (): Record<SkillStage, string> => {
  const integration = loadSkillFile('agent-integration.md')
  const method = loadSkillFile('method.md')
  const prompts = loadSkillFile('prompts.md')

  return {
    plan: compact([
      'PPT skill workflow guidance:',
      integration,
      method,
      prompts,
    ].filter(Boolean).join('\n\n')),
    render: compact([
      'PPT skill workflow guidance for render stage:',
      'Content leads, design follows.',
      'Use the planning draft layer: each page needs purpose, key message, supporting evidence, visual form, and hierarchy.',
      'Prefer structured intermediate outputs and make each page feel like a reviewed planning card, not a raw bullet dump.',
      method,
      prompts,
    ].filter(Boolean).join('\n\n')),
    regenerate: compact([
      'PPT skill workflow guidance for regenerate stage:',
      'Preserve page purpose before changing expression.',
      'Content leads, design follows.',
      'Treat the current slide as a reviewed planning draft for one page: keep the page goal, strengthen evidence, and improve expression without drifting off-topic.',
      integration,
      method,
    ].filter(Boolean).join('\n\n')),
  }
}

export const getPPTSkillContext = (stage: SkillStage) => {
  if (!cachedSkillContext) {
    cachedSkillContext = buildSkillContext()
  }
  return cachedSkillContext[stage]
}

