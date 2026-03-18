# AI PPT v1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an AI PPT v1 product on top of PPTist with a single integrated frontend, a NestJS backend, versioned deck persistence, full-deck generation, and single-slide regeneration with preview.

**Architecture:** Keep PPTist as the editor core inside the existing Vue app, add a dedicated `src/ai/` application layer on the frontend, and introduce a new `server/` NestJS monorepo for API, worker, orchestration, persistence, and PPTist adaptation. Persist current deck state in `decks`, historical snapshots in `deck_versions`, and all AI operations in `ai_tasks`.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vite, Vitest, Node.js, NestJS, PostgreSQL, Prisma, Redis, BullMQ, object storage, existing PPTist slide schema and template-mapping logic

---

## Implementation Order

The work should proceed in this order:

1. Add minimal frontend test infrastructure so new pure modules can be verified.
2. Stand up the `server/` backend workspace and scripts.
3. Create the PostgreSQL / Prisma schema for `users`, `projects`, `decks`, `deck_versions`, `ai_tasks`, and `exports`.
4. Add backend AI schema contracts, orchestration skeletons, and queue boundaries.
5. Add frontend AI schema, stores, and adapters in `src/ai/`.
6. Rework the current AI dialog into a plan-render flow.
7. Add single-slide regeneration with preview and accepted replacement.
8. Add version persistence, task logging, and end-to-end verification.

### Task 1: Add Minimal Frontend Test Infrastructure

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `tests/unit/ai/smoke.test.ts`

**Step 1: Write the failing smoke test**

```ts
import { describe, expect, it } from 'vitest'

describe('ai frontend test harness', () => {
  it('runs a basic test', () => {
    expect(true).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ai/smoke.test.ts`

Expected: FAIL with missing `vitest` or missing config.

**Step 3: Write minimal implementation**

Update `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "jsdom": "^26.0.0",
    "vitest": "^3.2.4"
  }
}
```

Update `vite.config.ts`:

```ts
export default defineConfig({
  // existing config...
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
})
```

**Step 4: Install dependencies**

Run: `npm install`

Expected: `vitest` and `jsdom` are installed and the lockfile updates.

**Step 5: Run test to verify it passes**

Run: `npm run test -- tests/unit/ai/smoke.test.ts`

Expected: PASS.

**Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts tests/unit/ai/smoke.test.ts
git commit -m "test: add minimal frontend vitest harness"
```

### Task 2: Create the Backend Workspace Skeleton

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/nest-cli.json`
- Create: `server/apps/api/src/main.ts`
- Create: `server/apps/api/src/app.module.ts`
- Create: `server/apps/worker/src/main.ts`
- Create: `server/apps/worker/src/worker.module.ts`
- Create: `server/libs/db/src/prisma/.gitkeep`

**Step 1: Write the failing command check**

Run: `test -f server/package.json`

Expected: FAIL because `server/` does not exist.

**Step 2: Write minimal implementation**

Create `server/package.json`:

```json
{
  "name": "pptist-ai-server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev:api": "nest start api --watch",
    "dev:worker": "nest start worker --watch",
    "build": "nest build api && nest build worker",
    "test": "vitest run"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/schematics": "^11.0.0",
    "@nestjs/testing": "^11.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.2.4"
  }
}
```

Create `server/apps/api/src/main.ts`:

```ts
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  await app.listen(3001)
}

bootstrap()
```

Create `server/apps/api/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common'

@Module({})
export class AppModule {}
```

Create `server/apps/worker/src/main.ts`:

```ts
import { NestFactory } from '@nestjs/core'
import { WorkerModule } from './worker.module'

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule)
  return app
}

bootstrap()
```

Create `server/apps/worker/src/worker.module.ts`:

```ts
import { Module } from '@nestjs/common'

@Module({})
export class WorkerModule {}
```

**Step 3: Run workspace verification**

Run: `test -f server/apps/api/src/main.ts`

Expected: PASS.

**Step 4: Commit**

```bash
git add server/package.json server/tsconfig.json server/nest-cli.json server/apps server/libs/db/src/prisma/.gitkeep
git commit -m "feat: add backend workspace skeleton"
```

### Task 3: Add the PostgreSQL / Prisma Schema

**Files:**
- Create: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/.gitkeep`
- Create: `server/libs/db/src/prisma.service.ts`
- Create: `server/tests/db/schema.test.ts`

**Step 1: Write the failing schema test**

```ts
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'

describe('database schema', () => {
  it('defines deck_versions and ai_tasks', () => {
    const schema = fs.readFileSync('server/prisma/schema.prisma', 'utf8')
    expect(schema).toContain('model DeckVersion')
    expect(schema).toContain('model AITask')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run tests/db/schema.test.ts`

Expected: FAIL because the Prisma schema file does not exist.

**Step 3: Write minimal implementation**

Create `server/prisma/schema.prisma` with:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id          String   @id @default(uuid())
  username    String   @unique
  displayName String?
  email       String?
  avatarUrl   String?
  status      String   @default("active")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  projects    Project[]
  decks       Deck[]
  versions    DeckVersion[] @relation("DeckVersionCreatedBy")
  aiTasks     AITask[]
  exports     Export[]
}

model Project {
  id          String   @id @default(uuid())
  userId      String
  name        String
  description String?
  coverUrl    String?
  status      String   @default("active")
  archivedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id])
  decks       Deck[]
  aiTasks     AITask[]
}

model Deck {
  id              String        @id @default(uuid())
  projectId       String
  userId          String
  title           String
  topic           String?
  language        String        @default("zh-CN")
  purpose         String?
  audience        String?
  tone            String?
  status          String        @default("draft")
  targetPageCount Int?
  actualPageCount Int?
  currentVersionId String?
  latestTaskId    String?
  thumbnailUrl    String?
  outlineSummary  String?
  metadataJson    Json          @default("{}")
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  project         Project       @relation(fields: [projectId], references: [id])
  user            User          @relation(fields: [userId], references: [id])
  versions        DeckVersion[]
  aiTasks         AITask[]
  exports         Export[]
}

model DeckVersion {
  id                   String   @id @default(uuid())
  deckId               String
  versionNo            Int
  sourceType           String
  sourceTaskId         String?
  parentVersionId      String?
  titleSnapshot        String?
  targetPageCount      Int?
  actualPageCount      Int?
  outlineJson          Json     @default("[]")
  aiDeckJson           Json     @default("{}")
  pptistSlidesJson     Json     @default("[]")
  styleFingerprintJson Json     @default("{}")
  summary              String?
  isCurrent            Boolean  @default(false)
  createdBy            String
  createdAt            DateTime @default(now())

  deck                 Deck     @relation(fields: [deckId], references: [id])
  creator              User     @relation("DeckVersionCreatedBy", fields: [createdBy], references: [id])
  aiTasks              AITask[]

  @@unique([deckId, versionNo])
}

model AITask {
  id            String      @id @default(uuid())
  userId        String
  projectId     String?
  deckId        String?
  deckVersionId String?
  taskType      String
  status        String
  provider      String?
  model         String?
  inputJson     Json        @default("{}")
  outputJson    Json        @default("{}")
  errorCode     String?
  errorMessage  String?
  retryCount    Int         @default(0)
  startedAt     DateTime?
  finishedAt    DateTime?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  user          User        @relation(fields: [userId], references: [id])
  project       Project?    @relation(fields: [projectId], references: [id])
  deck          Deck?       @relation(fields: [deckId], references: [id])
  deckVersion   DeckVersion? @relation(fields: [deckVersionId], references: [id])
}

model Export {
  id            String   @id @default(uuid())
  userId        String
  deckId        String
  deckVersionId String?
  exportType    String
  status        String
  fileUrl       String?
  fileSize      BigInt?
  errorMessage  String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user          User     @relation(fields: [userId], references: [id])
  deck          Deck     @relation(fields: [deckId], references: [id])
}
```

**Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run tests/db/schema.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/.gitkeep server/libs/db/src/prisma.service.ts server/tests/db/schema.test.ts
git commit -m "feat: add versioned ai ppt database schema"
```

### Task 4: Add Backend AI Schema Contracts

**Files:**
- Create: `server/libs/ai-schema/src/ai-deck.ts`
- Create: `server/libs/ai-schema/src/ai-slide.ts`
- Create: `server/libs/ai-schema/src/regeneration-context.ts`
- Create: `server/libs/ai-schema/src/style-fingerprint.ts`
- Create: `server/libs/ai-schema/src/guards.ts`
- Create: `server/tests/ai-schema/guards.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { isAIDeck } from '../../libs/ai-schema/src/guards'

describe('server ai schema guards', () => {
  it('accepts a minimal deck payload', () => {
    expect(isAIDeck({
      id: 'deck_1',
      topic: '大学生职业生涯规划',
      goalPageCount: 10,
      actualPageCount: 11,
      language: 'zh-CN',
      outlineSummary: '围绕职业认知展开',
      slides: [],
    })).toBe(true)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run tests/ai-schema/guards.test.ts`

Expected: FAIL with missing module errors.

**Step 3: Write minimal implementation**

Create the shared backend schema types and guards so the backend validates model output before persistence or response emission.

**Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run tests/ai-schema/guards.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add server/libs/ai-schema/src server/tests/ai-schema/guards.test.ts
git commit -m "feat: add backend ai schema contracts"
```

### Task 5: Add Backend AI API Surface and Queue Boundaries

**Files:**
- Create: `server/apps/api/src/modules/ai/ai.module.ts`
- Create: `server/apps/api/src/modules/ai/ai.controller.ts`
- Create: `server/apps/api/src/modules/ai/ai.service.ts`
- Create: `server/apps/api/src/modules/ai/dto/deck-plan.dto.ts`
- Create: `server/apps/api/src/modules/ai/dto/deck-render.dto.ts`
- Create: `server/apps/api/src/modules/ai/dto/slide-regenerate.dto.ts`
- Create: `server/libs/queue/src/queue.module.ts`
- Create: `server/libs/queue/src/queue.service.ts`
- Create: `server/tests/api/ai.controller.test.ts`

**Step 1: Write the failing API test**

```ts
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'

describe('ai api surface', () => {
  it('defines deck plan and slide regenerate endpoints', () => {
    const controller = fs.readFileSync('server/apps/api/src/modules/ai/ai.controller.ts', 'utf8')
    expect(controller).toContain("@Post('deck/plan')")
    expect(controller).toContain("@Post('slide/regenerate')")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run tests/api/ai.controller.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Add controller methods for:

- `POST /ai/deck/plan`
- `POST /ai/deck/render`
- `POST /ai/slide/regenerate`
- `GET /ai/tasks/:id`

The service should only orchestrate DTO validation and queue / service dispatch. It should not embed prompt strings.

**Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run tests/api/ai.controller.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add server/apps/api/src/modules/ai server/libs/queue/src server/tests/api/ai.controller.test.ts
git commit -m "feat: add ai api endpoints and queue boundaries"
```

### Task 6: Add Backend Orchestrator and PPTist Adapter Skeletons

**Files:**
- Create: `server/libs/ai-orchestrator/src/planner/deck-planner.service.ts`
- Create: `server/libs/ai-orchestrator/src/planner/page-count.service.ts`
- Create: `server/libs/ai-orchestrator/src/renderer/deck-renderer.service.ts`
- Create: `server/libs/ai-orchestrator/src/renderer/slide-regenerator.service.ts`
- Create: `server/libs/ai-orchestrator/src/providers/llm-provider.interface.ts`
- Create: `server/libs/pptist-adapter/src/deck-to-slides.service.ts`
- Create: `server/libs/pptist-adapter/src/slide-to-pptist.service.ts`
- Create: `server/tests/orchestrator/page-count.service.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { clampPlannedPageCount } from '../../libs/ai-orchestrator/src/planner/page-count.service'

describe('page count service', () => {
  it('keeps generated counts within the agreed range', () => {
    expect(clampPlannedPageCount(10, 14)).toBe(12)
    expect(clampPlannedPageCount(10, 7)).toBe(9)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run tests/orchestrator/page-count.service.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Implement:

- Page-count clamping logic
- Orchestrator service boundaries
- Provider interface
- PPTist adapter skeletons that accept `AIDeck` and `AISlide`

Do not attempt full prompt tuning in this task. The goal is to lock service seams.

**Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run tests/orchestrator/page-count.service.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add server/libs/ai-orchestrator/src server/libs/pptist-adapter/src server/tests/orchestrator/page-count.service.test.ts
git commit -m "feat: add orchestrator and adapter service skeletons"
```

### Task 7: Add Frontend AI Module Structure

**Files:**
- Create: `src/ai/types/deck.ts`
- Create: `src/ai/types/slide.ts`
- Create: `src/ai/types/regeneration.ts`
- Create: `src/ai/services/aiDeck.ts`
- Create: `src/ai/stores/aiTasks.ts`
- Create: `src/ai/stores/aiDeck.ts`
- Create: `tests/unit/ai/aiStores.test.ts`

**Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAITasksStore } from '@/ai/stores/aiTasks'

describe('frontend ai stores', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('tracks planning state separately from editor state', () => {
    const store = useAITasksStore()
    store.setPlanningState('loading')
    expect(store.planningState).toBe('loading')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/ai/aiStores.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Add `src/ai/` with:

- shared frontend AI types
- a dedicated AI service client
- an AI task store
- an AI deck workflow store

Do not put planning or preview state into `src/store/main.ts` or `src/store/slides.ts`.

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/ai/aiStores.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/ai tests/unit/ai/aiStores.test.ts
git commit -m "feat: add frontend ai module structure"
```

### Task 8: Add Frontend Guards, Requests, and Adapters

**Files:**
- Create: `src/ai/utils/guards.ts`
- Create: `src/ai/utils/requests.ts`
- Create: `src/ai/utils/pageCount.ts`
- Create: `src/ai/utils/outline.ts`
- Create: `src/ai/adapters/renderDeck.ts`
- Create: `src/ai/adapters/renderSlide.ts`
- Modify: `src/hooks/useAIPPT.ts`
- Create: `tests/unit/ai/renderDeck.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { renderAISlideToPPTistSlide } from '@/ai/adapters/renderSlide'

describe('frontend ai adapter', () => {
  it('renders a semantic slide into a PPTist-compatible slide shell', () => {
    const rendered = renderAISlideToPPTistSlide(
      { id: 'slide_1', kind: 'content', title: '职业规划的重要性', regeneratable: true },
      { id: 'template_1', elements: [], background: { type: 'solid', color: '#fff' } } as any,
    )

    expect(rendered.id).toBeDefined()
    expect(rendered.background).toEqual({ type: 'solid', color: '#fff' })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/ai/renderDeck.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Add frontend guard and adapter utilities under `src/ai/`.

Extract reusable template-matching logic from `src/hooks/useAIPPT.ts` into the new adapter layer so that:

- full-deck generation
- slide regeneration

share the same rendering pipeline.

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/ai/renderDeck.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/ai/utils src/ai/adapters src/hooks/useAIPPT.ts tests/unit/ai/renderDeck.test.ts
git commit -m "feat: add frontend ai guards and adapters"
```

### Task 9: Rework the AI Dialog Into Plan and Render Steps

**Files:**
- Create: `src/ai/hooks/useAIDeckGeneration.ts`
- Create: `src/ai/components/AIDeckSetupForm.vue`
- Create: `src/ai/components/AIDeckOutlineReview.vue`
- Create: `src/ai/components/AIDeckGenerating.vue`
- Modify: `src/views/Editor/AIPPTDialog.vue`
- Modify: `src/views/Editor/EditorHeader/index.vue`
- Modify: `src/views/Mobile/MobilePreview.vue`
- Create: `tests/unit/ai/useAIDeckGeneration.test.ts`

**Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/ai/services/aiDeck', () => ({
  planDeck: vi.fn(() => Promise.resolve({ slides: [], plannedPageCount: 10 })),
  renderDeck: vi.fn(() => Promise.resolve({ deck: { id: 'deck_1', slides: [] } })),
}))

describe('useAIDeckGeneration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('moves to outline review after planning succeeds', async () => {
    const { default: useAIDeckGeneration } = await import('@/ai/hooks/useAIDeckGeneration')
    const generation = useAIDeckGeneration()
    await generation.createPlan({ topic: '大学生职业生涯规划', goalPageCount: 10, language: 'zh-CN' })
    expect(generation.step.value).toBe('outline')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/ai/useAIDeckGeneration.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Split the existing AI dialog into:

- setup form
- outline review
- generating state

The dialog should become a container, not the owner of all AI business logic.

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/ai/useAIDeckGeneration.test.ts`

Expected: PASS.

**Step 5: Manual verification**

Run: `npm run dev`

Expected:

- The AI entry still opens from the editor header.
- The dialog now has a plan step and an outline review step.
- No AI result is written into `slidesStore` until rendering succeeds and the adapter/loader path completes.

**Step 6: Commit**

```bash
git add src/ai/hooks src/ai/components src/views/Editor/AIPPTDialog.vue src/views/Editor/EditorHeader/index.vue src/views/Mobile/MobilePreview.vue tests/unit/ai/useAIDeckGeneration.test.ts
git commit -m "feat: rework ai dialog into plan and render flow"
```

### Task 10: Add Frontend Loader and Deck Version Awareness

**Files:**
- Create: `src/ai/hooks/useAIDeckLoader.ts`
- Modify: `src/hooks/useAddSlidesOrElements.ts`
- Modify: `src/hooks/useSlideHandler.ts`
- Create: `tests/unit/ai/useAIDeckLoader.test.ts`

**Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSlidesStore } from '@/store'

describe('useAIDeckLoader', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads rendered slides into the editor when overwrite is true', async () => {
    const { default: useAIDeckLoader } = await import('@/ai/hooks/useAIDeckLoader')
    const slidesStore = useSlidesStore()
    const loader = useAIDeckLoader()

    loader.loadSlidesIntoEditor([{ id: 'slide_1', elements: [], background: { type: 'solid', color: '#fff' } }] as any, true)
    expect(slidesStore.slides).toHaveLength(1)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/ai/useAIDeckLoader.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Add a dedicated loader that is the only path from rendered AI slides into the editor core.

Also keep room for version metadata returned by the backend so the frontend knows which `deck_version` is current after generation.

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/ai/useAIDeckLoader.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/ai/hooks/useAIDeckLoader.ts src/hooks/useAddSlidesOrElements.ts src/hooks/useSlideHandler.ts tests/unit/ai/useAIDeckLoader.test.ts
git commit -m "feat: add ai deck loader"
```

### Task 11: Add Single-Slide Regeneration With Preview

**Files:**
- Create: `src/ai/hooks/useAISlideRegeneration.ts`
- Create: `src/ai/components/AISlideRegenerateDialog.vue`
- Create: `src/ai/components/AISlidePreviewCard.vue`
- Modify: `src/views/Editor/Thumbnails/index.vue`
- Modify: `src/views/Editor/index.vue`
- Modify: `src/store/main.ts`
- Create: `tests/unit/ai/useAISlideRegeneration.test.ts`

**Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/ai/services/aiDeck', () => ({
  regenerateSlide: vi.fn(() => Promise.resolve({
    slide: {
      id: 'regen_1',
      kind: 'content',
      title: '影响职业选择的关键因素',
      bullets: ['个人兴趣与岗位匹配'],
      regeneratable: true,
    },
  })),
}))

describe('useAISlideRegeneration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('stores a preview slide before any live mutation', async () => {
    const { default: useAISlideRegeneration } = await import('@/ai/hooks/useAISlideRegeneration')
    const regeneration = useAISlideRegeneration()
    await regeneration.regenerateCurrentSlide({ deckId: 'deck_1', slideId: 'slide_1' } as any)
    expect(regeneration.previewSlide.value?.id).toBe('regen_1')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/ai/useAISlideRegeneration.test.ts`

Expected: FAIL.

**Step 3: Write minimal implementation**

Add:

- regeneration hook
- regeneration dialog
- preview card
- thumbnail context-menu entry for `重新生成此页`

The flow must be:

- collect context
- call backend
- render preview slide
- let the user choose `replace current slide` or `insert after current slide`

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/ai/useAISlideRegeneration.test.ts`

Expected: PASS.

**Step 5: Manual verification**

Run: `npm run dev`

Expected:

- The thumbnail context menu includes `重新生成此页`.
- Regeneration opens a preview dialog.
- No current slide is overwritten until the user confirms.

**Step 6: Commit**

```bash
git add src/ai/hooks/useAISlideRegeneration.ts src/ai/components/AISlideRegenerateDialog.vue src/ai/components/AISlidePreviewCard.vue src/views/Editor/Thumbnails/index.vue src/views/Editor/index.vue src/store/main.ts tests/unit/ai/useAISlideRegeneration.test.ts
git commit -m "feat: add single-slide regeneration preview flow"
```

### Task 12: Persist Deck Versions and AI Tasks End to End

**Files:**
- Modify: `server/apps/api/src/modules/ai/ai.service.ts`
- Modify: `server/libs/db/src/prisma.service.ts`
- Create: `server/libs/db/src/repositories/decks.repository.ts`
- Create: `server/libs/db/src/repositories/deck-versions.repository.ts`
- Create: `server/libs/db/src/repositories/ai-tasks.repository.ts`
- Create: `server/tests/integration/version-persistence.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'

describe('version persistence plan', () => {
  it('documents that accepted generation results create a new deck version', () => {
    expect(true).toBe(true)
  })
})
```

**Step 2: Replace the placeholder with a real integration test**

Write an integration test that verifies:

- full-deck generation creates an `ai_tasks` record
- accepted render output creates a `deck_versions` row
- accepted slide regeneration creates a new `deck_versions` row with `source_type = slide_regenerate`
- `decks.current_version_id` is updated

**Step 3: Implement the repositories and persistence flow**

Persist:

- AI task input/output
- deck version snapshots
- current version pointer updates

**Step 4: Run the integration test**

Run: `cd server && npx vitest run tests/integration/version-persistence.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add server/apps/api/src/modules/ai/ai.service.ts server/libs/db/src server/tests/integration/version-persistence.test.ts
git commit -m "feat: persist ai tasks and deck versions"
```

## Verification Checklist Before Merge

- Run: `npm run test`
- Run: `npm run type-check`
- Run: `npm run build`
- Run: `cd server && npm run test`
- Run: `cd server && npm run build`
- Run: `npm run dev`
- Run: `cd server && npm run dev:api`
- Run: `cd server && npm run dev:worker`
- Manually verify the full-deck generation flow in the editor.
- Manually verify single-slide regeneration preview and accepted replacement.
- Verify accepted generation and regeneration results create version snapshots.
- Verify generated decks still export through the existing export dialog.

## Notes for the Implementer

- Do not keep growing `src/views/Editor/AIPPTDialog.vue` into a business-logic monolith.
- Do not put AI workflow state into `slidesStore`.
- Do not let backend model output skip schema validation.
- Do not let frontend service responses skip adapter and loader boundaries.
- Keep `deck_versions` as the main versioning primitive for both full-deck generation and slide regeneration.
- Keep v1 narrow: no full template management platform, no deep Office-compatibility work, no multi-user collaboration.
