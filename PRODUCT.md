# Product

## Register

product

## Users

Gatewarden primarily serves self-hosted developers and small operations teams who already run Caddy, an upstream auth layer, and a handful of internal or public-facing applications.

They use the product while shipping or maintaining real services, often as the same people who configured the proxy, own the apps, and respond to incidents. They need to see what is happening now, verify which domains are actually protected, understand whether a request was blocked or passed, and make small but high-confidence security decisions without adding a heavy enterprise workflow.

## Product Purpose

Gatewarden helps self-hosted teams add an AI-assisted security layer in front of existing services without replacing their current Caddy and OIDC setup.

Its job is to give operators one clear place to:

- inspect live request and security events
- review and refine deterministic rules
- verify protected host coverage
- investigate status codes, latency, and suspicious traffic
- use AI only as a reviewable advisory tool, never as an opaque enforcement engine

Success means teams can improve protection and observability with low operational friction, while keeping the runtime model understandable, deterministic, and compatible with the infrastructure they already trust.

## Brand Personality

Clarity, reliability, restraint.

The product should feel calm, technically credible, and operationally mature. It should communicate confidence through precision and structure, not through theatrics. The emotional goal is to make operators feel oriented and in control, especially when investigating failures, suspicious traffic, or rollout gaps.

The closest reference mood is Vercel's product UI discipline: quiet surfaces, sharp hierarchy, deliberate spacing, and familiar interaction logic. The intent is not marketing gloss, it is crisp operational confidence.

## Anti-references

- Neon or cyberpunk security styling
- Heavy, old-enterprise security dashboards with dense chrome and ornamental severity theatrics
- Gradient-first marketing aesthetics that overpower the operational task
- Template-like admin panels made from repetitive card grids with weak hierarchy
- Decorative visual noise that makes error states, host coverage, or request outcomes harder to parse

## Design Principles

1. Operational clarity first
Every primary screen should help an operator answer what happened, where it happened, whether it matters, and what to do next.

2. Deterministic trust over magical automation
The interface should reinforce that enforcement is understandable and reviewable. AI can assist analysis, but it should never feel like an invisible actor making uncontrolled decisions.

3. Familiar infrastructure, lower coordination cost
The product should fit naturally beside Caddy, OIDC proxies, and self-hosted tooling that teams already run. The UX should reduce integration uncertainty rather than introduce a second system to learn.

4. Calm under pressure
When incidents, 404s, 500s, or rollout mistakes happen, the UI should stay composed. Emphasis should come from hierarchy and status clarity, not from visual panic.

5. Surface drift and gaps early
The product should make it obvious when a host is unprotected, when observability is incomplete, or when configuration and runtime behavior do not line up.

## Accessibility & Inclusion

The product should support bilingual operation in Chinese and English, with both treated as first-class UI surfaces rather than partial translations.

It should prioritize high contrast, low visual fatigue, and clear status differentiation for operators who may monitor the console for long periods or during late-night incident work.

Motion should stay subtle and optional in spirit, avoiding distracting animation during operational tasks. Critical states such as errors, blocked requests, approval needs, and unprotected hosts must be recognizable quickly through multiple cues, not color alone.
