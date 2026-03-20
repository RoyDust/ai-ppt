# AIPPT P0 Parallel Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the three `P0` priorities in a way that supports multi-agent parallel execution: a lightweight PPT management homepage, stronger input governance for AIPPT, and single-slide regeneration without breaking the current main flow.

**Architecture:** Treat `P0` as one product slice with three layers. First, add a durable management surface that can list and reopen generated decks. Second, harden the AIPPT input boundary so `simple` and `research` modes enter the planning pipeline with predictable payloads. Third, extend regeneration from “entire deck” to “single page” while attaching accepted results back to the deck/version chain created by the management surface.

**Tech Stack:** Vue 3, TypeScript, Pinia, Dexie, NestJS, Prisma, Vitest, existing `src/ai/*` and `server/apps/api/src/modules/ai/*` pipeline

---

## Scope

`P0` includes only:

1. Lightweight PPT management homepage
2. Input governance for AIPPT
3. Single-slide regeneration

`P0` explicitly excludes:

1. Full version comparison UI
2. Template marketplace
3. Asset/content platform
4. Cross-deck collaboration
5. Full observability dashboard

---

## Key Implementation Facts

- The frontend currently has no `vue-router`; the correct `P0` shape is a router-less app shell coordinated from `src/App.vue`.
- The editor assumes an already-open deck, so the management homepage must live before `src/views/Editor/index.vue`, not inside it.
- The reliable backend source of truth for the current deck version is `Deck.currentVersionId`, not `DeckVersion.isCurrent`.
- `databaseId` in `src/store/main.ts` is only for Dexie undo history naming and must not be treated as a persistent deck id.
- Reopen/edit flows need one shared `openDeckIntoEditor(...)` path so AI accept, homepage open, deep-link open, and import do not diverge.

---

## Execution Strategy

### Parallelization Principle

- Split work by ownership, not by technical layer names.
- Do not let two agents edit the same core file in the same wave unless one is explicitly blocked on the other.
- Keep shared contracts small and freeze them early in Wave 0.
- Prefer “backend contract first, frontend consumption second” only when a UI is truly blocked. Otherwise run adapter work in parallel against agreed response shapes.

### Recommended Agent Allocation

- **Agent A: Deck Hub / persistence backend**
  Responsibility: deck list, deck detail/open, current-version retrieval, repository/API tests.
- **Agent B: Deck Hub / app-shell frontend**
  Responsibility: homepage shell, entry switching, deck cards/table, open/create actions.
- **Agent C: Input governance**
  Responsibility: `AIDeckSetupForm.vue` validation, examples, payload shaping, component tests.
- **Agent D: Single-slide regeneration**
  Responsibility: regenerate interaction, accept flow, version挂载, targeted frontend/backend tests.

### Shared Coordination Rules

- Freeze response contracts before Wave 1 coding starts.
- Shared file ownership:
  - `src/App.vue`: Agent B primary owner
  - `src/store/snapshot.ts`: Agent B primary owner if reset/init API is needed for multi-deck open
  - `src/ai/types/deck.ts`: Agent A and Agent C must coordinate; one PR/commit at a time
  - `server/apps/api/src/modules/ai/ai.service.ts`: Agent A primary owner, Agent D follows Agent A’s contract
  - `src/ai/hooks/useAIDeckGeneration.ts`: Agent C primary owner, Agent D only touches regeneration-specific sections after rebasing
- Each agent must finish with targeted tests for owned files before handoff.

---

## Contract Freeze

Before parallel implementation, align on these minimum contracts:

### Deck Hub Contract

- `GET /api/ai/decks`
  - returns paged or capped list of decks for the current default user/project
- `GET /api/ai/decks/:deckId`
  - returns deck meta plus embedded current version meta and current `pptistSlidesJson`
- `POST /api/ai/decks/:deckId/archive` or `DELETE /api/ai/decks/:deckId`
  - optional in `P0`, can degrade to local UI placeholder if backend not ready

List response should include only compact fields:

- `id`
- `title`
- `status`
- `thumbnailUrl`
- `updatedAt`
- `actualPageCount`
- `currentVersionId`

Detail/open response should include:

- deck summary fields
- current version `id`
- `versionNo`
- `pptistSlidesJson`
- optional `aiDeckJson`, `titleSnapshot`, `actualPageCount`

### Input Governance Contract

- `DeckPlanInput` and `DeckRenderInput` must continue to support:
  - `inputMode: 'simple' | 'research'`
  - normalized `researchInput`
  - clean `goalPageCount`
  - validation-safe text blocks and arrays

### Single-Slide Regeneration Contract

- `POST /api/ai/deck/slide/regenerate`
  - accepts `deckId`, `slideId`, `instructions`
- `POST /api/ai/deck/slide/accept`
  - accepts `deckId`, `sourceTaskId`, `parentVersionId`, updated slides payload, optional `aiDeckJson`

---

## Wave Plan

### Wave 0: Freeze contracts and fixtures

Owner: lead engineer, with all agents consuming the result

**Deliverable:** one shared note or commit that locks:

- deck hub response shape
- reopen-editor data flow
- regeneration accept payload
- input validation rules

- [ ] Review current `P0` scope in [2026-03-20-next-week-p0-p3-plan.md](/Users/roydust/Work/PPTist/docs/plans/2026-03-20-next-week-p0-p3-plan.md)
- [ ] Confirm current frontend and backend touchpoints:
  - `src/App.vue`
  - `src/store/snapshot.ts`
  - `src/views/Editor/index.vue`
  - `src/ai/components/AIDeckSetupForm.vue`
  - `src/ai/hooks/useAIDeckGeneration.ts`
  - `src/ai/hooks/useAIDeckLoader.ts`
  - `src/ai/types/deck.ts`
  - `src/hooks/useImport.ts`
  - `server/apps/api/src/modules/ai/ai.controller.ts`
  - `server/apps/api/src/modules/ai/ai.service.ts`
  - `server/libs/db/src/repositories/decks.repository.ts`
  - `server/libs/db/src/repositories/deck-versions.repository.ts`
- [ ] Publish the frozen response/request examples for agents

---

## Parallel Workstreams

### Task 1: Deck Hub backend foundation

**Owner:** Agent A

**Files:**
- Modify: `server/libs/db/src/repositories/decks.repository.ts`
- Modify: `server/libs/db/src/repositories/deck-versions.repository.ts`
- Modify: `server/apps/api/src/modules/ai/ai.controller.ts`
- Modify: `server/apps/api/src/modules/ai/ai.service.ts`
- Modify: `server/apps/api/src/modules/ai/ai.module.ts`
- Create if needed: `server/apps/api/src/modules/ai/dto/deck-list.dto.ts`
- Test: `server/tests/api/ai.service.test.ts`
- Test: `server/tests/integration/version-persistence.test.ts`

- [ ] **Step 1: Write failing tests for deck listing and open-current-version behavior**

Add or extend tests to assert:
- deck list returns title, status, updatedAt, currentVersionId, actualPageCount
- deck detail returns current version and `pptistSlidesJson`
- `Deck.currentVersionId` is used as the current-version lookup source

- [ ] **Step 2: Run targeted tests to verify RED**

Run:

```bash
cd server && npx vitest run tests/api/ai.service.test.ts tests/integration/version-persistence.test.ts
```

Expected: FAIL because list/detail methods do not exist yet.

- [ ] **Step 3: Add repository read methods**

Implement the minimum methods needed for:
- deck list by user/project
- deck detail by `deckId`
- current version lookup

Do not rely on `DeckVersion.isCurrent` in `P0`.

- [ ] **Step 4: Add controller/service endpoints**

Expose:
- `GET /api/ai/decks`
- `GET /api/ai/decks/:deckId`

- [ ] **Step 5: Keep result shape frontend-safe**

Return compact view models only:
- no giant `aiDeckJson` blobs in list responses
- include `pptistSlidesJson` only in detail/open response

- [ ] **Step 6: Run targeted tests to verify GREEN**

Run:

```bash
cd server && npx vitest run tests/api/ai.service.test.ts tests/integration/version-persistence.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add server/libs/db/src/repositories/decks.repository.ts server/libs/db/src/repositories/deck-versions.repository.ts server/apps/api/src/modules/ai/ai.controller.ts server/apps/api/src/modules/ai/ai.service.ts server/apps/api/src/modules/ai/ai.module.ts server/tests/api/ai.service.test.ts server/tests/integration/version-persistence.test.ts
git commit -m "feat: add deck hub list and open api"
```

### Task 2: Deck Hub frontend shell and navigation

**Owner:** Agent B

**Files:**
- Modify: `src/App.vue`
- Create: `src/ai/components/AIDeckHub.vue`
- Create if needed: `src/ai/components/AIDeckHubCard.vue`
- Create if needed: `src/ai/services/deckHub.ts`
- Create if needed: `src/ai/hooks/useDeckHub.ts`
- Modify if needed: `src/store/main.ts`
- Modify if needed: `src/store/snapshot.ts`
- Modify if needed: `src/ai/hooks/useAIDeckLoader.ts`
- Modify if needed: `src/hooks/useImport.ts`
- Test: `tests/unit/ai/AIDeckHub.test.ts`

- [ ] **Step 1: Write failing test for homepage rendering and open/create actions**

Add tests to assert:
- empty state is shown when no decks exist
- deck list renders cards or rows
- clicking “继续编辑” emits/open-calls with the selected deck id

- [ ] **Step 2: Run targeted test to verify RED**

Run:

```bash
npx vitest run tests/unit/ai/AIDeckHub.test.ts
```

- [ ] **Step 3: Implement a lightweight app shell switch**

Update `src/App.vue` so the default experience becomes:
- Deck Hub first
- Editor second after selecting or creating a deck

No vue-router is required in `P0`; use a simple app-level mode or query-state strategy.
Prefer parsing `deckId` and optional `versionId` from `window.location.search` and using `history.pushState` as router-lite state.

- [ ] **Step 4: Implement the deck hub UI**

Build a SaaS-style lightweight management page with:
- title and search/filter placeholder
- deck status
- update time
- page count
- continue editing
- create new AIPPT

- [ ] **Step 5: Connect open/create actions**

Ensure:
- “新建” enters existing editor + AIPPT modal flow
- “继续编辑” loads a deck into editor mode once backend detail/open contract is ready
- import entry points can reuse the same shared open path

- [ ] **Step 5.5: Introduce one shared open action**

Create or extend a single `openDeckIntoEditor(...)` path that:
- updates `slidesStore`
- stores `currentDeckId` and `currentVersionId`
- resets selection/editor transient state
- resets snapshot baseline so undo history does not leak across decks

- [ ] **Step 6: Run targeted test and type-check**

Run:

```bash
npx vitest run tests/unit/ai/AIDeckHub.test.ts
npm run type-check
```

- [ ] **Step 7: Commit**

```bash
git add src/App.vue src/ai/components/AIDeckHub.vue src/ai/components/AIDeckHubCard.vue src/ai/services/deckHub.ts src/ai/hooks/useDeckHub.ts src/store/main.ts tests/unit/ai/AIDeckHub.test.ts
git commit -m "feat: add ai deck hub homepage"
```

### Task 3: Input governance for simple and research modes

**Owner:** Agent C

**Files:**
- Modify: `src/ai/components/AIDeckSetupForm.vue`
- Modify: `src/ai/hooks/useAIDeckGeneration.ts`
- Modify: `src/ai/types/deck.ts`
- Modify if needed: `src/ai/utils/dialogStepMeta.ts`
- Test: `tests/unit/ai/AIDeckSetupForm.test.ts`
- Test: `tests/unit/ai/useAIDeckGeneration.test.ts`

- [ ] **Step 1: Write failing tests for invalid/dirty input handling**

Cover at least:
- blank `topic` in `simple` mode
- malformed JSON paste in `research` mode
- page count lower/upper bound normalization
- oversized text or empty array cleanup

- [ ] **Step 2: Run targeted tests to verify RED**

Run:

```bash
npx vitest run tests/unit/ai/AIDeckSetupForm.test.ts tests/unit/ai/useAIDeckGeneration.test.ts
```

- [ ] **Step 3: Implement frontend validation and repair rules**

Add:
- required-field validation
- paste JSON parse fallback
- normalization for page count
- helper text/example fill
- inline error state that does not break the existing modal flow

- [ ] **Step 4: Keep payload shaping deterministic**

Ensure the final payload is stable:
- empty strings stripped
- arrays trimmed
- optional blocks omitted when empty
- accepted render path retains `deckId` and `versionId` instead of dropping them after loading slides into the editor

- [ ] **Step 5: Run targeted tests and type-check**

Run:

```bash
npx vitest run tests/unit/ai/AIDeckSetupForm.test.ts tests/unit/ai/useAIDeckGeneration.test.ts
npm run type-check
```

- [ ] **Step 6: Commit**

```bash
git add src/ai/components/AIDeckSetupForm.vue src/ai/hooks/useAIDeckGeneration.ts src/ai/types/deck.ts src/ai/utils/dialogStepMeta.ts tests/unit/ai/AIDeckSetupForm.test.ts tests/unit/ai/useAIDeckGeneration.test.ts
git commit -m "feat: add input governance for ai ppt setup"
```

### Task 4: Single-slide regeneration backend and version attach

**Owner:** Agent D

**Files:**
- Modify: `server/apps/api/src/modules/ai/ai.controller.ts`
- Modify: `server/apps/api/src/modules/ai/ai.service.ts`
- Modify if needed: `server/apps/api/src/modules/ai/dto/slide-regenerate.dto.ts`
- Modify if needed: `server/apps/api/src/modules/ai/dto/slide-accept.dto.ts`
- Modify if needed: `server/libs/db/src/repositories/deck-versions.repository.ts`
- Test: `server/tests/api/ai.service.test.ts`
- Test: `server/tests/integration/version-persistence.test.ts`

- [ ] **Step 1: Write failing backend tests for slide regenerate accept flow**

Assert:
- regenerate returns task or preview slide payload
- accept creates a new child version
- accepted slide result updates current version pointer

- [ ] **Step 2: Run targeted tests to verify RED**

Run:

```bash
cd server && npx vitest run tests/api/ai.service.test.ts tests/integration/version-persistence.test.ts
```

- [ ] **Step 3: Implement regenerate accept chain**

Make sure:
- accepted single-page changes can persist as a new version
- parent version relationship is preserved
- deck current version updates correctly

- [ ] **Step 4: Run targeted backend tests to verify GREEN**

Run:

```bash
cd server && npx vitest run tests/api/ai.service.test.ts tests/integration/version-persistence.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add server/apps/api/src/modules/ai/ai.controller.ts server/apps/api/src/modules/ai/ai.service.ts server/apps/api/src/modules/ai/dto/slide-regenerate.dto.ts server/apps/api/src/modules/ai/dto/slide-accept.dto.ts server/libs/db/src/repositories/deck-versions.repository.ts server/tests/api/ai.service.test.ts server/tests/integration/version-persistence.test.ts
git commit -m "feat: persist single slide regeneration results"
```

### Task 5: Single-slide regeneration frontend workflow

**Owner:** Agent D after Task 4 contract stabilizes

**Files:**
- Modify: `src/ai/components/AISlideRegenerateDialog.vue`
- Modify: `src/ai/services/aiDeck.ts`
- Modify: `src/ai/types/regeneration.ts`
- Modify: `src/views/Editor/Thumbnails/index.vue`
- Modify if needed: `src/store/main.ts`
- Test: `tests/unit/ai/useAISlideRegeneration.test.ts`

- [ ] **Step 1: Write failing frontend tests for regenerate-preview-accept**

Assert:
- a slide can trigger regenerate
- preview data returns into dialog state
- accept updates editor slide state

- [ ] **Step 2: Run targeted test to verify RED**

Run:

```bash
npx vitest run tests/unit/ai/useAISlideRegeneration.test.ts
```

- [ ] **Step 3: Implement regenerate UI flow**

Support:
- entering instructions
- polling task result if needed
- previewing replacement
- accepting replacement into current deck

- [ ] **Step 4: Keep editor flow non-destructive**

Do not replace slides irreversibly before accept.

- [ ] **Step 5: Run targeted tests and type-check**

Run:

```bash
npx vitest run tests/unit/ai/useAISlideRegeneration.test.ts
npm run type-check
```

- [ ] **Step 6: Commit**

```bash
git add src/ai/components/AISlideRegenerateDialog.vue src/ai/services/aiDeck.ts src/ai/types/regeneration.ts src/views/Editor/Thumbnails/index.vue src/store/main.ts tests/unit/ai/useAISlideRegeneration.test.ts
git commit -m "feat: add single slide regeneration workflow"
```

---

## Dependency Map

### Can run immediately in parallel

- Task 1: Deck Hub backend foundation
- Task 2: Deck Hub frontend shell and navigation
- Task 3: Input governance for simple and research modes
- Task 4: Single-slide regeneration backend and version attach

### Must wait on upstream contract or partial merge

- Task 5 waits on Task 4’s accepted response shape.
- Task 2’s final “continue editing from backend detail” hookup waits on Task 1 endpoint readiness, but UI shell and local test doubles can start immediately.

---

## Merge Order

1. Merge Task 1 and Task 4 backend contract work first
2. Merge Task 3 input governance next
3. Rebase Task 2 deck hub frontend on the merged backend endpoints
4. Rebase Task 5 single-slide regeneration frontend on the merged regeneration contract
5. Run one integrated verification pass

This order reduces conflict on:

- `server/apps/api/src/modules/ai/ai.service.ts`
- `server/apps/api/src/modules/ai/ai.controller.ts`
- `src/store/main.ts`

---

## Acceptance Criteria

### P0.1 轻量 PPT 管理首页

- App default landing surface is a management homepage, not an immediately disposable editor session.
- User can see previously generated decks after refresh.
- User can reopen a deck into editor mode.
- User can create a new deck from the management page.

### P0.2 输入治理

- `simple` and `research` modes reject obviously invalid input.
- JSON paste in research mode is handled predictably.
- Page count and key fields are normalized before request submission.
- Validation does not break the current modal flow.

### P0.3 单页重生成

- User can trigger regenerate from a specific slide.
- User can preview regenerated content before accepting.
- Accepting a regenerated slide persists through the version chain.
- Current deck remains editable after acceptance.

---

## Final Integrated Verification

- [ ] Frontend targeted tests

```bash
npx vitest run tests/unit/ai/AIDeckHub.test.ts tests/unit/ai/AIDeckSetupForm.test.ts tests/unit/ai/useAIDeckGeneration.test.ts tests/unit/ai/useAISlideRegeneration.test.ts tests/unit/ai/taskPolling.test.ts
```

- [ ] Backend targeted tests

```bash
cd server && npx vitest run tests/api/ai.service.test.ts tests/integration/version-persistence.test.ts tests/integration/research-mode-flow.test.ts
```

- [ ] Type check

```bash
npm run type-check
```

- [ ] Runtime smoke

```bash
npm run dev
cd server && npm run start:dev
```

Verify manually:

- management homepage loads first
- create new AIPPT still opens the existing modal flow
- generated deck can be reopened after refresh
- single-slide regeneration preview and accept both work

---

## Risks And Watchpoints

- `src/App.vue` currently assumes direct editor boot; moving to a management homepage is the highest integration risk in `P0`.
- Backend list/open APIs need a stable default user/project strategy; avoid blocking `P0` on full auth.
- `server/apps/api/src/modules/ai/ai.service.ts` is a shared hotspot; merge backend changes in small increments.
- Single-slide acceptance must not silently orphan version relationships.
- Input governance must not become a second workflow; it must stay inside the existing AIPPT modal.

---

## Recommended First Dispatch

1. Dispatch Agent A on Task 1
2. Dispatch Agent B on Task 2
3. Dispatch Agent C on Task 3
4. Dispatch Agent D on Task 4
5. After Task 4 merges or freezes the contract, assign Task 5 to Agent D

This keeps all four agents busy immediately while preserving clean ownership boundaries.
