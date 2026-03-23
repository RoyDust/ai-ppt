import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { AiService } from './ai.service'
import { DeckAcceptDto } from './dto/deck-accept.dto'
import { DeckDetailDto, DeckListItemDto } from './dto/deck-list.dto'
import { DeckPlanDto } from './dto/deck-plan.dto'
import { DeckRenderDto } from './dto/deck-render.dto'
import { SlideAcceptDto } from './dto/slide-accept.dto'
import { SlideRegenerateDto } from './dto/slide-regenerate.dto'

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('deck/plan')
  planDeck(@Body() payload: DeckPlanDto) {
    return this.aiService.planDeck(payload)
  }

  @Get('decks')
  listDecks(
    @Query('userId') userId?: string,
    @Query('projectId') projectId?: string,
  ): Promise<DeckListItemDto[]> {
    return this.aiService.listDecks({ userId, projectId })
  }

  @Get('decks/:deckId')
  getDeck(@Param('deckId') deckId: string): Promise<DeckDetailDto> {
    return this.aiService.getDeck(deckId)
  }

  @Post('deck/render')
  renderDeck(@Body() payload: DeckRenderDto) {
    return this.aiService.renderDeck(payload)
  }

  @Post('slide/render')
  renderSlide(@Body() payload: SlideRegenerateDto) {
    return this.aiService.regenerateSlide(payload)
  }

  @Post('slide/regenerate')
  regenerateSlide(@Body() payload: SlideRegenerateDto) {
    return this.aiService.regenerateSlide(payload)
  }

  @Post('deck/accept')
  acceptDeckRender(@Body() payload: DeckAcceptDto) {
    return this.aiService.acceptDeckRender(payload)
  }

  @Post('slide/accept')
  acceptSlideRegeneration(@Body() payload: SlideAcceptDto) {
    return this.aiService.acceptSlideRegeneration(payload)
  }

  @Get('tasks/:id')
  getTask(@Param('id') taskId: string) {
    return this.aiService.getTask(taskId)
  }

  @Post('tasks/:id/retry-failed-batches')
  retryFailedRenderBatches(@Param('id') taskId: string) {
    return this.aiService.retryFailedRenderBatches(taskId)
  }
}
