# AIPPT Page Count Range Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace exact page-count input with range selection so users choose a page-count band and the AI decides the final page count within that band.

**Architecture:** Add a shared page-count-range model in AI deck types, let normalization map a selected range to an internal compatible `goalPageCount`, and pass the explicit range to planning prompts and UI summaries. Update the setup form from free-text numeric input to range selection while keeping render/regenerate compatibility through the existing `goalPageCount` field.

**Tech Stack:** Vue 3, TypeScript, Nest, Vitest

---

### Task 1: Add Shared Page Count Range Model

**Files:**
- Modify: `src/ai/types/deck.ts`
- Modify: `server/libs/ai-orchestrator/src/providers/llm-provider.interface.ts`

- [ ] **Step 1: Write failing tests for range normalization**
- [ ] **Step 2: Add shared page-count-range constants/types**
- [ ] **Step 3: Normalize selected range into both `pageCountRange` and compatible `goalPageCount`**
- [ ] **Step 4: Verify normalization tests pass**

### Task 2: Update Setup Form And Meta Summary

**Files:**
- Modify: `src/ai/components/AIDeckSetupForm.vue`
- Modify: `src/ai/hooks/useAIDeckGeneration.ts`
- Modify: `src/views/Editor/AIPPTDialog.vue`
- Modify: `src/ai/utils/dialogStepMeta.ts`
- Test: `tests/unit/ai/AIDeckSetupForm.test.ts`
- Test: `tests/unit/ai/dialogStepMeta.test.ts`

- [ ] **Step 1: Replace numeric input with range selection UI**
- [ ] **Step 2: Persist selected range through the generation hook**
- [ ] **Step 3: Show selected range in dialog summary instead of an exact page count**
- [ ] **Step 4: Run frontend tests**

### Task 3: Pass Range To Planner Prompt

**Files:**
- Modify: `server/libs/ai-orchestrator/src/providers/openai.provider.ts`
- Test: `server/tests/orchestrator/openai.provider.test.ts`

- [ ] **Step 1: Add failing provider assertion for page-count range prompt text**
- [ ] **Step 2: Include range guidance in plan prompt and keep render compatibility**
- [ ] **Step 3: Run provider and API tests**
