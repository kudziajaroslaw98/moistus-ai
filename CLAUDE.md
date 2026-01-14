# CLAUDE.md

## 🚨 CRITICAL PRINCIPLES

- **🔴 UPDATE CLAUDE.md**: Before ending work, ask: "Did I change anything CLAUDE.md describes?" If yes → update it. No exceptions.
- **🔴 NEVER READ .env FILES**: `.env`, `.env.local`, `.env.e2e` are BANNED. No `Read`, `cat`, `grep`, or any tool. These contain secrets.
- **🔴 NO BARREL FILES**: Never create `index.ts` re-export files. Use direct imports (`@/components/landing/hero-section` not `@/components/landing`). Barrels hurt build perf, break tree-shaking, slow tests.
- **PROACTIVELY use agents and mcp tools**
- **NEVER run `pnpm run dev`** - Use: `pnpm type-check`, `pnpm build`, `pnpm test`
- **Parallel operations**: Batch independent tool calls
- **Clean code**: Remove temporary files after completion
- **Quality**: General-purpose solutions for ALL inputs, not just test cases
- **Iterate**: Reflect on results and adjust approach if needed
- **Questions**: Ask before coding if requirements unclear
- **Frontend**: Give it your all - design principles, micro-interactions, motion animations, delightful UX
- **Auto-document**: Commit major milestones autonomously; keep CLAUDE.md & CHANGELOG.md current

## 🤖 Autonomous Operations

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
If your work touched principles, gotchas, debt → update this file

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

**Env**: `.env.local` requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`)

## mcp tools

- Always use context7 when I need code generation, setup or configuration steps, or library/API documentation. This means you should automatically use the Context7 MCP tools to resolve library id and get library docs without me having to explicitly ask.

## Skills

- **critical** YOU MUST USE SKILLS PROACTIVELY.

## Architecture
<!-- Updated: 2026-01-14 - Moved details to CODEBASE_MAP.md -->

**Stack**: Next.js 16 (App Router) • React 19 • TypeScript • Zustand (21 slices) • React Flow (canvas) • Motion (animations) • Supabase (auth/DB/realtime) • Tailwind CSS • OpenAI GPT

**📚 Full Reference**: See [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md) for:
- Directory structure with annotations
- All 21 Zustand slices with line counts and purposes
- All 12 node types with commands and categories
- All 54 API routes organized by feature
- All 24 component directories
- Mermaid diagrams for system overview and data flows
- Navigation guides for common tasks

## Key Design Decisions & Gotchas

**NodeData.metadata**: Single unified type (not discriminated union per node type). Enables seamless node type switching without data loss. Do NOT split into per-type unions.
<!-- Updated: 2026-01-06 -->

**Rate Limiting**: In-memory only (`src/helpers/api/rate-limiter.ts`), won't scale horizontally without Redis.

**System Updates**: Call `markNodeAsSystemUpdate()` before real-time updates to prevent save loops.

**Export CORS**: External images swapped with placeholders to avoid canvas tainting.

**Ghost Nodes**: System-only (`userCreatable: false`), filtered from exports.

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

**Frontend**: Visual hierarchy • Micro-interactions • Responsive • Accessibility (ARIA, keyboard, focus) • Performance (lazy load, optimize bundles) • Error/loading states • Dark mode support

**Styling**: Tailwind + custom variants • Components in `src/components/ui/` • Themes distributed (glassmorphism-theme, metadata-theme) • Base UI headless primitives • CSS variables • Focus-visible states

**Testing**: Jest + React Testing Library (unit) • Playwright (E2E) • **149+ unit tests, 44 E2E tests (×3 browsers = 132 total)** • Co-located tests (`*.test.tsx` next to components) • Mock Zustand stores in tests • 70% coverage target on critical paths

```bash
# E2E workflow
pnpm supabase:start        # Start local DB
pnpm e2e                   # Run all E2E tests
pnpm e2e:update-snapshots  # Update screenshot baselines
pnpm supabase:stop         # Stop local DB
```

**Test gaps**: See `e2e/E2E_TEST_GAPS.md` for missing comment/AI permission tests

**Docs**: Generated docs → `./ai-docs/[feature]/[doc-name].md` • JSDoc for complex functions • ADRs for major changes

## Known Technical Debt
<!-- Updated: 2026-01-14 - Added Stripe cleanup, removed resolved migrations item -->

1. Consider reorganizing root-level AI routes under `ai/` directory
2. Set up `supabase gen types` for automated TypeScript type generation
3. Implement actual conflict resolution for real-time collaboration (currently last-write-wins)
4. Add `@media (hover: hover)` wrapper for touch device hover states in animations
5. **Stripe → Dodo cleanup**: Drop old Stripe columns from DB after confirming no data loss (stripe_subscription_id, stripe_customer_id, stripe_price_id_*, stripe_invoice_id)
