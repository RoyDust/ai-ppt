import { Module } from '@nestjs/common'
import { QueueModule } from '../../../../../libs/queue/src/queue.module'
import { PrismaService } from '../../../../../libs/db/src/prisma.service'
import { AITasksRepository } from '../../../../../libs/db/src/repositories/ai-tasks.repository'
import { DeckVersionsRepository } from '../../../../../libs/db/src/repositories/deck-versions.repository'
import { DecksRepository } from '../../../../../libs/db/src/repositories/decks.repository'
import { OpenAIProvider } from '../../../../../libs/ai-orchestrator/src/providers/openai.provider'
import { DeckPlannerService } from '../../../../../libs/ai-orchestrator/src/planner/deck-planner.service'
import { DeckRendererService } from '../../../../../libs/ai-orchestrator/src/renderer/deck-renderer.service'
import { SlideRegeneratorService } from '../../../../../libs/ai-orchestrator/src/renderer/slide-regenerator.service'
import { AiController } from './ai.controller'
import { AiService } from './ai.service'

@Module({
  imports: [QueueModule],
  controllers: [AiController],
  providers: [
    PrismaService,
    AiService,
    {
      provide: AITasksRepository,
      useFactory: (prisma: PrismaService) => new AITasksRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: DeckVersionsRepository,
      useFactory: (prisma: PrismaService) => new DeckVersionsRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: DecksRepository,
      useFactory: (prisma: PrismaService) => new DecksRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: OpenAIProvider,
      useFactory: () => new OpenAIProvider(),
    },
    {
      provide: DeckPlannerService,
      useFactory: (provider: OpenAIProvider) => new DeckPlannerService(provider),
      inject: [OpenAIProvider],
    },
    {
      provide: DeckRendererService,
      useFactory: (provider: OpenAIProvider) => new DeckRendererService(provider),
      inject: [OpenAIProvider],
    },
    {
      provide: SlideRegeneratorService,
      useFactory: (provider: OpenAIProvider) => new SlideRegeneratorService(provider),
      inject: [OpenAIProvider],
    },
  ],
})
export class AiModule {}
