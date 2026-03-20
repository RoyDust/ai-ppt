# Explicit Planning Draft For AIPPT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit per-slide planning draft model that is generated during `plan`, editable in the outline review UI, and consumed by `render` and `regenerate`.

**Architecture:** Extend the shared AI slide schema with a nested `planningDraft` object so plan-stage intent is stored separately from display-stage draft copy. Update the OpenAI provider to request, normalize, and reuse that structure across plan/render/regenerate, then surface the new fields in the outline review UI and state store.

**Tech Stack:** Vue 3, Pinia, TypeScript, Vitest, Node backend orchestrator

---

### Task 1: Extend Shared Slide Types

**Files:**
- Modify: `server/libs/ai-schema/src/ai-slide.ts`
- Modify: `src/ai/types/slide.ts`

- [ ] **Step 1: Add the failing type/test expectations if coverage exists**
- [ ] **Step 2: Add `AISlidePlanningDraft` with explicit fields**
- [ ] **Step 3: Attach optional `planningDraft` to `AISlide` on frontend and backend**
- [ ] **Step 4: Verify imports/type usage still compile**

### Task 2: Update Provider Plan/Render/Regenerate Flow

**Files:**
- Modify: `server/libs/ai-orchestrator/src/providers/openai.provider.ts`
- Modify: `server/libs/ai-orchestrator/src/providers/ppt-skill-context.ts` if prompt helpers need stage-specific wording
- Test: `server/tests/orchestrator/openai.provider.test.ts`

- [ ] **Step 1: Write failing provider tests for `planningDraft` normalization and prompt inclusion**
- [ ] **Step 2: Update `planDeck` prompt to require explicit planning draft fields**
- [ ] **Step 3: Update `normalizeSlide()` to parse and sanitize `planningDraft`**
- [ ] **Step 4: Update `renderDeck` and `regenerateSlide` prompts to prioritize `planningDraft` as the primary source of truth**
- [ ] **Step 5: Run targeted provider tests and confirm red-to-green**

### Task 3: Update Frontend Editing Flow

**Files:**
- Modify: `src/ai/stores/aiDeck.ts`
- Modify: `src/ai/hooks/useAIDeckGeneration.ts`
- Modify: `src/ai/components/AIDeckOutlineReview.vue`
- Modify: `src/views/Editor/AIPPTDialog.vue` only if event wiring or copy needs adjustment

- [ ] **Step 1: Add store actions for each editable planning draft field**
- [ ] **Step 2: Expose update handlers from `useAIDeckGeneration.ts`**
- [ ] **Step 3: Expand `AIDeckOutlineReview.vue` into a real planning-draft editor while preserving current layout**
- [ ] **Step 4: Ensure the outline step still scrolls correctly and generation CTA remains visible**

### Task 4: Verify End-To-End Compatibility

**Files:**
- Test: `server/tests/api/ai.service.test.ts`
- Test: any existing frontend AI deck component tests if present

- [ ] **Step 1: Run targeted backend tests**
- [ ] **Step 2: Run relevant frontend tests if present**
- [ ] **Step 3: Run repo type-check**
- [ ] **Step 4: Fix any schema/prompt regressions discovered during verification**
