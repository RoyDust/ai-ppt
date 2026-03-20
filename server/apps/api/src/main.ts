import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

const bodyParser = require('body-parser')

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.use(bodyParser.json({ limit: '20mb' }))
  app.use(bodyParser.urlencoded({ extended: true, limit: '20mb' }))
  const port = Number(process.env.PORT || 3001)
  await app.listen(port)
}

void bootstrap()
