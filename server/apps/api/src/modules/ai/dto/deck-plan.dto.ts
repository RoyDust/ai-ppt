type ResearchProjectInput = {
  projectBackground?: string[]
  projectObjectives?: string[]
  sampleDesign?: string[]
  researchFramework?: string[]
}

export class DeckPlanDto {
  inputMode?: 'simple' | 'research'
  topic!: string
  goalPageCount!: number
  language!: string
  researchBrief?: string
  researchInput?: ResearchProjectInput
}
