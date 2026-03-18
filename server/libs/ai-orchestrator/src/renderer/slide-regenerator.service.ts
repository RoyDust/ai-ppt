import type { SlideRegenerationContext } from '../../../ai-schema/src/regeneration-context'
import type { LLMProvider } from '../providers/llm-provider.interface'

export class SlideRegeneratorService {
  constructor(private readonly provider: LLMProvider) {}

  regenerate(context: SlideRegenerationContext) {
    return this.provider.regenerateSlide(context)
  }
}
