---
name: Gatewarden
description: Open-source AI WAF console for self-hosted teams, calm, high-clarity, Caddy-first.
colors:
  background-light: "oklch(0.985 0 0)"
  foreground-light: "oklch(0.145 0 0)"
  surface-light: "oklch(1 0 0)"
  surface-muted-light: "oklch(0.955 0 0)"
  border-light: "oklch(0.91 0 0)"
  foreground-dark: "oklch(0.93 0 0)"
  background-dark: "oklch(0.1 0 0)"
  surface-dark: "oklch(0.13 0 0)"
  surface-muted-dark: "oklch(0.18 0 0)"
  border-dark: "oklch(0.22 0 0)"
  status-active: "oklch(0.72 0.17 142)"
  status-warning: "oklch(0.75 0.15 75)"
  status-error: "oklch(0.65 0.2 25)"
  status-info: "oklch(0.65 0.15 250)"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.foreground-light}"
    textColor: "{colors.background-light}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.foreground-light}"
    textColor: "{colors.background-light}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.surface-muted-light}"
    textColor: "{colors.foreground-light}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-ghost:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.foreground-light}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "32px"
  card-default:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.foreground-light}"
    rounded: "{rounded.xl}"
    padding: "24px"
  input-default:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.foreground-light}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  table-row:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.foreground-light}"
    padding: "8px"
  sidebar-shell:
    backgroundColor: "{colors.background-light}"
    textColor: "{colors.foreground-light}"
    width: "224px"
---

# Design System: Gatewarden

## Overview

**Creative North Star: "The Operator's Panel"**

Gatewarden's UI should feel like a calm control surface for people who already understand their infrastructure. It is not a security marketing artifact, and it is not a theatrical command center. The interface exists to help a self-hosted operator notice drift, inspect live traffic, review deterministic rules, and make confident decisions without sorting through ornamental noise.

The system is intentionally restrained. It borrows the product discipline associated with Vercel's application surfaces, quiet neutral foundations, sharp hierarchy, and familiar interaction patterns, but it applies that discipline to an operations workflow rather than a marketing site. The result should feel crisp, credible, and low-friction, especially when an operator is investigating a 404 spike, a latency anomaly, or a host that was never actually protected.

This system explicitly rejects cyberpunk security styling, heavy enterprise chrome, gradient-led marketing visuals, and generic admin templates made from repetitive card piles. It should always look like a product that respects expert attention.

Key characteristics:

- calm, neutral-first surfaces
- strong hierarchy through contrast and spacing, not decoration
- status color used as signal, not atmosphere
- dense enough for operators, but never cramped
- familiar app-shell behavior with clear table, filter, and settings affordances

## Colors

The palette is a restrained monochrome system with one semantic status lane. Neutrals carry nearly the entire surface, while green, amber, red, and blue appear only where state clarity matters.

### Primary
- **Graphite Control** (`oklch(0.145 0 0)`): The primary ink in light mode. Used for primary buttons, key text, icon marks, and the Gatewarden identity block in the sidebar.

### Secondary
- **Soft Panel Gray** (`oklch(0.955 0 0)`): The default secondary fill for hover states, muted pills, filter buttons, and low-emphasis surface shifts.

### Tertiary
- **Night Ink** (`oklch(0.93 0 0)`): The primary ink in dark mode, carrying the same role as Graphite Control when the scene shifts to a dark operational environment.

### Neutral
- **Paper Signal** (`oklch(0.985 0 0)`): Light-mode app background. Clean, high-clarity, almost white but not pure white.
- **Pure Surface** (`oklch(1 0 0)`): Card and popover surface in light mode.
- **Fine Border Gray** (`oklch(0.91 0 0)`): Light-mode borders and inputs. Subtle enough to disappear at rest, strong enough to structure tables and panels.
- **Deep Console** (`oklch(0.1 0 0)`): Dark-mode page background.
- **Dark Panel** (`oklch(0.13 0 0)`): Dark-mode card surface.
- **Dark Divider** (`oklch(0.22 0 0)`): Dark-mode border and input stroke.

### Semantic Status
- **Verified Green** (`oklch(0.72 0.17 142)`): Protected hosts, successful states, active status.
- **Alert Amber** (`oklch(0.75 0.15 75)`): Warnings, pending review, caution states.
- **Incident Red** (`oklch(0.65 0.2 25)`): Errors, destructive actions, unprotected hosts, critical alerts.
- **Trace Blue** (`oklch(0.65 0.15 250)`): Informational system states and lower-severity observability markers.

**The Status-Only Accent Rule.** Semantic colors are reserved for operational meaning. They do not decorate large surfaces, hero blocks, or generic containers.

## Typography

**Display Font:** `ui-sans-serif, system-ui, sans-serif`  
**Body Font:** `ui-sans-serif, system-ui, sans-serif`  
**Label/Mono Font:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace`

**Character:** Typography is direct, quiet, and product-native. The system relies on tight tracking for headings, modest body sizing, and monospace only where infrastructure identity matters, such as hostnames, rule IDs, paths, and request context.

### Hierarchy
- **Display** (600, `3rem`, 1.1): Used sparingly for major page or hero-level product framing, not for every dashboard section.
- **Headline** (600, `1.5rem`, 1.2): Page titles and top-level section anchors.
- **Title** (500, `0.875rem`, 1.35): Card headers, table labels, compact section labels, structured summaries.
- **Body** (400, `0.875rem`, 1.6): Default descriptive copy. Keep long-form explanatory text within 65–75ch when possible.
- **Label** (500, `0.75rem`, 1.4): Filter labels, metadata, muted helper text, small action affordances.

**The Monospace Is Evidence Rule.** Monospace appears only when the text is operational evidence, hostnames, paths, rule identifiers, request IDs, or other machine-adjacent strings.

## Elevation

Gatewarden uses a mostly flat system with light structural shadowing. Surfaces are separated primarily by borders, tonal shifts, and background contrast. Shadows exist, but only as low-amplitude support for cards, popovers, and interactive focus, never as ornamental softness.

### Shadow Vocabulary
- **Panel Lift** (`0 1px 2px rgba(0, 0, 0, 0.04)`): The default card shadow, equivalent to `shadow-sm`, used to keep cards readable against the page without feeling stacked.
- **Input Lift** (`0 1px 2px rgba(0, 0, 0, 0.03)`): Minimal field shadow used on inputs and outline buttons to stop borders from visually collapsing into the page.
- **Focus Ring** (`0 0 0 3px color-mix(in srgb, currentColor 50%, transparent)` as intent): Used for keyboard focus, clear and technical, not glowy.

**The Flat-At-Rest Rule.** Panels should feel architected, not floating. If a surface can be defined by border and tone alone, prefer that over stronger elevation.

## Components

### Buttons

Buttons are concise, compact, and product-like. They should feel ready for repeated operational use, not like campaign CTAs.

- **Shape:** Rounded rectangle, `6px` to `999px` depending on purpose. Standard controls use `rounded-md`; filter pills use `rounded-full`.
- **Primary:** Dark fill on light mode, light fill on dark mode, compact horizontal padding, medium weight text.
- **Hover / Focus:** Hover is a small tonal shift. Focus uses a crisp 3px ring. No bounce, no glow bloom.
- **Secondary:** Soft gray fill, lower emphasis, used for context-preserving actions.
- **Ghost / Outline:** Reserved for dense filter bars, icon actions, and shell controls. Must stay legible without feeling empty.

### Chips

- **Style:** Compact rounded pills with subtle fill or border treatment.
- **State:** Semantic chips may use green, amber, red, or blue tints. Filter chips should stay neutral unless representing a true operational status.

### Cards / Containers

- **Corner Style:** `12px` on primary content cards, tighter `8px` on utility shells and controls.
- **Background:** White or near-black surfaces depending on theme, never translucent by default.
- **Shadow Strategy:** Single low shadow plus a fine border.
- **Border:** Always fine and neutral, doing most of the separation work.
- **Internal Padding:** 24px for standard content cards, 16px for dense operational panels, 12px for controls.

### Inputs / Fields

- **Style:** Transparent-to-surface background, 1px border, compact height, moderate horizontal padding.
- **Focus:** Border and ring shift together. Focus must look precise and keyboard-safe.
- **Error / Disabled:** Error state borrows destructive ring language. Disabled inputs fade, but remain readable enough to understand current configuration.

### Tables

- **Structure:** Border-first rows with hover tinting. Tables should feel like part of the app shell, not a spreadsheet widget dropped in from another system.
- **Header:** Small but strong labels with clear text contrast.
- **Row State:** Hover and selected states use subtle muted fills. Status meaning belongs inside cells, not as giant row backgrounds.

### Navigation

- **Sidebar:** Light, narrow, and restrained. Active state is a soft filled lane, not a bright color block.
- **Topbar:** Thin structural header with compact search, language, theme, and account actions.
- **Mobile Treatment:** Menu affordances collapse cleanly without changing the visual language.

### Signature Component

**Host Coverage Pills** are a signature Gatewarden pattern. They are compact domain chips that immediately show whether a host is protected or unprotected. This component is central to the product's “surface drift and gaps early” principle and should remain more informative than decorative.

## Do's and Don'ts

### Do:
- **Do** keep the base palette neutral-first, and reserve semantic colors for state, review, risk, and protection signals.
- **Do** use monospace for hostnames, paths, rule IDs, and request identifiers so evidence scans faster.
- **Do** keep spacing rhythmic, with 12px, 16px, and 24px doing most of the work.
- **Do** let borders and tonal contrast define structure before reaching for larger shadows.
- **Do** make unprotected hosts, failed requests, and incomplete observability visible immediately through more than color alone.

### Don't:
- **Don't** use neon or cyberpunk security styling.
- **Don't** recreate heavy, old-enterprise security dashboards with dense chrome and ornamental severity theatrics.
- **Don't** use gradient-first marketing aesthetics that overpower the operational task.
- **Don't** fall back to template-like admin panels made from repetitive card grids with weak hierarchy.
- **Don't** add decorative visual noise that makes error states, host coverage, or request outcomes harder to parse.
- **Don't** use side-stripe borders, gradient text, or decorative glass panels as default motifs.
