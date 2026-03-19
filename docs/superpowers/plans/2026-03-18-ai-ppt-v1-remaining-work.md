# AI PPT v1 Remaining Work Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the unfinished product work after the `feat: scaffold ai ppt v1 flow` merge by replacing placeholder AI behavior with real provider-backed planning/rendering, wiring accepted results into version persistence, and closing the main runtime gaps in the end-to-end flow.

**Architecture:** Keep the existing frontend flow and `src/ai/` boundaries that already landed, but replace the fake backend responses with orchestrator-driven jobs that call a real provider, validate model output, persist task/version metadata, and return deck artifacts the frontend can load without bypassing adapters. Treat the current scaffold as stable seams rather than rewriting it; fill the seams one by one and keep all new behavior behind explicit DTO, schema, repository, and queue boundaries.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vite, Vitest, NestJS, Prisma, PostgreSQL, OpenAI API, local filesystem storage, existing PPTist slide schema and adapter layer

---

## Scope

This plan covers only the work that is still unfinished after commit `a749ea07`.

Already done and out of scope here:
- frontend AI dialog / outline / generating UI shell
- backend Nest workspace, Prisma schema, queue/storage/repository skeletons
- loader and single-slide preview interaction shell
- unit and integration scaffold tests

Still unfinished and covered here:
- real OpenAI provider calls
- real topic decomposition for `plan`
- real deck render and slide regeneration output
- persistence of accepted results in the live API flow
- worker-backed queue execution with Redis/BullMQ
- page-count mismatch between `plannedPageCount` and generated slide count
- end-to-end runtime verification for the actual flow

## Current Constraints

- Current backend behavior is placeholder by design in [ai.service.ts](/Users/roydust/Work/PPTist/server/apps/api/src/modules/ai/ai.service.ts).
- Current provider is a skeleton in [openai.provider.ts](/Users/roydust/Work/PPTist/server/libs/ai-orchestrator/src/providers/openai.provider.ts).
- Current queue is in-memory and microtask-based in [queue.service.ts](/Users/roydust/Work/PPTist/server/libs/queue/src/queue.service.ts). That is acceptable for an incremental first pass, but the implementation must not assume jobs finish immediately.
- The hard `Math.min(count, 6)` cap is still present in [ai.service.ts](/Users/roydust/Work/PPTist/server/apps/api/src/modules/ai/ai.service.ts). The user previously deferred changing this behavior. Keep that task explicit and gated.
- Canonical `planDeck` API contract for the remaining work: `{ slides, plannedPageCount, deck }`, where `slides` and `plannedPageCount` remain the frontend convenience fields and `deck` is the validated backend source of truth.
- Canonical execution model for the remaining work: `planDeck` remains a synchronous API call so the existing outline review UX can stay intact; `renderDeck` and `regenerateSlide` are asynchronous `ai_task` flows where the API process validates input, creates/persists a task, and enqueues a job; the worker process executes render/regeneration and persists task output/status; the API process serves task polling from persisted task state rather than process-local memory.
- The worktree is not fully clean at planning time: `server/package-lock.json` is modified. Do not overwrite or revert unrelated local changes while executing this plan.

## File Map

**Backend runtime configuration and provider wiring**
- Modify: `server/package.json`
- Modify: `server/apps/api/src/app.module.ts`
- Modify: `server/apps/api/src/main.ts`
- Create: `server/libs/ai-orchestrator/src/providers/openai.client.ts`
- Modify: `server/libs/ai-orchestrator/src/providers/llm-provider.interface.ts`
- Modify: `server/libs/ai-orchestrator/src/providers/openai.provider.ts`
- Create: `server/tests/orchestrator/openai.provider.test.ts`

**Backend planning / rendering / regeneration orchestration**
- Modify: `server/libs/ai-orchestrator/src/planner/deck-planner.service.ts`
- Modify: `server/libs/ai-orchestrator/src/renderer/deck-renderer.service.ts`
- Modify: `server/libs/ai-orchestrator/src/renderer/slide-regenerator.service.ts`
- Modify: `server/apps/api/src/modules/ai/ai.module.ts`
- Modify: `server/apps/api/src/modules/ai/ai.service.ts`
- Create: `server/tests/api/ai.plan.service.test.ts`
- Create: `server/tests/api/ai.render.service.test.ts`
- Create: `server/tests/api/ai.regenerate.service.test.ts`

**Persistence and acceptance flow**
- Modify: `server/apps/api/src/modules/ai/ai.controller.ts`
- Modify: `server/apps/api/src/modules/ai/ai.service.ts`
- Modify: `server/libs/db/src/repositories/decks.repository.ts`
- Modify: `server/libs/db/src/repositories/deck-versions.repository.ts`
- Modify: `server/libs/db/src/repositories/ai-tasks.repository.ts`
- Create: `server/apps/api/src/modules/ai/dto/deck-accept.dto.ts`
- Create: `server/apps/api/src/modules/ai/dto/slide-accept.dto.ts`
- Create: `server/tests/api/ai.acceptance.test.ts`
- Modify: `server/tests/integration/version-persistence.test.ts`

**Worker-backed queue execution**
- Modify: `server/apps/worker/src/worker.module.ts`
- Modify: `server/apps/worker/src/main.ts`
- Modify: `server/libs/queue/src/queue.module.ts`
- Modify: `server/libs/queue/src/queue.service.ts`
- Create: `server/tests/queue/queue.service.test.ts`

**Frontend task consumption and version awareness**
- Modify: `src/ai/types/deck.ts`
- Modify: `src/ai/types/regeneration.ts`
- Modify: `src/ai/services/aiDeck.ts`
- Modify: `src/ai/hooks/useAIDeckGeneration.ts`
- Modify: `src/ai/hooks/useAISlideRegeneration.ts`
- Modify: `src/ai/hooks/useAIDeckLoader.ts`
- Create: `tests/unit/ai/useAIDeckGeneration.runtime.test.ts`
- Create: `tests/unit/ai/useAISlideRegeneration.runtime.test.ts`

**Optional gated page-count alignment**
- Modify: `server/apps/api/src/modules/ai/ai.service.ts`
- Modify: `server/libs/ai-orchestrator/src/planner/page-count.service.ts`
- Modify: `src/ai/components/AIDeckOutlineReview.vue`
- Create: `server/tests/api/ai.page-count.test.ts`

### Task 1: Wire a Real OpenAI Provider Runtime

**Files:**
- Modify: `server/package.json`
- Modify: `server/apps/api/src/app.module.ts`
- Create: `server/libs/ai-orchestrator/src/providers/openai.client.ts`
- Modify: `server/libs/ai-orchestrator/src/providers/llm-provider.interface.ts`
- Modify: `server/libs/ai-orchestrator/src/providers/openai.provider.ts`
- Test: `server/tests/orchestrator/openai.provider.test.ts`

- [ ] **Step 1: Write the failing provider test**

```ts
import { describe, expect, it, vi } from 'vitest'

const responses = {
  create: vi.fn(async () => ({
    output_text: '{"deck":{"id":"deck_1","topic":"冰球入门","goalPageCount":8,"actualPageCount":8,"language":"zh-CN","outlineSummary":"帮助零基础用户理解冰球","slides":[]}}',
  })),
}

vi.mock('openai', () => ({
  default: class OpenAI {
    responses = responses
  },
}))

import { OpenAIProvider } from '../../libs/ai-orchestrator/src/providers/openai.provider'

describe('OpenAIProvider', () => {
  it('requests structured deck planning output from the model', async () => {
    const provider = new OpenAIProvider({ apiKey: 'test-key', model: 'gpt-4.1-mini' })
    const result = await provider.planDeck({
      topic: '冰球入门',
      language: 'zh-CN',
      goalPageCount: 8,
    })

    expect(responses.create).toHaveBeenCalled()
    expect(result.deck.topic).toBe('冰球入门')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run tests/orchestrator/openai.provider.test.ts`
Expected: FAIL with missing `openai` dependency or provider implementation gap.

- [ ] **Step 3: Write minimal implementation**

Implement:
- install and wire the official `openai` SDK in `server/package.json`
- add a tiny `openai.client.ts` wrapper so the provider does not construct SDK state inline
- update `OpenAIProvider` so it:
  - accepts `apiKey`, `baseURL`, and `model`
  - sends a structured prompt for JSON output
  - parses model output
  - validates the parsed payload with existing backend guards before returning
- update `AppModule` wiring so runtime can construct the provider from `process.env`

Do not add provider multiplexing yet. Keep one provider path and make it correct.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run tests/orchestrator/openai.provider.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/package.json server/package-lock.json server/apps/api/src/app.module.ts server/libs/ai-orchestrator/src/providers/openai.client.ts server/libs/ai-orchestrator/src/providers/llm-provider.interface.ts server/libs/ai-orchestrator/src/providers/openai.provider.ts server/tests/orchestrator/openai.provider.test.ts
git commit -m "feat: wire real openai provider runtime"
```

### Task 2: Replace Placeholder Deck Planning With Real Topic Decomposition

**Files:**
- Modify: `server/libs/ai-orchestrator/src/planner/deck-planner.service.ts`
- Modify: `server/apps/api/src/modules/ai/ai.service.ts`
- Modify: `server/libs/ai-schema/src/guards.ts`
- Test: `server/tests/api/ai.plan.service.test.ts`

- [ ] **Step 1: Write the failing planning test**

```ts
import { describe, expect, it, vi } from 'vitest'
import { AiService } from '../../apps/api/src/modules/ai/ai.service'

describe('AiService.planDeck', () => {
  it('returns decomposed beginner-focused slide topics instead of echoing the raw prompt', async () => {
    const planner = {
      plan: vi.fn(async () => ({
        id: 'deck_1',
        topic: '冰球入门',
        goalPageCount: 8,
        actualPageCount: 8,
        language: 'zh-CN',
        outlineSummary: '面向零基础用户介绍冰球比赛',
        slides: [
          { id: 's1', kind: 'cover', title: '认识冰球', bullets: [], regeneratable: true },
          { id: 's2', kind: 'content', title: '比赛怎么开始与结束', bullets: ['开球', '三节制'], regeneratable: true },
        ],
      })),
    }

    const service = new AiService({ enqueue: vi.fn() } as any, undefined, undefined, undefined, planner as any)
    const result = await service.planDeck({
      topic: '帮我做一个介绍冰球的PPT，面向完全没看过比赛的人。',
      goalPageCount: 8,
      language: 'zh-CN',
    })

    expect(result.slides[0].title).toBe('认识冰球')
    expect(result.slides[1].title).not.toContain('帮我做一个介绍冰球的PPT')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run tests/api/ai.plan.service.test.ts`
Expected: FAIL because `AiService.planDeck()` still uses `buildSemanticSlides()`.

- [ ] **Step 3: Write minimal implementation**

Implement:
- a `DeckPlannerService.plan()` entry point that calls the provider and returns validated `AIDeck`
- `AiService.planDeck()` as a thin wrapper that returns `{ deck, slides: deck.slides, plannedPageCount: deck.actualPageCount }`
- strict guard behavior for required slide fields so raw junk output is rejected instead of leaking to the frontend
- safe fallback error handling with actionable API errors when model output is invalid

Do not keep any prompt-echo generation path in `AiService`. Planning is the one synchronous exception in this plan; do not convert it into a queued worker task unless the frontend flow is explicitly redesigned first.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run tests/api/ai.plan.service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/libs/ai-orchestrator/src/planner/deck-planner.service.ts server/apps/api/src/modules/ai/ai.service.ts server/libs/ai-schema/src/guards.ts server/tests/api/ai.plan.service.test.ts
git commit -m "feat: add real ai deck planning flow"
```

### Task 3: Replace Placeholder Render and Regeneration With Real Orchestrated Output

**Files:**
- Modify: `server/libs/ai-orchestrator/src/renderer/deck-renderer.service.ts`
- Modify: `server/libs/ai-orchestrator/src/renderer/slide-regenerator.service.ts`
- Modify: `server/apps/api/src/modules/ai/ai.service.ts`
- Modify: `server/libs/pptist-adapter/src/deck-to-slides.service.ts`
- Modify: `server/libs/pptist-adapter/src/slide-to-pptist.service.ts`
- Test: `server/tests/api/ai.render.service.test.ts`
- Test: `server/tests/api/ai.regenerate.service.test.ts`

- [ ] **Step 1: Write the failing render test**

```ts
import { describe, expect, it, vi } from 'vitest'
import { AiService } from '../../apps/api/src/modules/ai/ai.service'

describe('AiService.renderDeck', () => {
  it('creates and enqueues a render task instead of generating synthetic output inline', async () => {
    const queue = { enqueue: vi.fn(() => ({ id: 'task_1', type: 'deck_render', status: 'queued' })) }
    const tasks = { createTask: vi.fn(async input => input) }
    const service = new AiService(queue as any, tasks as any)
    const task = await service.renderDeck({ topic: '冰球入门', goalPageCount: 8, language: 'zh-CN', overwrite: true } as any)

    expect(tasks.createTask).toHaveBeenCalled()
    expect(queue.enqueue).toHaveBeenCalledWith('deck_render', expect.objectContaining({
      topic: '冰球入门',
    }))
    expect(task.status).toBe('queued')
  })
})
```

- [ ] **Step 2: Write the failing regenerate test**

```ts
import { describe, expect, it, vi } from 'vitest'
import { AiService } from '../../apps/api/src/modules/ai/ai.service'

describe('AiService.regenerateSlide', () => {
  it('creates and enqueues a regeneration task instead of synthesizing preview output inline', async () => {
    const queue = { enqueue: vi.fn(() => ({ id: 'task_2', type: 'slide_regenerate', status: 'queued' })) }
    const tasks = { createTask: vi.fn(async input => input) }
    const service = new AiService(queue as any, tasks as any)
    const task = await service.regenerateSlide({ deckId: 'deck_1', slideId: 'slide_1' } as any)

    expect(tasks.createTask).toHaveBeenCalled()
    expect(queue.enqueue).toHaveBeenCalledWith('slide_regenerate', expect.objectContaining({
      deckId: 'deck_1',
      slideId: 'slide_1',
    }))
    expect(task.status).toBe('queued')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd server && npx vitest run tests/api/ai.render.service.test.ts tests/api/ai.regenerate.service.test.ts`
Expected: FAIL because `AiService` still fabricates render/regeneration output internally.

- [ ] **Step 4: Write minimal implementation**

Implement:
- `DeckRendererService.render()` and `SlideRegeneratorService.regenerate()` as worker-side execution services
- `AiService.renderDeck()` and `AiService.regenerateSlide()` as API-side task creation and enqueue methods only
- shared job payload contracts so the worker can compute output and persist it onto the matching `ai_task`
- task outputs that include enough metadata for the frontend to understand what deck/version they belong to

Do not let API-side service code rely on the current synthetic `buildPPTistSlides()` helpers, and do not precompute task output before enqueueing.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd server && npx vitest run tests/api/ai.render.service.test.ts tests/api/ai.regenerate.service.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/libs/ai-orchestrator/src/renderer/deck-renderer.service.ts server/libs/ai-orchestrator/src/renderer/slide-regenerator.service.ts server/apps/api/src/modules/ai/ai.service.ts server/libs/pptist-adapter/src/deck-to-slides.service.ts server/libs/pptist-adapter/src/slide-to-pptist.service.ts server/tests/api/ai.render.service.test.ts server/tests/api/ai.regenerate.service.test.ts
git commit -m "feat: replace placeholder ai render and regeneration"
```

### Task 4: Persist Accepted Results Through the Live API Flow

**Files:**
- Modify: `server/apps/api/src/modules/ai/ai.controller.ts`
- Create: `server/apps/api/src/modules/ai/dto/deck-accept.dto.ts`
- Create: `server/apps/api/src/modules/ai/dto/slide-accept.dto.ts`
- Modify: `server/apps/api/src/modules/ai/ai.service.ts`
- Modify: `server/libs/db/src/repositories/decks.repository.ts`
- Modify: `server/libs/db/src/repositories/deck-versions.repository.ts`
- Modify: `server/libs/db/src/repositories/ai-tasks.repository.ts`
- Modify: `server/tests/integration/version-persistence.test.ts`
- Test: `server/tests/api/ai.acceptance.test.ts`

- [ ] **Step 1: Write the failing acceptance API test**

```ts
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('ai acceptance api surface', () => {
  it('defines endpoints for accepting deck renders and slide regenerations', () => {
    const controller = fs.readFileSync('apps/api/src/modules/ai/ai.controller.ts', 'utf8')
    expect(controller).toContain("@Post('deck/accept')")
    expect(controller).toContain("@Post('slide/accept')")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run tests/api/ai.acceptance.test.ts`
Expected: FAIL because acceptance endpoints do not exist.

- [ ] **Step 3: Replace the current repository-only persistence with API-wired acceptance**

Implement:
- `POST /ai/deck/accept` to persist a rendered deck as a new current `deck_version`
- `POST /ai/slide/accept` to persist a regeneration result as a child `deck_version`
- repository methods for storing provider/model/input/output metadata on `ai_tasks`
- updates to the integration test so it verifies the live acceptance methods, not only direct service helpers

The persistence API must be the path used by the frontend after the user confirms load/replace.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd server && npx vitest run tests/api/ai.acceptance.test.ts tests/integration/version-persistence.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/apps/api/src/modules/ai/ai.controller.ts server/apps/api/src/modules/ai/dto/deck-accept.dto.ts server/apps/api/src/modules/ai/dto/slide-accept.dto.ts server/apps/api/src/modules/ai/ai.service.ts server/libs/db/src/repositories/decks.repository.ts server/libs/db/src/repositories/deck-versions.repository.ts server/libs/db/src/repositories/ai-tasks.repository.ts server/tests/api/ai.acceptance.test.ts server/tests/integration/version-persistence.test.ts
git commit -m "feat: persist accepted ai results through api flow"
```

### Task 5: Make the Frontend Consume Acceptance and Version Metadata

**Files:**
- Modify: `src/ai/types/deck.ts`
- Modify: `src/ai/types/regeneration.ts`
- Modify: `src/ai/services/aiDeck.ts`
- Modify: `src/ai/hooks/useAIDeckGeneration.ts`
- Modify: `src/ai/hooks/useAISlideRegeneration.ts`
- Modify: `src/ai/hooks/useAIDeckLoader.ts`
- Test: `tests/unit/ai/useAIDeckGeneration.runtime.test.ts`
- Test: `tests/unit/ai/useAISlideRegeneration.runtime.test.ts`

- [ ] **Step 1: Write the failing full-deck runtime test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/ai/services/aiDeck', () => ({
  planDeck: vi.fn(async () => ({ deck: { id: 'deck_1', goalPageCount: 8, actualPageCount: 8, slides: [] }, slides: [], plannedPageCount: 8 })),
  renderDeck: vi.fn(async () => ({ id: 'task_1', status: 'queued' })),
  getAITask: vi.fn(async () => ({
    id: 'task_1',
    status: 'succeeded',
    output: {
      deck: { id: 'deck_1', currentVersionId: 'version_1', slides: [] },
      slides: [{ id: 'ppt_1', elements: [], background: { type: 'solid', color: '#fff' } }],
    },
  })),
  acceptRenderedDeck: vi.fn(async () => ({ deckId: 'deck_1', currentVersionId: 'version_1' })),
}))

describe('useAIDeckGeneration runtime flow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('accepts the rendered result after loading slides into the editor', async () => {
    const { default: useAIDeckGeneration } = await import('@/ai/hooks/useAIDeckGeneration')
    const generation = useAIDeckGeneration()
    await generation.createPlan({ topic: '冰球入门', goalPageCount: 8, language: 'zh-CN' })
    await generation.renderPlannedDeck()
    expect((await import('@/ai/services/aiDeck')).acceptRenderedDeck).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Write the failing slide runtime test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/ai/services/aiDeck', () => ({
  regenerateSlide: vi.fn(async () => ({ id: 'task_2', status: 'queued' })),
  getAITask: vi.fn(async () => ({
    id: 'task_2',
    status: 'succeeded',
    output: {
      slide: { id: 'regen_1', kind: 'content', title: '冰球站位', bullets: ['中锋'], regeneratable: true },
      preview: { id: 'ppt_regen_1', elements: [], background: { type: 'solid', color: '#fff' } },
    },
  })),
  acceptRegeneratedSlide: vi.fn(async () => ({ deckId: 'deck_1', currentVersionId: 'version_2' })),
}))

describe('useAISlideRegeneration runtime flow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('accepts the chosen preview action through the backend api', async () => {
    const { default: useAISlideRegeneration } = await import('@/ai/hooks/useAISlideRegeneration')
    const regeneration = useAISlideRegeneration()
    await regeneration.regenerateCurrentSlide({ deckId: 'deck_1', slideId: 'slide_1' } as any)
    await regeneration.acceptPreview('replace')
    expect((await import('@/ai/services/aiDeck')).acceptRegeneratedSlide).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test -- tests/unit/ai/useAIDeckGeneration.runtime.test.ts tests/unit/ai/useAISlideRegeneration.runtime.test.ts`
Expected: FAIL because the frontend has no acceptance API calls or version metadata handling.

- [ ] **Step 4: Write minimal implementation**

Implement:
- frontend service calls for deck acceptance and slide acceptance
- runtime metadata types for `currentVersionId`, task ids, and accepted version ids
- hook updates so successful render/regeneration is not considered complete until acceptance succeeds
- loader updates so the editor can retain returned deck/version metadata for later operations

Do not let the frontend invent version ids locally.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- tests/unit/ai/useAIDeckGeneration.runtime.test.ts tests/unit/ai/useAISlideRegeneration.runtime.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/ai/types/deck.ts src/ai/types/regeneration.ts src/ai/services/aiDeck.ts src/ai/hooks/useAIDeckGeneration.ts src/ai/hooks/useAISlideRegeneration.ts src/ai/hooks/useAIDeckLoader.ts tests/unit/ai/useAIDeckGeneration.runtime.test.ts tests/unit/ai/useAISlideRegeneration.runtime.test.ts
git commit -m "feat: wire frontend ai acceptance and version metadata"
```

### Task 6: Align Planned Page Count and Generated Slide Count

**Files:**
- Modify: `server/apps/api/src/modules/ai/ai.service.ts`
- Modify: `server/libs/ai-orchestrator/src/planner/page-count.service.ts`
- Modify: `src/ai/components/AIDeckOutlineReview.vue`
- Test: `server/tests/api/ai.page-count.test.ts`

- [ ] **Step 1: Confirm product decision before implementation**

Decision gate:
- previous conversation explicitly deferred changing the hard 6-page cap
- default rule for this plan: treat this as a follow-up task that is not required for closing Tasks 1-5 and 7-8
- only execute this task after explicit product confirmation; otherwise leave the current cap in place and record it as an accepted limitation in the final verification notes

- [ ] **Step 2: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { AiService } from '../../apps/api/src/modules/ai/ai.service'

describe('AiService page count alignment', () => {
  it('returns the same actual slide count that it reports in plannedPageCount for approved ranges', async () => {
    const service = new AiService({ enqueue: () => ({}) } as any)
    const result = await service.planDeck({
      topic: '冰球入门',
      goalPageCount: 10,
      language: 'zh-CN',
    } as any)

    expect(result.plannedPageCount).toBe(10)
    expect(result.slides).toHaveLength(10)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd server && npx vitest run tests/api/ai.page-count.test.ts`
Expected: FAIL because output is still capped to 6.

- [ ] **Step 4: Write minimal implementation**

Implement:
- one canonical page-count clamp policy in `page-count.service.ts`
- planner and renderer behavior that both use the same clamp result
- outline UI copy that displays the actual agreed count rather than a misleading requested count

Keep any upper bound explicit and shared in one place.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npx vitest run tests/api/ai.page-count.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/apps/api/src/modules/ai/ai.service.ts server/libs/ai-orchestrator/src/planner/page-count.service.ts src/ai/components/AIDeckOutlineReview.vue server/tests/api/ai.page-count.test.ts
git commit -m "fix: align ai planned page count with generated slides"
```

### Task 7: Replace the In-Memory Queue With Worker-Backed Execution

**Files:**
- Modify: `server/package.json`
- Modify: `server/apps/api/src/app.module.ts`
- Modify: `server/apps/api/src/modules/ai/ai.service.ts`
- Modify: `server/apps/worker/src/worker.module.ts`
- Modify: `server/apps/worker/src/main.ts`
- Modify: `server/libs/queue/src/queue.module.ts`
- Modify: `server/libs/queue/src/queue.service.ts`
- Modify: `server/libs/db/src/repositories/ai-tasks.repository.ts`
- Test: `server/tests/queue/queue.service.test.ts`

- [ ] **Step 1: Write the failing queue test**

```ts
import { describe, expect, it } from 'vitest'
import fs from 'node:fs'

describe('queue runtime', () => {
  it('uses bullmq-backed queue plumbing instead of only an in-memory map', () => {
    const source = fs.readFileSync('libs/queue/src/queue.service.ts', 'utf8')
    expect(source).toContain('BullMQ')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run tests/queue/queue.service.test.ts`
Expected: FAIL because the queue service is still in-memory only.

- [ ] **Step 3: Write minimal implementation**

Implement:
- Redis/BullMQ dependencies and config in `server/package.json`
- queue module wiring that can enqueue from the API process and consume from the worker process
- task status lookup that still supports `GET /ai/tasks/:id` by reading persisted `ai_tasks` state rather than process-local memory
- worker bootstrap that registers processors for deck render and slide regeneration jobs
- repository methods that let the worker transition tasks through `queued -> running -> succeeded|failed` and persist output/error payloads
- API-side `AiService.getTask()` updates so frontend polling works cross-process

Keep the job payloads aligned with Tasks 3-5. Do not redesign task contracts here.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run tests/queue/queue.service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/package.json server/package-lock.json server/apps/api/src/app.module.ts server/apps/api/src/modules/ai/ai.service.ts server/apps/worker/src/worker.module.ts server/apps/worker/src/main.ts server/libs/queue/src/queue.module.ts server/libs/queue/src/queue.service.ts server/libs/db/src/repositories/ai-tasks.repository.ts server/tests/queue/queue.service.test.ts
git commit -m "feat: add worker-backed ai queue execution"
```

### Task 8: Full Verification and Runtime Check

**Files:**
- Modify: `docs/superpowers/plans/2026-03-18-ai-ppt-v1-remaining-work.md`

- [ ] **Step 1: Run frontend automated verification**

Run: `npm run test`
Expected: PASS

- [ ] **Step 2: Run frontend type and build verification**

Run: `npm run type-check`
Expected: PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Run backend automated verification**

Run: `cd server && npm run test`
Expected: PASS

Run: `cd server && npm run build`
Expected: PASS

- [ ] **Step 4: Run live frontend and backend**

Run: `npm run dev`
Expected: Vite dev server starts on `127.0.0.1:5173`

Run: `cd server && npm run dev:api`
Expected: API server starts and accepts `/api/ai/*` requests through the Vite proxy

Run: `cd server && npm run dev:worker`
Expected: worker process starts and consumes queued AI jobs

- [ ] **Step 5: Manually verify the complete deck flow**

Verify:
- `POST /api/ai/deck/plan` returns decomposed outline content rather than raw prompt echo
- `POST /api/ai/deck/render` creates a task that is picked up by the worker and eventually yields real deck/slides output
- successful generation loads slides into the editor and then records acceptance/version metadata
- no 500 error occurs in the normal planning/rendering path

- [ ] **Step 6: Manually verify the regeneration flow**

Verify:
- thumbnail `重新生成此页` opens preview flow
- regeneration returns preview content that differs meaningfully from the input slide
- choosing replace or insert calls acceptance API and updates version metadata

- [ ] **Step 7: Manually verify persistence and export**

Verify:
- accepted generation creates a new current `deck_version`
- accepted regeneration creates a child `deck_version`
- `ai_tasks` records provider/model/input/output/error metadata
- generated deck still exports through the existing export dialog

- [ ] **Step 8: Commit final verification note**

```bash
git add docs/superpowers/plans/2026-03-18-ai-ppt-v1-remaining-work.md
git commit -m "docs: record ai ppt v1 remaining-work verification"
```

## Notes for the Implementer

- Do not replace working frontend seams with direct editor mutations. Keep the existing `src/ai/` boundaries.
- Do not leave fake fallback generation in `AiService` once provider-backed paths exist. Failure should surface as an error, not silently degrade into junk slides.
- Do not treat `currentTask.output` as implicitly accepted. Acceptance must be explicit and persistent.
- Keep prompt text and output contracts inside orchestrator/provider code, not controller code.
- Keep one execution model throughout: API creates and polls tasks, worker computes task output, repositories persist task state.
- Keep planning synchronous and keep render/regeneration asynchronous; do not blur those contracts mid-implementation.
- The page-count alignment task is intentionally gated because it was previously deferred by the user.
