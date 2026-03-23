# Content-First Skill Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `src/skills` materially improve AIPPT content quality by driving plan-stage structure, quality checks, and retry behavior.

**Architecture:** Introduce a structured PPT skill profile derived from local skill files, then use that profile in the OpenAI plan pipeline to enforce content-first planning rules. Add a quality gate after plan generation to detect generic titles, weak planning drafts, and poor research reuse, then retry once with focused critique before falling back.

**Tech Stack:** Node, TypeScript, Nest, Vitest

---

### Task 1: Add Structured Skill Profile

**Files:**
- Modify: `server/libs/ai-orchestrator/src/providers/ppt-skill-context.ts`
- Test: `server/tests/orchestrator/openai.provider.test.ts`

- [ ] **Step 1: Write a failing test for plan-stage structured skill usage**
- [ ] **Step 2: Add a structured content-first profile export**
- [ ] **Step 3: Keep existing string context API backward compatible**
- [ ] **Step 4: Re-run targeted tests**

### Task 2: Add Plan Quality Gate And Retry

**Files:**
- Modify: `server/libs/ai-orchestrator/src/providers/openai.provider.ts`
- Test: `server/tests/orchestrator/openai.provider.test.ts`

- [ ] **Step 1: Write failing tests for poor plan retry and critique injection**
- [ ] **Step 2: Add plan quality checks for generic titles, weak planning draft evidence, and weak research reuse**
- [ ] **Step 3: Retry once with critique when quality gate fails**
- [ ] **Step 4: Verify targeted orchestrator tests pass**

### Task 3: Verify Compatibility

**Files:**
- Test: `server/tests/api/ai.service.test.ts`

- [ ] **Step 1: Run API service tests**
- [ ] **Step 2: Run backend type-compatible tests**
- [ ] **Step 3: Summarize remaining gaps for next iteration**
