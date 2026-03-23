# Home Hub Blue Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-theme the homepage management hub to use `#66ccff` as the primary accent while preserving the existing layout and interaction model.

**Architecture:** Keep the scope limited to the current homepage management view by updating shared color variables in `AIDeckHub.vue` and matching action/badge colors in `AIDeckHubCard.vue`. Verify the new theme with a targeted unit test that locks the key CSS tokens and keeps behavioral tests green.

**Tech Stack:** Vue 3, scoped SCSS, Vitest, jsdom

---

### Task 1: Lock the Theme Contract

**Files:**
- Modify: `tests/unit/ai/AIDeckHub.test.ts`
- Test: `tests/unit/ai/AIDeckHub.test.ts`

- [ ] **Step 1: Write the failing test**
Add a test that reads the SFC source for `src/ai/components/AIDeckHub.vue` and asserts the primary color token is `#66ccff` and the old orange accent token is gone.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm test -- tests/unit/ai/AIDeckHub.test.ts`
Expected: FAIL because the component still uses the old accent palette.

### Task 2: Apply the Homepage Theme Update

**Files:**
- Modify: `src/ai/components/AIDeckHub.vue`
- Modify: `src/ai/components/AIDeckHubCard.vue`

- [ ] **Step 1: Update hub theme variables and backgrounds**
Replace the warm accent tokens and warm radial highlight in `AIDeckHub.vue` with a blue theme centered on `#66ccff`, and adjust active/filter/search states to use the new palette.

- [ ] **Step 2: Update card accents to match**
Adjust the badge, primary action button, and ghost button styling in `AIDeckHubCard.vue` so the cards visually match the new homepage theme.

### Task 3: Verify the Theme Change

**Files:**
- Modify: `tests/unit/ai/AIDeckHub.test.ts`
- Test: `tests/unit/ai/AIDeckHub.test.ts`

- [ ] **Step 1: Run the targeted suite**
Run: `npm test -- tests/unit/ai/AIDeckHub.test.ts`
Expected: PASS with all tests green.
