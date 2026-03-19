# AIPPT Dialog UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the AIPPT modal into an AI workbench-style experience while preserving the existing `setup -> outline -> generating` workflow and data behavior.

**Architecture:** Keep the current dialog step state and event wiring intact, but restructure the modal presentation into a shared shell with a persistent side rail and stronger stage-specific layouts. Implement the redesign inside the existing Vue components so the visual system is cohesive across setup, outline review, loading, and generating states without changing the underlying generation hooks.

**Tech Stack:** Vue 3, TypeScript, SCSS, Pinia

---

### Task 1: Refactor the dialog shell and shared workflow framing

**Files:**
- Modify: `src/views/Editor/AIPPTDialog.vue`
- Test: manual verification in the desktop editor modal

- [ ] **Step 1: Review the current dialog shell and step-specific visual hooks**

Read: `src/views/Editor/AIPPTDialog.vue`
Expected: identify the existing header, loading mask, and `setup | outline | generating` mounting points that must remain behaviorally intact.

- [ ] **Step 2: Write the shared shell markup changes**

Update `src/views/Editor/AIPPTDialog.vue` to add:

```vue
<div class="aippt-dialog-shell">
  <header class="dialog-hero">...</header>
  <div class="dialog-body">
    <main class="dialog-stage">...</main>
    <aside class="dialog-rail">...</aside>
  </div>
</div>
```

Expected: the dialog owns the common visual frame, workflow copy, active-step badge, and a persistent side rail containing:
- three-step progress indicator
- current configuration summary where relevant
- step-specific guidance copy
- planning/rendering status note derived from existing state

All of this must preserve existing child-component props and emits.

- [ ] **Step 3: Implement shared styling tokens and responsive layout**

Add SCSS in `src/views/Editor/AIPPTDialog.vue` for:

```scss
.aippt-dialog {
  --shell-bg: ...;
  --panel-bg: ...;
  --panel-border: ...;
}
```

Expected: desktop-first two-column layout, atmospheric dark shell, stable loading overlay styling, and rail collapse behavior for narrower widths.

- [ ] **Step 4: Verify the dialog shell compiles cleanly**

Run: `npm run type-check`
Expected: PASS with no TypeScript errors caused by the shell refactor.

- [ ] **Step 5: Commit**

```bash
git add src/views/Editor/AIPPTDialog.vue
git commit -m "feat: redesign aippt dialog shell"
```

### Task 2: Redesign the setup stage as the workbench entry point

**Files:**
- Modify: `src/ai/components/AIDeckSetupForm.vue`
- Test: manual verification in the AIPPT setup step

- [ ] **Step 1: Review existing setup component constraints**

Read: `src/ai/components/AIDeckSetupForm.vue`
Expected: preserve `submit` payload shape and existing props while changing presentation only.

- [ ] **Step 2: Rewrite setup stage structure around a dominant topic input**

Update `src/ai/components/AIDeckSetupForm.vue` to create sections such as:

```vue
<section class="setup-hero">...</section>
<section class="setup-controls">...</section>
<section class="setup-guidance">...</section>
```

Expected: the topic field becomes the primary interaction, with page count and language repositioned as supporting controls and the CTA clearly framed as starting the planning pass.

- [ ] **Step 3: Implement setup-stage styling**

Add scoped SCSS for layered cards, stronger hierarchy, and compact supporting controls while reusing existing `Input`, `Select`, and `Button` components.

- [ ] **Step 4: Manually verify setup interactions**

Check in UI:
- typing topic still updates local state
- Enter still submits
- loading state still disables repeated submission

Expected: behavior matches current flow, but the stage reads as a guided AI prompt workspace.

- [ ] **Step 5: Commit**

```bash
git add src/ai/components/AIDeckSetupForm.vue
git commit -m "feat: redesign aippt setup stage"
```

### Task 3: Redesign the outline review stage for scanability and control

**Files:**
- Modify: `src/ai/components/AIDeckOutlineReview.vue`
- Test: manual verification in the AIPPT outline step

- [ ] **Step 1: Review the current outline-review editing affordances**

Read: `src/ai/components/AIDeckOutlineReview.vue`
Expected: preserve `back`, `confirm`, and all `update:*` emits.

- [ ] **Step 2: Reorganize overview and slide-card markup**

Update the component to separate:

```vue
<section class="overview-card">...</section>
<section class="slides-list">...</section>
<footer class="review-actions">...</footer>
```

Expected: stronger distinction between the global summary, slide metadata, editable fields, and action zone.

- [ ] **Step 3: Improve slide-card hierarchy and density**

Add styling for:
- prominent page index treatment
- slide kind badge
- grouped editable sections
- improved scroll region and footer separation

Expected: large outlines remain editable, but each slide reads like a directed AI task block instead of a plain form card.

- [ ] **Step 4: Manually verify outline editing behavior**

Check in UI:
- summary edits still emit
- slide title/summary/bullet edits still emit
- back and confirm actions still work

Expected: no regression in editing or action semantics.

- [ ] **Step 5: Commit**

```bash
git add src/ai/components/AIDeckOutlineReview.vue
git commit -m "feat: redesign aippt outline review stage"
```

### Task 4: Redesign the generating state and align loading visuals

**Files:**
- Modify: `src/ai/components/AIDeckGenerating.vue`
- Modify: `src/views/Editor/AIPPTDialog.vue`
- Test: manual verification in planning and generating states

- [ ] **Step 1: Review current generating and loading-state copy**

Read:
- `src/ai/components/AIDeckGenerating.vue`
- `src/views/Editor/AIPPTDialog.vue`

Expected: retain the second-pass AI explanation and existing `lastPolledAt` support.

- [ ] **Step 2: Replace placeholder-like generating layout with an active status scene**

Update `src/ai/components/AIDeckGenerating.vue` with markup such as:

```vue
<div class="generating-scene">
  <div class="status-orb"></div>
  <div class="status-copy">...</div>
</div>
```

Expected: generating feels active, trustworthy, and visually integrated with the shell.

- [ ] **Step 3: Align the planning overlay with the new shell**

Adjust `src/views/Editor/AIPPTDialog.vue` loading overlay styles to match the dark workbench system and make the "do not resubmit" state feel intentional.

- [ ] **Step 4: Manually verify generating-state data display**

Check in UI:
- `lastPolledAt` still displays when present
- planning overlay still blocks duplicate submission
- generating screen still works without introducing new state dependencies

- [ ] **Step 5: Commit**

```bash
git add src/ai/components/AIDeckGenerating.vue src/views/Editor/AIPPTDialog.vue
git commit -m "feat: polish aippt generation states"
```

### Task 5: Verify the full desktop AIPPT flow

**Files:**
- Modify: none unless fixes are required

- [ ] **Step 1: Run static verification**

Run: `npm run type-check`
Expected: PASS

- [ ] **Step 2: Run targeted route or UI tests if available**

Run: `rg -n "AIPPTDialog|AIDeckSetupForm|AIDeckOutlineReview|AIDeckGenerating" tests src`
Expected: identify any focused automated tests or test files that cover the touched components or adjacent AI dialog flow.

- [ ] **Step 3: Run discovered targeted tests if any exist**

Run the exact discovered test command(s).
Expected: PASS for any relevant existing targeted tests, or explicit note that no such tests exist.

- [ ] **Step 4: Manually verify the desktop AIPPT modal**

Check:
- setup view renders with new shell
- outline view renders with new shell
- generating view renders with new shell
- workflow sequence and button behavior are unchanged
- narrow-width desktop modal collapses or stacks the side rail cleanly
- long outline content remains editable, scrollable, and keeps action/footer behavior stable

- [ ] **Step 5: Document any verification gaps**

Expected: explicitly note if validation is limited to type-checking and manual testing because no focused UI tests exist.

- [ ] **Step 6: Commit**

```bash
git add <only files changed during verification fixes>
git commit -m "chore: verify aippt dialog ui redesign"
```
