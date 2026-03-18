import { Module } from '@nestjs/common'
import { AiModule } from './modules/ai/ai.module'

@Module({
  imports: [AiModule],
})
export class AppModule {}
