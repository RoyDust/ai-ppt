import { Injectable, Optional } from '@nestjs/common'
import { QueueService } from '../../../../../libs/queue/src/queue.service'
import { AITasksRepository } from '../../../../../libs/db/src/repositories/ai-tasks.repository'
import { DeckVersionsRepository } from '../../../../../libs/db/src/repositories/deck-versions.repository'
import { DecksRepository } from '../../../../../libs/db/src/repositories/decks.repository'
import { DeckPlannerService } from '../../../../../libs/ai-orchestrator/src/planner/deck-planner.service'
import { DeckRendererService } from '../../../../../libs/ai-orchestrator/src/renderer/deck-renderer.service'
import { SlideRegeneratorService } from '../../../../../libs/ai-orchestrator/src/renderer/slide-regenerator.service'
import { DeckPlanDto } from './dto/deck-plan.dto'
import { DeckRenderDto } from './dto/deck-render.dto'
import { SlideRegenerateDto } from './dto/slide-regenerate.dto'
import type { AIDeck } from '../../../../../libs/ai-schema/src/ai-deck'

@Injectable()
export class AiService {
  constructor(
    private readonly queueService: QueueService,
    @Optional() private readonly aiTasksRepository?: AITasksRepository,
    @Optional() private readonly deckVersionsRepository?: DeckVersionsRepository,
    @Optional() private readonly decksRepository?: DecksRepository,
    @Optional() private readonly deckPlannerService?: DeckPlannerService,
    @Optional() private readonly deckRendererService?: DeckRendererService,
    @Optional() private readonly slideRegeneratorService?: SlideRegeneratorService,
  ) {}

  async planDeck(payload: DeckPlanDto) {
    const result = await this.planDeckWithFallback(payload.topic, payload.goalPageCount, payload.language)
    return {
      slides: result.deck.slides,
      plannedPageCount: result.deck.actualPageCount,
    }
  }

  async renderDeck(payload: DeckRenderDto & { topic?: string; goalPageCount?: number; language?: string; overwrite?: boolean }) {
    const topic = payload.topic || payload.deckId || 'AI 演示文稿'
    const goalPageCount = payload.goalPageCount || 6
    const language = payload.language || 'zh-CN'
    const { deck } = await this.planDeckWithFallback(topic, goalPageCount, language)
    const rendered = this.deckRendererService?.render(deck) ?? { deck, slides: [] }

    return this.queueService.enqueue('deck_render', payload, rendered)
  }

  async regenerateSlide(payload: SlideRegenerateDto) {
    const regenerated = await this.slideRegeneratorService?.regenerate({
      deckId: payload.deckId,
      slideId: payload.slideId,
      prompt: payload.instructions,
    })

    return regenerated ?? {
      slide: {
        id: `regen_${Date.now()}`,
        kind: 'content',
        title: '重新生成的页面',
        bullets: ['新的要点预览'],
        regeneratable: true,
      },
    }
  }

  getTask(taskId: string) {
    return this.queueService.getJob(taskId) ?? {
      id: taskId,
      status: 'queued' as const,
    }
  }

  recordAITask(payload: {
    id: string
    userId: string
    deckId?: string
    deckVersionId?: string
    taskType: string
    status: string
  }) {
    if (!this.aiTasksRepository) return payload
    return this.aiTasksRepository.createTask(payload)
  }

  async acceptDeckRender(payload: {
    deckId: string
    createdBy: string
    sourceTaskId: string
    pptistSlidesJson: unknown[]
    aiDeckJson?: AIDeck
  }) {
    if (!this.deckVersionsRepository || !this.decksRepository) {
      return {
        versionId: payload.sourceTaskId,
        slides: payload.pptistSlidesJson,
      }
    }

    try {
      const version = await this.deckVersionsRepository.createVersion({
        deckId: payload.deckId,
        createdBy: payload.createdBy,
        sourceType: 'deck_render',
        sourceTaskId: payload.sourceTaskId,
        pptistSlidesJson: payload.pptistSlidesJson,
        aiDeckJson: payload.aiDeckJson ?? null,
      })
      await this.decksRepository.updateCurrentVersion(payload.deckId, version.id)
      return {
        id: version.id,
        versionId: version.id,
        sourceType: 'deck_render',
        slides: payload.pptistSlidesJson,
      }
    }
    catch {
      return {
        id: payload.sourceTaskId,
        versionId: payload.sourceTaskId,
        sourceType: 'deck_render',
        slides: payload.pptistSlidesJson,
      }
    }
  }

  async acceptSlideRegeneration(payload: {
    deckId: string
    createdBy: string
    sourceTaskId: string
    parentVersionId: string
    pptistSlidesJson: unknown[]
    aiDeckJson?: AIDeck
  }) {
    if (!this.deckVersionsRepository || !this.decksRepository) {
      return {
        versionId: payload.sourceTaskId,
        slides: payload.pptistSlidesJson,
      }
    }

    try {
      const version = await this.deckVersionsRepository.createVersion({
        deckId: payload.deckId,
        createdBy: payload.createdBy,
        sourceType: 'slide_regenerate',
        sourceTaskId: payload.sourceTaskId,
        parentVersionId: payload.parentVersionId,
        pptistSlidesJson: payload.pptistSlidesJson,
        aiDeckJson: payload.aiDeckJson ?? null,
      })
      await this.decksRepository.updateCurrentVersion(payload.deckId, version.id)
      return {
        id: version.id,
        versionId: version.id,
        sourceType: 'slide_regenerate',
        slides: payload.pptistSlidesJson,
      }
    }
    catch {
      return {
        id: payload.sourceTaskId,
        versionId: payload.sourceTaskId,
        sourceType: 'slide_regenerate',
        slides: payload.pptistSlidesJson,
      }
    }
  }

  private async planDeckWithFallback(topic: string, goalPageCount: number, language: string) {
    if (this.deckPlannerService) {
      return this.deckPlannerService.planDeck(topic, goalPageCount, language)
    }

    return {
      deck: {
        id: `deck_${Date.now()}`,
        topic,
        goalPageCount,
        actualPageCount: Math.max(6, Math.min(goalPageCount, 10)),
        language,
        outlineSummary: `${topic} 规划`,
        slides: [],
      },
    }
  }
}
