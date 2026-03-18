import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { AiService } from './ai.service'
import { DeckPlanDto } from './dto/deck-plan.dto'
import { DeckRenderDto } from './dto/deck-render.dto'
import { SlideRegenerateDto } from './dto/slide-regenerate.dto'

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('deck/plan')
  planDeck(@Body() payload: DeckPlanDto) {
    return this.aiService.planDeck(payload)
  }

  @Post('deck/render')
  renderDeck(@Body() payload: DeckRenderDto) {
    return this.aiService.renderDeck(payload)
  }

  @Post('slide/regenerate')
  regenerateSlide(@Body() payload: SlideRegenerateDto) {
    return this.aiService.regenerateSlide(payload)
  }

  @Get('tasks/:id')
  getTask(@Param('id') taskId: string) {
    return this.aiService.getTask(taskId)
  }
}
