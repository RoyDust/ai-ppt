import fs from 'node:fs'
import path from 'node:path'

type SkillStage = 'plan' | 'render' | 'regenerate'

export interface PPTSkillProfile {
  contentFirst: boolean
  requiredPlanningDraftFields: string[]
  genericTitlePatterns: RegExp[]
  retryableQualityChecks: Array<'generic_title' | 'weak_evidence' | 'weak_research_reuse'>
  qualityBar: {
    minSupportingPoints: number
    minEvidenceHintsForResearch: number
  }
  researchRules: string[]
}

let cachedSkillContext: Record<SkillStage, string> | null = null
let cachedSkillProfile: PPTSkillProfile | null = null

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

const buildSkillProfile = (): PPTSkillProfile => ({
  contentFirst: true,
  requiredPlanningDraftFields: [
    'pageGoal',
    'coreMessage',
    'supportingPoints',
    'evidenceHints',
    'recommendedLayout',
  ],
  genericTitlePatterns: [
    /^背景介绍$/,
    /^现状分析$/,
    /^总结建议$/,
    /^总结$/,
    /^建议$/,
    /^行业分析$/,
    /^研究背景$/,
  ],
  retryableQualityChecks: ['generic_title', 'weak_evidence', 'weak_research_reuse'],
  qualityBar: {
    minSupportingPoints: 2,
    minEvidenceHintsForResearch: 1,
  },
  researchRules: [
    '优先提炼用户提供的研究材料，不要只做泛泛背景介绍。',
    '区分已知事实、判断和待确认事项。',
    '每页都要回答“为什么这一页存在”。',
    '如果是研究项目，至少一部分页面要直接复用项目背景、目标、样本或研究框架中的信息。',
  ],
})

export const getPPTSkillContext = (stage: SkillStage) => {
  if (!cachedSkillContext) {
    cachedSkillContext = buildSkillContext()
  }
  return cachedSkillContext[stage]
}

export const getPPTSkillProfile = () => {
  if (!cachedSkillProfile) {
    cachedSkillProfile = buildSkillProfile()
  }
  return cachedSkillProfile
}
