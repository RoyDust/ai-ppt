# Parallel Batched AI PPT Render Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace single-request AI deck render with parallel batched render orchestration that preserves successful batches, retries failed batches, and merges final results into one deck task.

**Architecture:** Keep the existing user-facing render entrypoint and parent task polling contract, but move render execution into `DeckRendererService` as a batch orchestrator. Add a batch-oriented provider contract, mutable task progress updates in the queue/task layer, dynamic concurrency selection, retry-with-degradation for failed batches, and final ordered merge before PPTist conversion.

**Tech Stack:** NestJS, TypeScript, Vitest, Vue 3, Pinia, existing AI orchestrator/provider/queue layers

---

## File Map

**Batch render orchestration**
- Modify: `server/libs/ai-orchestrator/src/renderer/deck-renderer.service.ts`
- Create: `server/libs/ai-orchestrator/src/renderer/render-batch.types.ts`
- Create: `server/libs/ai-orchestrator/src/renderer/render-batch.utils.ts`
- Create: `server/tests/orchestrator/deck-renderer.service.test.ts`

**Provider batch render contract**
- Modify: `server/libs/ai-orchestrator/src/providers/llm-provider.interface.ts`
- Modify: `server/libs/ai-orchestrator/src/providers/openai.provider.ts`
- Create: `server/tests/orchestrator/openai.render-batch.test.ts`

**Task progress and queue state**
- Modify: `server/libs/queue/src/queue.service.ts`
- Modify: `server/apps/api/src/modules/ai/ai.service.ts`
- Modify: `server/libs/db/src/repositories/ai-tasks.repository.ts`
- Create: `server/tests/api/ai.render.service.test.ts`
- Create: `server/tests/queue/queue.service.test.ts`

**Frontend task consumption**
- Modify: `src/ai/stores/aiTasks.ts`
- Modify: `src/ai/hooks/useAIDeckGeneration.ts`
- Create: `tests/unit/ai/taskPolling.batched-render.test.ts`

### Task 1: Define batch render contracts and splitting rules

**Files:**
- Create: `server/libs/ai-orchestrator/src/renderer/render-batch.types.ts`
- Create: `server/libs/ai-orchestrator/src/renderer/render-batch.utils.ts`
- Modify: `server/libs/ai-orchestrator/src/providers/llm-provider.interface.ts`
- Test: `server/tests/orchestrator/deck-renderer.service.test.ts`

- [ ] **Step 1: Write the failing tests for batch splitting and concurrency selection**

```ts
import { describe, expect, it } from 'vitest'
import { buildRenderBatches, selectRenderConcurrency } from '../../libs/ai-orchestrator/src/renderer/render-batch.utils'

describe('render batch utils', () => {
  it('splits a 10-slide deck into contiguous batches', () => {
    const deck = {
      slides: Array.from({ length: 10 }, (_, index) => ({ id: `s${index + 1}`, title: `Slide ${index + 1}` })),
    } as any

    const batches = buildRenderBatches(deck)
    expect(batches.length).toBeGreaterThan(1)
    expect(batches[0]?.slides[0]?.id).toBe('s1')
    expect(batches.at(-1)?.slides.at(-1)?.id).toBe('s10')
  })

  it('caps dynamic concurrency at four workers', () => {
    expect(selectRenderConcurrency(1)).toBe(1)
    expect(selectRenderConcurrency(3)).toBe(2)
    expect(selectRenderConcurrency(5)).toBe(3)
    expect(selectRenderConcurrency(9)).toBe(4)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run tests/orchestrator/deck-renderer.service.test.ts -v`
Expected: FAIL because batch utility modules do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Implement:
- `RenderBatch` and `RenderBatchResult` types
- `buildRenderBatches(deck)` using a predictable contiguous chunk size of 2-4 slides
- `buildSharedRenderContext(deck, batchIndex)` that keeps only compact global context
- `selectRenderConcurrency(batchCount)` with a hard cap of `4`

Do not add semantic regrouping or adaptive chunk sizing yet.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run tests/orchestrator/deck-renderer.service.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/libs/ai-orchestrator/src/renderer/render-batch.types.ts server/libs/ai-orchestrator/src/renderer/render-batch.utils.ts server/libs/ai-orchestrator/src/providers/llm-provider.interface.ts server/tests/orchestrator/deck-renderer.service.test.ts
git commit -m "feat: add batch render contracts"
```

### Task 2: Add provider-level batch render support

**Files:**
- Modify: `server/libs/ai-orchestrator/src/providers/llm-provider.interface.ts`
- Modify: `server/libs/ai-orchestrator/src/providers/openai.provider.ts`
- Test: `server/tests/orchestrator/openai.render-batch.test.ts`

- [ ] **Step 1: Write the failing provider batch-render test**

```ts
import { describe, expect, it, vi } from 'vitest'
import { OpenAIProvider } from '../../libs/ai-orchestrator/src/providers/openai.provider'

describe('OpenAIProvider.renderDeckBatch', () => {
  it('sends shared context and only batch slides to the model', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"slides":[{"id":"s1","kind":"content","title":"Rendered","bullets":[]}]}' } }],
      }),
    }))

    const provider = new OpenAIProvider({ apiKey: 'test', fetchImpl: fetchImpl as any })
    await provider.renderDeckBatch({
      sharedContext: { topic: 'Topic', outlineSummary: 'Summary' },
      batchIndex: 0,
      batchCount: 2,
      slides: [{ id: 's1', kind: 'content', title: 'Raw', bullets: [] }] as any,
    })

    const body = JSON.parse(fetchImpl.mock.calls[0][1].body)
    const userMessage = body.messages[2].content as string
    expect(userMessage).toContain('"slides"')
    expect(userMessage).not.toContain('"actualPageCount":12')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run tests/orchestrator/openai.render-batch.test.ts -v`
Expected: FAIL because `renderDeckBatch` does not exist.

- [ ] **Step 3: Write minimal implementation**

Implement:
- `renderDeckBatch(input)` on the provider interface
- OpenAI batch render prompt that consumes compact shared context plus only the current batch slides
- batch-level normalization that returns rendered slides only
- error classification helper for timeout, 429, 5xx, and invalid model output

Do not remove the existing full-deck render method until the orchestrator migration is complete.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run tests/orchestrator/openai.render-batch.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/libs/ai-orchestrator/src/providers/llm-provider.interface.ts server/libs/ai-orchestrator/src/providers/openai.provider.ts server/tests/orchestrator/openai.render-batch.test.ts
git commit -m "feat: add ai deck batch render provider"
```

### Task 3: Implement parallel batch orchestration with retry and merge

**Files:**
- Modify: `server/libs/ai-orchestrator/src/renderer/deck-renderer.service.ts`
- Modify: `server/libs/ai-orchestrator/src/renderer/render-batch.utils.ts`
- Test: `server/tests/orchestrator/deck-renderer.service.test.ts`

- [ ] **Step 1: Write the failing orchestration tests**

```ts
import { describe, expect, it, vi } from 'vitest'
import { DeckRendererService } from '../../libs/ai-orchestrator/src/renderer/deck-renderer.service'

describe('DeckRendererService', () => {
  it('retries only failed batches and preserves successful outputs', async () => {
    const renderDeckBatch = vi
      .fn()
      .mockResolvedValueOnce({ slides: [{ id: 's1', title: 'ok-1' }] })
      .mockRejectedValueOnce(new Error('429'))
      .mockResolvedValueOnce({ slides: [{ id: 's2', title: 'ok-2-retry' }] })

    const service = new DeckRendererService({ renderDeckBatch } as any, { convert: vi.fn(() => []) } as any)
    const result = await service.render({
      id: 'deck_1',
      topic: 'Topic',
      goalPageCount: 4,
      actualPageCount: 4,
      language: 'zh-CN',
      outlineSummary: 'Summary',
      slides: [
        { id: 's1', kind: 'content', title: '1', bullets: [] },
        { id: 's2', kind: 'content', title: '2', bullets: [] },
      ],
    } as any)

    expect(renderDeckBatch).toHaveBeenCalledTimes(3)
    expect(result.deck.slides[0].title).toBe('ok-1')
    expect(result.deck.slides[1].title).toBe('ok-2-retry')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run tests/orchestrator/deck-renderer.service.test.ts -v`
Expected: FAIL because render orchestration is still single-call.

- [ ] **Step 3: Write minimal implementation**

Implement in `DeckRendererService`:
- build batches from the incoming deck
- execute with dynamic concurrency
- retry failed batches up to two additional attempts
- degrade failed batches by shrinking shared context and, if needed, splitting a failed batch once
- merge rendered batch slides back into original order
- convert the merged deck to PPTist slides only after merge

Keep orchestration logic in focused helper functions. Avoid putting all logic into one large method.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run tests/orchestrator/deck-renderer.service.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/libs/ai-orchestrator/src/renderer/deck-renderer.service.ts server/libs/ai-orchestrator/src/renderer/render-batch.utils.ts server/tests/orchestrator/deck-renderer.service.test.ts
git commit -m "feat: orchestrate parallel deck render batches"
```

### Task 4: Extend queue and API task tracking for progress and partial success

**Files:**
- Modify: `server/libs/queue/src/queue.service.ts`
- Modify: `server/apps/api/src/modules/ai/ai.service.ts`
- Modify: `server/libs/db/src/repositories/ai-tasks.repository.ts`
- Test: `server/tests/queue/queue.service.test.ts`
- Test: `server/tests/api/ai.render.service.test.ts`

- [ ] **Step 1: Write the failing queue and API tests**

```ts
import { describe, expect, it } from 'vitest'
import { QueueService } from '../../libs/queue/src/queue.service'

describe('QueueService', () => {
  it('tracks running progress and partial success metadata', async () => {
    const queue = new QueueService()
    const job = queue.enqueueAsync('deck_render', { deckId: 'd1' }, async (ctx: any) => {
      ctx.updateProgress({ totalBatches: 3, completedBatches: 1 })
      return { ok: true }
    })

    await new Promise(resolve => setTimeout(resolve, 0))
    const stored = queue.getJob(job.id)
    expect(stored?.status).toBe('succeeded')
    expect(stored?.progress?.completedBatches).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx vitest run tests/queue/queue.service.test.ts tests/api/ai.render.service.test.ts -v`
Expected: FAIL because queue jobs do not support progress updates.

- [ ] **Step 3: Write minimal implementation**

Implement:
- richer queue job shape with `running`, `partial_success`, `progress`, and structured `error`
- `enqueueAsync` runner context with `updateProgress`
- `AiService.renderDeck()` wiring that records and returns the parent job id only
- repository write helpers for storing progress/output metadata when available

Do not expose child batches as separate public API tasks in this first pass.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx vitest run tests/queue/queue.service.test.ts tests/api/ai.render.service.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/libs/queue/src/queue.service.ts server/apps/api/src/modules/ai/ai.service.ts server/libs/db/src/repositories/ai-tasks.repository.ts server/tests/queue/queue.service.test.ts server/tests/api/ai.render.service.test.ts
git commit -m "feat: track batched render task progress"
```

### Task 5: Surface batched render progress on the frontend

**Files:**
- Modify: `src/ai/stores/aiTasks.ts`
- Modify: `src/ai/hooks/useAIDeckGeneration.ts`
- Test: `tests/unit/ai/taskPolling.batched-render.test.ts`

- [ ] **Step 1: Write the failing frontend polling test**

```ts
import { describe, expect, it } from 'vitest'
import { useAITasksStore } from '@/ai/stores/aiTasks'

describe('ai task store batched render state', () => {
  it('stores aggregate batch progress from the parent render task', () => {
    const store = useAITasksStore()
    store.setRenderProgress({ totalBatches: 4, completedBatches: 2, failedBatches: 0, retryingBatches: 1 })
    expect(store.renderProgress.completedBatches).toBe(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/unit/ai/taskPolling.batched-render.test.ts`
Expected: FAIL because render progress state does not exist.

- [ ] **Step 3: Write minimal implementation**

Implement:
- render progress state in the Pinia store
- polling hook updates from parent task progress metadata
- terminal handling for `partial_success`

Do not redesign the modal or add per-batch UI cards in this phase.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/unit/ai/taskPolling.batched-render.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ai/stores/aiTasks.ts src/ai/hooks/useAIDeckGeneration.ts tests/unit/ai/taskPolling.batched-render.test.ts
git commit -m "feat: show batched render progress"
```

### Task 6: Verify end-to-end batched render behavior

**Files:**
- Modify: none unless fixes are required

- [ ] **Step 1: Run targeted server tests**

Run:

```bash
cd server && npx vitest run \
  tests/orchestrator/deck-renderer.service.test.ts \
  tests/orchestrator/openai.render-batch.test.ts \
  tests/queue/queue.service.test.ts \
  tests/api/ai.render.service.test.ts
```

Expected: PASS

- [ ] **Step 2: Run targeted frontend tests**

Run:

```bash
npx vitest run tests/unit/ai/taskPolling.batched-render.test.ts
```

Expected: PASS

- [ ] **Step 3: Run type checks**

Run:

```bash
npm run type-check
cd server && npx tsc --noEmit
```

Expected: PASS

- [ ] **Step 4: Run relevant builds if available**

Run:

```bash
npm run build
cd server && npm run build
```

Expected: PASS

- [ ] **Step 5: Commit final verification fixes if needed**

```bash
git add <files changed during verification>
git commit -m "test: verify batched ai deck render flow"
```
