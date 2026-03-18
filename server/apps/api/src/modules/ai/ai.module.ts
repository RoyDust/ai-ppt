import { Module } from '@nestjs/common'
import { QueueModule } from '../../../../../libs/queue/src/queue.module'
import { AiController } from './ai.controller'
import { AiService } from './ai.service'

@Module({
  imports: [QueueModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
