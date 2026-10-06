---
inclusion: always
---

# TurfX — UI/UX Quality Standards

This requirement applies to **every session and every phase** of the TurfX implementation. It is not phase-specific — it applies from Phase 0 onwards and must never be relaxed without an explicit decision from the project owner.

## The bar

Every screen produced must look and feel like a real-world, production-grade sports booking platform. It must not look like a college project, a demo, or an unfinished prototype.

## Design system

- Use a **single, consistent design token file** (colors, spacing scale, typography, border-radius, shadow levels, transition timings) shared across the entire Angular application. Never hardcode color values or spacing values inline — reference design tokens.
- All components inherit from this system. A button always looks the same. A form field always looks the same. A card always looks the same. Consistency across every page is non-negotiable.
- Establish the design system in Phase 0 and extend it (never replace or contradict it) in later phases.

## Typography

- Use a single, professional font stack (e.g. Inter, Plus Jakarta Sans, or equivalent — one primary font, not multiple competing fonts).
- Establish a clear type scale: heading sizes (h1–h4), body, small/caption, label. Use it consistently.
- Never mix arbitrary font sizes across pages.

## Color

- Use a defined palette: a primary brand color, a secondary/accent color, semantic colors (success, warning, error, info), neutral grays for backgrounds/borders/text.
- Maintain sufficient contrast ratios for accessibility (WCAG AA minimum).
- Dark text on light backgrounds by default. Do not use low-contrast combinations.

## Spacing & layout

- Apply a consistent spacing scale (4px base unit or 8px — pick one and stick to it).
- All pages must have proper padding, gutters, and max-width containers. Nothing touches the viewport edge raw.
- Cards, sections, and form groups must have consistent internal padding.

## Buttons

- Define primary, secondary, ghost/outline, and destructive button variants. Use them correctly and consistently across the app.
- All buttons must have hover, active, focus, disabled, and loading states.
- Never use a plain `<button>` without proper styling.

## Forms

- All form fields (text input, select, textarea, checkbox, radio) must use the shared form-field component with consistent label placement, border, focus ring, and error state.
- Validation errors appear below the relevant field in a consistent color/size (never `alert()`).
- Required fields are indicated consistently.
- Form submission must show a loading state while in-flight and a clear success or error outcome.

## Cards & surfaces

- Use consistent card styles (background, border-radius, shadow, padding) for any boxed content unit.
- Elevation (shadow depth) must be used consistently — not random per component.

## Navigation

- The header/navbar must be complete, branded, and role-aware (shows the correct links for the current role).
- Mobile navigation must be a proper hamburger/drawer — not a broken overflow.
- Active route must be visually indicated.

## Responsiveness

- Every screen must be fully responsive: desktop (≥1280px), tablet (768–1279px), mobile (<768px).
- No horizontal scroll on any viewport size.
- Touch targets on mobile are a minimum of 44×44px.
- Grid and flex layouts must reflow correctly at each breakpoint.

## States — required on every applicable screen

| State | Required implementation |
|---|---|
| **Loading** | Skeleton screens or a spinner — never a blank white area |
| **Empty** | A purposeful empty-state illustration or message with a clear call-to-action, never just whitespace |
| **Error** | Inline error messages with actionable copy, never raw error objects or stack traces |
| **Validation error** | Per-field, below the input, on submit and/or on blur |
| **Success** | Toast notification or inline confirmation — never silent |
| **Disabled** | Visually distinct, cursor `not-allowed`, never just greyed-out text |

## Images & icons

- Use a consistent icon library (e.g. Lucide, Heroicons, or Material Symbols — pick one and do not mix libraries).
- All icons are the same visual weight and style throughout the app.
- Images must always have proper aspect-ratio containers with object-fit — never unconstrained.

## What is never acceptable

- Broken layouts at any viewport size.
- Unstyled or browser-default form elements.
- Placeholder copy like "Lorem ipsum" or "TODO" in any rendered UI.
- Raw JSON dumped to the screen for errors.
- Modals or drawers that don't trap focus or can't be closed with Escape.
- Static/fake UI that mimics functionality without actually doing it.
- Implementing visual elements from a later phase just to make the current screen look populated.
- Inconsistent spacing, font sizes, or colors that deviate from the design token system.

## Relationship to architecture documents

The architecture documents (00–10) remain the source of truth for **what** to build. This document is the standard for **how well** the UI must be built. Both apply simultaneously — there is no tradeoff between correctness and quality.
