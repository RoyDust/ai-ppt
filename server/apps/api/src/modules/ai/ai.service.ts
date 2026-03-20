import { Injectable, NotFoundException, Optional } from '@nestjs/common'
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
import type { DeckDetailDto, DeckListItemDto } from './dto/deck-list.dto'

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

  async listDecks(scope: { userId?: string; projectId?: string } = {}): Promise<DeckListItemDto[]> {
    if (!this.decksRepository) {
      return []
    }

    return this.decksRepository.listDeckSummaries({
      ...scope,
      limit: 50,
    })
  }

  async getDeck(deckId: string): Promise<DeckDetailDto> {
    if (!this.decksRepository) {
      throw new NotFoundException(`Deck ${deckId} not found`)
    }

    const deck = await this.decksRepository.findDeckSummaryById(deckId)
    if (!deck) {
      throw new NotFoundException(`Deck ${deckId} not found`)
    }

    const currentVersion = deck.currentVersionId && this.deckVersionsRepository
      ? await this.deckVersionsRepository.findById(deck.currentVersionId)
      : null

    return {
      ...deck,
      currentVersion,
    }
  }

  async planDeck(payload: DeckPlanDto) {
    const result = await this.planDeckWithFallback(payload.topic, payload.goalPageCount, payload.language)
    return {
      deck: result.deck,
      slides: result.deck.slides,
      plannedPageCount: result.deck.actualPageCount,
    }
  }

  async renderDeck(payload: DeckRenderDto & { topic?: string; goalPageCount?: number; language?: string; overwrite?: boolean }) {
    const inputDeck = payload.deck
    const topic = payload.topic || inputDeck?.topic || payload.deckId || 'AI 演示文稿'
    const goalPageCount = payload.goalPageCount || inputDeck?.goalPageCount || 6
    const language = payload.language || inputDeck?.language || 'zh-CN'
    const deck = inputDeck ?? (await this.planDeckWithFallback(topic, goalPageCount, language)).deck

    return this.queueService.enqueueAsync('deck_render', payload, async () => {
      if (!this.deckRendererService) {
        throw new Error('Deck renderer unavailable')
      }
      return this.deckRendererService.render(deck)
    })
  }

  async regenerateSlide(payload: SlideRegenerateDto) {
    const regenerated = await this.slideRegeneratorService?.regenerate({
      deckId: payload.deckId,
      slideId: payload.slideId,
      prompt: payload.instructions,
      topic: payload.topic,
      language: payload.language,
      templateId: payload.templateId,
      designSystem: payload.designSystem,
      goalPageCount: payload.goalPageCount,
      outlineSummary: payload.outlineSummary,
      regenerateMode: payload.regenerateMode,
      currentPptSlideSummary: payload.currentPptSlideSummary,
      currentSlide: payload.currentSlide,
      deckOutline: payload.deckOutline,
      neighboringSlides: [payload.previousSlide, payload.nextSlide].filter(Boolean) as Record<string, unknown>[],
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

    await this.ensureDeckExists(payload.deckId, payload.createdBy, payload.aiDeckJson)

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
      deckId: payload.deckId,
      versionId: version.id,
      sourceType: 'deck_render',
      slides: payload.pptistSlidesJson,
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

    const parentVersion = await this.deckVersionsRepository.findById(payload.parentVersionId)
    if (!parentVersion || parentVersion.deckId !== payload.deckId) {
      throw new NotFoundException(`Parent version ${payload.parentVersionId} not found for deck ${payload.deckId}`)
    }

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
      parentVersionId: payload.parentVersionId,
      slides: payload.pptistSlidesJson,
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

  private async ensureDeckExists(deckId: string, createdBy: string, aiDeckJson?: AIDeck) {
    const existingDeck = await this.decksRepository?.findDeckSummaryById(deckId)
    if (existingDeck || !this.decksRepository) return

    const projectId = await this.decksRepository.findDefaultProjectIdByUserId(createdBy)
    if (!projectId) {
      throw new NotFoundException(`No project found for user ${createdBy}`)
    }

    await this.decksRepository.create({
      id: deckId,
      projectId,
      userId: createdBy,
      title: aiDeckJson?.topic || 'AI 演示文稿',
    })
  }
}
