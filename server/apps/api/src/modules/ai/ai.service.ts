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
import type { QueueJob } from '../../../../../libs/queue/src/queue.service'
import type { RenderTaskProgress } from '../../../../../libs/ai-orchestrator/src/renderer/render-batch.types'

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
    const result = await this.planDeckWithFallback(payload)
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
    const deck = inputDeck ?? (await this.planDeckWithFallback({
      topic,
      goalPageCount,
      language,
    })).deck

    const taskPayload = {
      ...payload,
      deck,
    }

    const task = await Promise.resolve(this.queueService.enqueueAsync('deck_render', taskPayload, async (ctx) =>
      await this.runDeckRenderJob(deck, ctx)))

    const persistedDeck = deck.id && this.decksRepository
      ? await this.decksRepository.findDeckSummaryById(deck.id)
      : null

    await this.aiTasksRepository?.createTask({
      id: task.id,
      userId: 'system',
      deckId: persistedDeck ? deck.id : undefined,
      taskType: 'deck_render',
      status: task.status,
      inputJson: {
        deckId: deck.id,
      },
    })

    return {
      id: task.id,
      type: task.type,
      status: task.status,
      error: (task as QueueJob<unknown>).error,
    }
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

  async retryFailedRenderBatches(taskId: string) {
    const job = this.queueService.getJob(taskId) as QueueJob<{
      deck?: AIDeck
    }> | null

    if (!job?.payload?.deck) {
      throw new NotFoundException(`Task ${taskId} not found`)
    }

    const previousProgress = this.readRenderTaskProgress(job.output)
    const retryBatchIndexes = previousProgress?.batches
      .filter(batch => batch.status === 'failed' && batch.canRetry)
      .map(batch => batch.batchIndex) ?? []

    const retried = await this.queueService.retryJob(taskId, async (ctx) =>
      await this.runDeckRenderJob(job.payload.deck as AIDeck, ctx, {
        retryBatchIndexes,
        previousProgress,
      }))

    if (!retried) {
      throw new NotFoundException(`Task ${taskId} not found`)
    }

    return {
      id: retried.id,
      type: retried.type,
      status: retried.status,
      error: retried.error,
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
    pptistSlidesJson?: unknown[]
    aiDeckJson?: AIDeck
  }) {
    const resolved = this.resolveDeckAcceptPayload(payload)
    if (!this.deckVersionsRepository || !this.decksRepository) {
      return {
        versionId: payload.sourceTaskId,
        slides: resolved.pptistSlidesJson,
      }
    }

    await this.ensureDeckExists(payload.deckId, payload.createdBy, resolved.aiDeckJson)

    const version = await this.deckVersionsRepository.createVersion({
      deckId: payload.deckId,
      createdBy: payload.createdBy,
      sourceType: 'deck_render',
      sourceTaskId: payload.sourceTaskId,
      pptistSlidesJson: resolved.pptistSlidesJson,
      aiDeckJson: resolved.aiDeckJson ?? null,
    })
    await this.decksRepository.updateCurrentVersion(payload.deckId, version.id)
    return {
      id: version.id,
      deckId: payload.deckId,
      versionId: version.id,
      sourceType: 'deck_render',
      slides: resolved.pptistSlidesJson,
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

  private async planDeckWithFallback(input: DeckPlanDto) {
    if (this.deckPlannerService) {
      return this.deckPlannerService.planDeck({
        topic: input.topic,
        goalPageCount: input.goalPageCount,
        pageCountRange: input.pageCountRange,
        language: input.language,
        inputMode: input.inputMode,
        researchBrief: input.researchBrief,
        researchInput: input.researchInput,
      })
    }

    return {
      deck: {
        id: `deck_${Date.now()}`,
        topic: input.topic,
        goalPageCount: input.goalPageCount,
        actualPageCount: Math.max(6, Math.min(input.goalPageCount, 10)),
        language: input.language,
        outlineSummary: `${input.topic} 规划`,
        slides: [],
      },
    }
  }

  private async runDeckRenderJob(
    deck: AIDeck,
    ctx?: { jobId: string; updateProgress: (progress: Record<string, unknown>) => void },
    options?: {
      retryBatchIndexes?: number[]
      previousProgress?: RenderTaskProgress
    },
  ) {
    const runnerContext = ctx ?? {
      jobId: '',
      updateProgress: () => undefined,
    }

    if (!this.deckRendererService) {
      throw new Error('Deck renderer unavailable')
    }

    try {
      const result = options?.retryBatchIndexes?.length
        ? await this.deckRendererService.retryFailedBatches(deck, {
          retryBatchIndexes: options.retryBatchIndexes,
          previousProgress: options.previousProgress,
          onProgress: async (progress) => await this.persistRenderProgress(runnerContext, progress),
        })
        : await this.deckRendererService.render(deck, {
          onProgress: async (progress) => await this.persistRenderProgress(runnerContext, progress),
        })

      await this.persistRenderProgress(runnerContext, result.progress)
      await this.persistRenderResult(runnerContext.jobId, result)
      return result
    }
    catch (error) {
      if (runnerContext.jobId) {
        await this.aiTasksRepository?.failTask(runnerContext.jobId, {
          message: error instanceof Error ? error.message : 'AI render failed',
        })
      }
      throw error
    }
  }

  private async persistRenderProgress(
    runnerContext: { jobId: string; updateProgress: (progress: Record<string, unknown>) => void },
    progress: RenderTaskProgress,
  ) {
    const progressRecord = progress as unknown as Record<string, unknown>
    runnerContext.updateProgress(progressRecord)
    if (runnerContext.jobId) {
      await this.aiTasksRepository?.updateTaskProgress(runnerContext.jobId, progressRecord, 'running')
    }
  }

  private async persistRenderResult(jobId: string, result: {
    progress: RenderTaskProgress
    deck: AIDeck
    slides: unknown[]
    partialSuccess: boolean
    status?: 'partial_success'
  }) {
    if (!jobId) return

    await this.aiTasksRepository?.completeTask(jobId, {
      progress: result.progress as unknown as Record<string, unknown>,
      deck: result.deck as unknown as Record<string, unknown>,
      slides: result.slides as unknown as Record<string, unknown>,
      partialSuccess: result.partialSuccess,
    }, result.partialSuccess ? 'partial_success' : 'succeeded')
  }

  private readRenderTaskProgress(output: unknown) {
    if (!output || typeof output !== 'object') return undefined
    const record = output as Record<string, unknown>
    return record.progress as RenderTaskProgress | undefined
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

  private resolveDeckAcceptPayload(payload: {
    deckId: string
    sourceTaskId: string
    pptistSlidesJson?: unknown[]
    aiDeckJson?: AIDeck
  }) {
    if (payload.pptistSlidesJson?.length) {
      return {
        pptistSlidesJson: payload.pptistSlidesJson,
        aiDeckJson: payload.aiDeckJson,
      }
    }

    const task = this.queueService.getJob(payload.sourceTaskId) as QueueJob<unknown> | null
    const output = task?.status === 'succeeded' ? task.output as { deck?: AIDeck; slides?: unknown[] } | undefined : undefined

    return {
      pptistSlidesJson: output?.slides ?? [],
      aiDeckJson: payload.aiDeckJson ?? output?.deck,
    }
  }
}
