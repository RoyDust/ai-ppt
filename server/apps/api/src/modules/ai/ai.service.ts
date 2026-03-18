import { Injectable, Optional } from '@nestjs/common'
import { QueueService } from '../../../../../libs/queue/src/queue.service'
import { AITasksRepository } from '../../../../../libs/db/src/repositories/ai-tasks.repository'
import { DeckVersionsRepository } from '../../../../../libs/db/src/repositories/deck-versions.repository'
import { DecksRepository } from '../../../../../libs/db/src/repositories/decks.repository'
import { DeckPlanDto } from './dto/deck-plan.dto'
import { DeckRenderDto } from './dto/deck-render.dto'
import { SlideRegenerateDto } from './dto/slide-regenerate.dto'

@Injectable()
export class AiService {
  constructor(
    private readonly queueService: QueueService,
    @Optional() private readonly aiTasksRepository?: AITasksRepository,
    @Optional() private readonly deckVersionsRepository?: DeckVersionsRepository,
    @Optional() private readonly decksRepository?: DecksRepository,
  ) {}

  planDeck(payload: DeckPlanDto) {
    return {
      slides: this.buildSemanticSlides(payload.topic, payload.goalPageCount),
      plannedPageCount: payload.goalPageCount,
    }
  }

  renderDeck(payload: DeckRenderDto & { topic?: string; goalPageCount?: number; language?: string; overwrite?: boolean }) {
    const topic = payload.topic || payload.deckId || 'AI 演示文稿'
    const goalPageCount = payload.goalPageCount || 3
    const language = payload.language || 'zh-CN'
    const deck = {
      id: `deck_${Date.now()}`,
      topic,
      goalPageCount,
      actualPageCount: goalPageCount,
      language,
      outlineSummary: `${topic} 大纲`,
      slides: this.buildSemanticSlides(topic, goalPageCount),
    }
    const slides = this.buildPPTistSlides(topic, goalPageCount)
    return this.queueService.enqueue('deck_render', payload, { deck, slides })
  }

  regenerateSlide(payload: SlideRegenerateDto) {
    return this.queueService.enqueue('slide_regenerate', payload, {
      slide: {
        id: `regen_${Date.now()}`,
        kind: 'content',
        title: '重新生成的页面',
        bullets: ['新的要点预览'],
        regeneratable: true,
      },
    })
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
  }) {
    if (!this.deckVersionsRepository || !this.decksRepository) {
      return {
        id: payload.sourceTaskId,
        sourceType: 'deck_render',
      }
    }

    const version = await this.deckVersionsRepository.createVersion({
      deckId: payload.deckId,
      createdBy: payload.createdBy,
      sourceType: 'deck_render',
      sourceTaskId: payload.sourceTaskId,
      pptistSlidesJson: payload.pptistSlidesJson,
    })
    await this.decksRepository.updateCurrentVersion(payload.deckId, version.id)
    return version
  }

  async acceptSlideRegeneration(payload: {
    deckId: string
    createdBy: string
    sourceTaskId: string
    parentVersionId: string
    pptistSlidesJson: unknown[]
  }) {
    if (!this.deckVersionsRepository || !this.decksRepository) {
      return {
        id: payload.sourceTaskId,
        sourceType: 'slide_regenerate',
      }
    }

    const version = await this.deckVersionsRepository.createVersion({
      deckId: payload.deckId,
      createdBy: payload.createdBy,
      sourceType: 'slide_regenerate',
      sourceTaskId: payload.sourceTaskId,
      parentVersionId: payload.parentVersionId,
      pptistSlidesJson: payload.pptistSlidesJson,
    })
    await this.decksRepository.updateCurrentVersion(payload.deckId, version.id)
    return version
  }

  private buildSemanticSlides(topic: string, count: number) {
    const actualCount = Math.max(3, Math.min(count, 6))
    return Array.from({ length: actualCount }, (_, index) => ({
      id: `ai_slide_${index + 1}`,
      kind: index === 0 ? 'cover' : index === actualCount - 1 ? 'summary' : 'content',
      title: index === 0 ? topic : `${topic} · 第 ${index + 1} 页`,
      bullets: index === 0 ? [] : [`${topic} 关键点 ${index}`, `${topic} 关键点 ${index + 1}`],
      regeneratable: true,
    }))
  }

  private buildPPTistSlides(topic: string, count: number) {
    const actualCount = Math.max(3, Math.min(count, 6))
    return Array.from({ length: actualCount }, (_, index) => ({
      id: `ppt_slide_${index + 1}`,
      elements: [
        {
          id: `text_${index + 1}`,
          type: 'text',
          left: 80,
          top: 60,
          width: 800,
          height: 80,
          rotate: 0,
          content: `<p>${index === 0 ? topic : `${topic} · 第 ${index + 1} 页`}</p>`,
          defaultFontName: 'Microsoft Yahei',
          defaultColor: '#222222',
          textType: 'title',
        },
      ],
      background: {
        type: 'solid',
        color: index === 0 ? '#F5F7FF' : '#FFFFFF',
      },
    }))
  }
}
