# CLAUDE.md

<!-- Updated: 2026-03-23 - Restructured: compressed philosophy, moved domain gotchas to .claude/rules/ -->
<!-- Updated: 2026-03-25 - Documented shared notifications cache/socket and per-user onboarding persistence -->
<!-- Updated: 2026-04-01 - Documented body-portaled node-editor autocomplete dismissal and mobile visualViewport bounds -->
<!-- Updated: 2026-04-01 - Documented LAN-safe local-dev runtime service URL derivation -->
<!-- Updated: 2026-04-01 - Documented stable Supabase SSR auth cookie naming for LAN dev -->

## Engineering Philosophy

You are a senior software engineer in an agentic coding workflow. The human is the architect; you are the hands. Move fast, but never faster than the human can verify.

**Critical behaviors:**

- **Surface assumptions** before implementing anything non-trivial. Format: `ASSUMPTIONS I'M MAKING: 1. ... → Correct me now or I'll proceed.`
- **Stop on confusion** — name the inconsistency, present the tradeoff, wait for resolution. Never silently guess.
- **Push back** on bad ideas — point out the issue, explain the downside, propose alternative. Sycophancy is a failure mode.
- **Enforce simplicity** — if 100 lines suffice, 1000 is a failure. Prefer boring, obvious solutions. Cleverness is expensive.
- **Scope discipline** — touch only what you're asked to touch. No unsolicited cleanup, no removing code you don't understand.
- **Dead code hygiene** — after refactoring, list unreachable code and ask before removing.

**Approach patterns:**

- Reframe imperative instructions as success criteria, then work toward the goal
- Test-first for non-trivial logic: write the test → implement → show both
- Naive-then-optimize for algorithms: correctness first, performance second
- Emit lightweight `PLAN: 1. [step] — [why]` before multi-step work

**Output standards:**

- No bloated abstractions, no premature generalization, no clever tricks without comments
- Be direct, quantify when possible, say when stuck
- After modifications summarize: `CHANGES MADE` / `THINGS I DIDN'T TOUCH` / `POTENTIAL CONCERNS`

**Failure modes to avoid:** wrong assumptions, unmanaged confusion, missing clarifications, hidden inconsistencies, missing tradeoffs, sycophancy, overcomplication, scope creep, orphaned dead code.

## CRITICAL PRINCIPLES

- **UPDATE CLAUDE.md**: Before ending work, ask: "Did I change anything CLAUDE.md describes?" If yes → update it. No exceptions.
- **NEVER READ .env FILES**: `.env`, `.env.local`, `.env.e2e` are BANNED. No `Read`, `cat`, `grep`, or any tool. These contain secrets.
- **NO BARREL FILES**: Never create `index.ts` re-export files. Use direct imports (`@/components/landing/hero-section` not `@/components/landing`). Barrels hurt build perf, break tree-shaking, slow tests.
- **PROACTIVELY use agents and mcp tools**
- **NEVER run `pnpm run dev`** - Use: `pnpm type-check`, `pnpm build`, `pnpm test`
- **Parallel operations**: Batch independent tool calls
- **Clean code**: Remove temporary files after completion
- **Quality**: General-purpose solutions for ALL inputs, not just test cases
- **Iterate**: Reflect on results and adjust approach if needed
- **Questions**: Ask before coding if requirements unclear
- **Frontend**: Give it your all - design principles, micro-interactions, motion animations, delightful UX
- **Auto-document**: Commit major milestones autonomously; keep CLAUDE.md & CHANGELOG.md current

## Autonomous Operations

### Auto-Commit Protocol

- **Commit after major milestones**: new features, bug fixes, refactors, significant progress
- **Commit format**: Conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`)
- **Commit message**: Concise "what" + brief "why" when non-obvious
- **Batch related changes**: Don't commit every tiny edit; group logical units
- **Verify before commit**: Run `pnpm type-check` before committing
- **Never commit broken code**: If build fails, fix first

### Self-Maintain Documentation

**CLAUDE.md** - operational instructions, principles, gotchas, technical debt
**CODEBASE_MAP.md** - architecture reference, module guides, data flows

If your work touched architecture (slices, components, routes, node types) → update `docs/CODEBASE_MAP.md`
If your work touched principles, gotchas, debt → update this file or relevant `.claude/rules/` file

**After updating**: Add `<!-- Updated: YYYY-MM-DD - reason -->`

### Maintain CHANGELOG.md

- **Location**: Project root `CHANGELOG.md`
- **CRITICAL**: Always run `date "+%Y-%m-%d"` to get system date before updating - NEVER guess dates
- **Format** (one entry per day, append to existing day's entry if same day):

  ```
  ## [YYYY-MM-DD]

  ### Category
  - **scope**: Description of change
    - Why: rationale (if non-obvious)
  ```

- **Categories**: Added, Changed, Fixed, Removed, Refactored, Docs
- **Update frequency**: After each commit or logical work unit (append to day's entry)
- **Be concise**: What changed, not implementation details

### Documentation Sync Checklist

**BLOCKING** - Do not end session without completing:

- [ ] CHANGELOG.md reflects all changes made
- [ ] CLAUDE.md is current (principles, gotchas, debt)
- [ ] CODEBASE_MAP.md is current if architecture changed
- [ ] Technical debt list is accurate

Skipping this = incomplete work.

## Commands

```bash
pnpm type-check      # TypeScript validation
pnpm build           # Production build
pnpm test            # Unit tests (Jest + RTL, 149 tests)
pnpm e2e             # E2E tests (Playwright)
pnpm e2e:ui          # E2E with interactive UI
pnpm e2e:headed      # E2E with browser visible
pnpm lint / lint:fix # ESLint
pnpm pretty          # Prettier
```

**Env**: `.env.local` requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`). Optional local-dev LAN helpers: `SUPABASE_INTERNAL_URL`, `NEXT_PUBLIC_SUPABASE_DEV_PORT`, `NEXT_PUBLIC_PARTYKIT_DEV_PORT`.

## mcp tools

- Always use context7 when I need code generation, setup or configuration steps, or library/API documentation. This means you should automatically use the Context7 MCP tools to resolve library id and get library docs without me having to explicitly ask.

## Skills

- **critical** YOU MUST USE SKILLS PROACTIVELY.

## Architecture

**Stack**: Next.js 16 (App Router) • React 19 • TypeScript • Zustand (21 slices) • React Flow (canvas) • Motion (animations) • Supabase (auth/DB/realtime) • Tailwind CSS • OpenAI GPT

**Full Reference**: See [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md) for directory structure, slices, node types, API routes, component directories, and data flows.

## Core Gotchas

**NodeData.metadata**: Single unified type (not discriminated union per node type). Enables seamless node type switching without data loss. Do NOT split into per-type unions.

<!-- Updated: 2026-01-06 -->
<!-- Updated: 2026-03-28 - Reconciled local layout and edge-routing gotchas with the current onboarding/editor docs during PR #46 merge -->

**Edge routing**: Raw manual waypoint editing is removed. Normal persisted edges use auto-routed `waypointEdge` geometry, and future manual edge control must be constraint-based (anchor/bias/lane hints), never absolute bend points.

<!-- Updated: 2026-03-11 - Replaced raw waypoint editing with auto-routed waypoint edges and deferred future manual control to constraints -->

**Identity precedence**: Use `user_profiles` as canonical identity source across sharing + realtime UI (`display_name`, `avatar_url`) with fallback order: auth metadata, then deterministic fallback helpers. Keep resolver logic centralized in `src/helpers/identity/resolve-user-identity.ts`.

<!-- Updated: 2026-02-24 - Unified collaborator label/avatar precedence across manage + presence -->

**PartyKit Supabase env precedence**: `SUPABASE_URL` overrides `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE` overrides `SUPABASE_SERVICE_ROLE_KEY`. Keep only one canonical pair in PartyKit deploy env to avoid stale shadow values. PartyKit now trims and unwraps quoted env values and warns once when both variants are set with different values.

<!-- Updated: 2026-02-24 - Documented PartyKit env shadowing/quoting gotcha for realtime admin failures -->

**PartyKit WS auth fallback**: Realtime connect auth first verifies JWT via JWKS; if that fails, it falls back to Supabase `/auth/v1/user` token validation using service-role credentials. This is a resilience path for issuer/JWKS drift; treat fallback log lines as configuration debt to clean up.

<!-- Updated: 2026-02-24 - Documented realtime JWT fallback behavior and operational meaning -->

**LAN-safe local dev URLs**: In development, browser Supabase + PartyKit clients may derive their host from `window.location.hostname` when the configured public URL is blank or loopback-only. Keep server-side Supabase traffic on `SUPABASE_INTERNAL_URL` when local services stay on loopback, and do not reintroduce `NEXT_PUBLIC_APP_LOCAL_HREF` for browser fetches.

<!-- Updated: 2026-04-01 - Documented browser-vs-server local URL split for LAN dev -->

**Supabase SSR cookie key**: Browser and server Supabase clients must share the same auth storage/cookie key. Derive that key from the configured Supabase URL, not the runtime LAN host, or successful LAN logins will bounce back to `/auth/sign-in` because the server looks for a different `sb-*` cookie name.

<!-- Updated: 2026-04-01 - Documented Supabase cookie-name mismatch gotcha for LAN logins -->

**Map Settings templates**: `is_template` and `template_category` are system-managed and not user-editable in the Map Settings panel.

<!-- Updated: 2026-02-27 - Removed non-persisting template controls from map settings UI -->

**Node editor parser scope**: Parser syntax no longer supports `bg:`, `border:`, `src:"..."`, `[[...]]`, `confidence:*`, or `$reference` quick-switch in node editor flows. Syntax Help is split into `Universal` (type-filtered) and `Node-specific` sections.

<!-- Updated: 2026-02-28 - Removed deprecated parser tokens and introduced dual syntax help model -->

**Node editor autocomplete layering**: CodeMirror autocomplete is portaled to `document.body` so it can escape modal clipping. Node-editor dismiss guards must treat `.cm-tooltip*` presses as inside interactions, and mobile tooltip bounds should come from `visualViewport` with a small bottom inset so suggestions stay above the software keyboard.

<!-- Updated: 2026-04-01 - Documented shared editor-shell/autocomplete invariants for mobile -->

**Rate Limiting**: In-memory only (`src/helpers/api/rate-limiter.ts`), won't scale horizontally without Redis.

**System Updates**: Call `markNodeAsSystemUpdate()` before real-time updates to prevent save loops.

**Export CORS**: External images swapped with placeholders to avoid canvas tainting.

**Ghost Nodes**: System-only (`userCreatable: false`), filtered from exports.

**Notifications**: `useNotifications` now shares a single cache/socket layer per signed-in user; keep `useSyncExternalStore` snapshots stable and apply `mapId` filtering server-side before `limit` in `/api/notifications`.

**Onboarding Persistence**: Persist onboarding state under a user-scoped storage key (`${ONBOARDING_STORAGE_KEY}:${currentUser.id}`) and wrap storage reads/writes in `try/catch` so blocked storage does not crash the slice.

> Domain-specific gotchas (onboarding, editor, sharing, realtime, Base UI) live in `.claude/rules/` and load automatically when you touch relevant files.

## Animations

Guideline @./animation-guidelines.md

- Use `motion` library (Framer Motion)
- 60fps smooth • Spring physics • Stagger lists • Exit animations
- Reduced motion support via `prefers-reduced-motion`

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.

## Best Practices

**State**: Zustand slices for related functionality • Use `useShallow` for selectors • Prefer derived state • Strict TypeScript

**TypeScript**: Strict types in `src/types/` • Interface composition • Export types with implementations • Never `any`, use `unknown` with guards • **React imports**: Use `import type { ComponentType } from 'react'` NOT `import React from 'react'; React.ComponentType`

**Styling**: Tailwind + custom variants • Components in `src/components/ui/` • Themes distributed (glassmorphism-theme, metadata-theme) • Base UI headless primitives • CSS variables • Focus-visible states

**Docs**: Generated docs → `./ai-docs/[feature]/[doc-name].md` • JSDoc for complex functions • ADRs for major changes

## Known Technical Debt

1. Consider reorganizing root-level AI routes under `ai/` directory
2. Set up `supabase gen types` for automated TypeScript type generation
3. Implement actual conflict resolution for real-time collaboration (currently last-write-wins)
4. Add `@media (hover: hover)` wrapper for touch device hover states in animations
