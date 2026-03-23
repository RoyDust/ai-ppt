type ResearchProjectInput = {
  projectBackground?: string[]
  projectObjectives?: string[]
  sampleDesign?: string[]
  researchFramework?: string[]
}

type PageCountRange = {
  key: 'compact' | 'standard' | 'extended'
  label: string
  min: number
  max: number
  suggested: number
}

export class DeckPlanDto {
  inputMode?: 'simple' | 'research'
  topic!: string
  goalPageCount!: number
  pageCountRange?: PageCountRange
  language!: string
  researchBrief?: string
  researchInput?: ResearchProjectInput
}
