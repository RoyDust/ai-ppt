# AIPPT Dialog UI Redesign

## Background

The current AIPPT dialog completes the new workflow correctly, but the UI still reads like a temporary form stack inside a generic modal. It does not communicate the intended "plan first, review outline, then generate" flow with enough hierarchy or confidence.

The redesign should upgrade the dialog into an AI workbench-style experience while preserving the existing product flow and data behavior.

## Goals

- Make the AIPPT dialog feel like a distinct AI workspace rather than a default settings popup.
- Clarify the three-step flow: `setup -> outline -> generating`.
- Improve information hierarchy so users understand what the current step does and what happens next.
- Allow moderate information architecture changes inside the dialog without changing the core workflow or API behavior.
- Keep the dialog practical for editing large outlines, not just visually polished.

## Non-Goals

- Do not change the main AIPPT workflow sequence.
- Do not change request semantics, generation logic, or persistence behavior.
- Do not redesign unrelated editor surfaces outside the modal container.
- Do not introduce new product capabilities such as template picking, history, collaboration, or prompt libraries.

## User-Approved Direction

The chosen direction is an "AI workbench" aesthetic:

- Futuristic and productized, not decorative marketing.
- Strong process visibility, with the sense that the user is progressing through a guided generation pipeline.
- More ambitious than the current white-card form layout, but still readable and editable for dense content.

The user approved moderate information reorganization as long as the primary workflow remains unchanged.

## Design Concept

Use a "main stage + intelligence rail" layout inside the modal.

- The main stage hosts the active task for the current step.
- A persistent side rail shows workflow progress, context, and system guidance.
- The entire surface should feel like a contained AI control room, using layered panels, restrained glow, and dark-toned atmospheric backgrounds.

This balances visual differentiation with editing efficiency better than a purely immersive single-column layout or a rigid dashboard split.

## Visual Direction

### Tone

- Night-shift AI workstation
- Deep navy / carbon surfaces instead of white-first SaaS styling
- Electric accents in cyan, amber, or coral for state emphasis
- Calm rather than flashy

### Surface System

- Replace the current flat modal interior with layered panels.
- Use a dark atmospheric shell with subtle grid or radial-light treatment.
- Use semi-opaque content cards over the background to maintain text readability.
- Introduce a visual separation between shell, main stage, and side rail.

### Typography

- Keep body copy highly readable.
- Use a more distinctive display treatment for the dialog title and stage headings.
- Do not overuse gradient text. Reserve high-emphasis treatments for the title or active-step indicators.

### Motion

- Add small, meaningful motion only where it reinforces state changes:
  - Step highlight transitions
  - Loading-overlay entrance
  - Generating-state activity cues

Avoid decorative animation that competes with editing.

## Layout Changes

## Overall Modal Structure

The dialog should be reorganized into four layers:

1. Background shell
2. Header band
3. Content body with main stage and side rail
4. Stable action area where appropriate per step

### Header Band

Replace the current simple title/subtitle row with:

- Product title area: `AIPPT`
- A concise workflow statement
- A visible active-step badge or status marker

The header should immediately communicate that the user is in a guided AI generation flow, not a generic editor dialog.

### Content Body

Split the body into:

- Main stage: primary interactive content
- Side rail: persistent context and workflow feedback

The side rail should stay visible across all three steps and include:

- Three-step progress display
- Current configuration summary where relevant
- Step-specific guidance text
- Optional status note during planning/rendering

### Responsive Behavior

The target experience is desktop-first because the dialog is opened from the desktop editor modal.

- At the current desktop modal width, use the full two-column layout.
- If the available width becomes too narrow for comfortable side-by-side editing, the side rail may collapse below the main stage rather than shrinking both columns aggressively.
- This redesign does not need a separate mobile version because mobile uses a different surface flow in this codebase.

## Step-Specific Requirements

### Step 1: Setup

Current problem:
- The topic field, page count, language selector, and submit button read as a thin utility form.

Redesign requirements:
- Make the topic input the dominant interaction.
- Treat page count and language as supporting controls.
- Add a short explanation of what the planning step produces.
- Make the submit area feel like a high-confidence "start planning" action.

The setup view should feel like the entry point to an AI pipeline, not a plain configuration form.

### Step 2: Outline Review

Current problem:
- The review page is functional but visually repetitive and too similar to a default admin CRUD editor.

Redesign requirements:
- Elevate the outline summary into a stronger overview card.
- Make each slide card more scannable by improving hierarchy between page number, slide kind, title, summary, and bullets.
- Keep the text editing affordances practical for multi-slide editing.
- Keep the bottom actions stable and visually distinct from the editing region.

The review step should feel like a review-and-direct phase of the AI workflow, not an unstructured list of fields.

### Step 3: Generating

Current problem:
- The generating state looks like an empty placeholder rather than an active system state.

Redesign requirements:
- Present generation as a dedicated progress scene.
- Keep the key explanation that the AI is doing a second-pass production step.
- Surface polling or recency status more cleanly using the existing `lastPolledAt` data only.
- Use stateful styling so the user understands the system is actively working.

## Loading State

The planning overlay should be consistent with the redesigned shell:

- Darkened or frosted overlay that matches the new visual system
- Stronger loading card hierarchy
- Clear "do not resubmit" guidance
- No abrupt mismatch between overlay style and base dialog style

## Component Boundaries

The redesign should stay within the current component structure unless a small presentational split makes implementation cleaner.

Expected primary files:

- `src/views/Editor/AIPPTDialog.vue`
- `src/ai/components/AIDeckSetupForm.vue`
- `src/ai/components/AIDeckOutlineReview.vue`
- `src/ai/components/AIDeckGenerating.vue`

Supportive style or shared-component changes are acceptable only if directly required by the redesign.

## Functional Constraints

- Preserve existing props, emits, and step transitions unless a purely presentational refactor requires local reshaping.
- Keep the `setup`, `outline`, and `generating` states intact.
- Preserve existing actions:
  - create plan
  - edit outline fields
  - return to setup
  - confirm generation
  - show loading and rendering states

## Implementation Notes

- Favor CSS variables or clearly grouped SCSS tokens inside the dialog styles for consistent theming.
- Reuse existing app components where practical rather than introducing a parallel input system.
- Because the worktree already contains edits in the target files, implementation must layer changes carefully without reverting unrelated in-progress work.

## Success Criteria

The redesign is successful if:

- The modal immediately reads as an AI generation workspace.
- Users can identify the current step and the next step without reading all copy.
- The setup screen feels focused and intentional.
- The outline screen remains efficient for editing many slides.
- The generating state feels active and trustworthy.
- The main workflow is unchanged.
