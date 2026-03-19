# AI Render Second Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `render` from local template fill to a second-pass AI production step that consumes the user-edited planning deck and fails explicitly when AI render fails.

**Architecture:** Keep `plan` as editable planning output. Add a new provider-level `renderDeck` pass that takes the edited deck and returns a richer final deck for rendering. The API render endpoint should enqueue an async job that resolves to success or failure instead of always succeeding.

**Tech Stack:** NestJS, Vitest, Vue 3, Pinia, TypeScript

---

### Task 1: Add second-pass render contract

**Files:**
- Modify: `server/libs/ai-orchestrator/src/providers/llm-provider.interface.ts`
- Modify: `server/libs/ai-orchestrator/src/providers/openai.provider.ts`
- Test: `server/tests/orchestrator/openai.provider.test.ts`

- [ ] Add failing tests for `renderDeck` returning richer AI-authored slide content.
- [ ] Extend provider interface with `renderDeck`.
- [ ] Implement OpenAI second-pass render prompt and normalization.

### Task 2: Make API render use async AI jobs and fail loudly

**Files:**
- Modify: `server/libs/queue/src/queue.service.ts`
- Modify: `server/apps/api/src/modules/ai/ai.service.ts`
- Test: `server/tests/api/ai.service.test.ts`

- [ ] Add failing tests for succeeded and failed async deck render tasks.
- [ ] Extend queue service to resolve queued jobs from async work and capture failures.
- [ ] Make `AiService.renderDeck()` call second-pass AI render and mark task `failed` on any error.

### Task 3: Improve render output schema and PPT renderer consumption

**Files:**
- Modify: `server/libs/ai-schema/src/ai-slide.ts`
- Modify: `src/ai/types/slide.ts`
- Modify: `server/libs/pptist-adapter/src/slide-to-pptist.service.ts`
- Test: `server/tests/pptist-adapter/slide-to-pptist.service.test.ts`

- [ ] Add failing tests for subtitle/body sections/highlights consumption.
- [ ] Extend slide schema with final-render fields needed by templates.
- [ ] Update PPT renderer helpers to use richer fields instead of only title/summary/bullets.

### Task 4: Surface render failures and preserve edit flow on frontend

**Files:**
- Modify: `src/ai/stores/aiTasks.ts`
- Modify: `src/ai/hooks/useAIDeckGeneration.ts`
- Modify: `src/views/Editor/AIPPTDialog.vue`
- Test: `tests/unit/ai/aiStores.test.ts`

- [ ] Add failing tests for render failure state handling where useful.
- [ ] Store render status/error separately from planning state.
- [ ] Keep dialog open and show failure if second-pass AI render fails.

### Task 5: Verify end-to-end

**Files:**
- Modify: none unless fixes are required

- [ ] Run targeted server tests.
- [ ] Run targeted frontend tests.
- [ ] Run `npm run type-check` in root.
- [ ] Run root and server builds.
