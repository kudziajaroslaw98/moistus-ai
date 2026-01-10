# Landing Page Redesign - Design Document

> Created: 2026-01-10
> Status: Approved for implementation

## Goals

1. **Drive "Try Free" clicks** — fast path to anonymous localStorage mode
2. **Convert to paid signups** — show why Moistus beats alternatives

## Target Users

- **Primary**: Students/academics, Second brain enthusiasts (PKM crowd)
- **Secondary**: Developers (incidental)

## Core Differentiators

1. **AI-native** — suggestions and connections emerge naturally, not bolted-on
2. **Real-time collaboration** — best-in-class multiplayer experience
3. **Power-user node editor** — learning curve pays off in speed

## Page Structure

### Section 1: Hero (100vh)

**Layout**: Full viewport, glassmorphic background (reuse `background-effects.tsx`)

**Content**:
```
[Badge] "AI-Powered Mind Mapping"

# From Scattered Notes to Connected Ideas

The mind mapping tool for power users. AI-native suggestions,
real-time collaboration, and a keyboard-first editor that makes
you dangerously fast.

[Try Free - Primary]  [Watch Demo - Ghost]

↓ Scroll indicator
```

**Animation**: Stagger fade-in-up (250ms duration, 100ms stagger, ease-out-quart)

---

### Section 2: Problem → Solution

**Layout**: Two-column (desktop), stacked (mobile)

**Content**:
```
Left (Problem):
"Mind mapping tools are either too simple or too bloated.
You end up fighting the tool instead of thinking."

Right (Solution):
"Moistus gives you power without complexity.
AI surfaces connections. The editor stays out of your way."
```

**Animation**: Scroll-triggered, left slides from -20px, right from +20px

---

### Section 3: Features (3 Blocks)

**Layout**: Alternating text/image, vertically stacked

**Feature 1: AI-Native Intelligence**
```
"AI that thinks with you, not after you"

Ghost nodes suggest connections as you work.
No separate "AI button" — insights emerge naturally
from your thinking flow.

[Placeholder: Ghost node suggestions on canvas]
```

**Feature 2: Real-Time Collaboration**
```
"Think together, in real-time"

See teammates' cursors, edits, and ideas instantly.
Brainstorm sessions that feel like being in the same room.

[Placeholder: Multiple cursors + avatar stack]
```

**Feature 3: Speed-First Editor**
```
"Type once, structure automatically"

Commands like $task, #tags, @mentions parsed instantly.
A learning curve that pays off in minutes saved daily.

[Placeholder: Node editor with command preview]
```

**Animation**: Scroll-reveal, image slides in 100ms after text, subtle parallax

---

### Section 4: How It Works (3 Steps)

**Layout**: Horizontal (desktop), vertical (mobile), connected by line

**Content**:
```
Step 1: "Start a map"
Icon: PlusCircle
"Create a new mind map or try free without signing up.
Your canvas is ready in seconds."

Step 2: "Capture your thoughts"
Icon: Keyboard/Zap
"Type naturally. Use commands to structure.
The editor parses #tags, $types, and @mentions as you go."

Step 3: "Let AI connect the dots"
Icon: Sparkles/Brain
"Ghost nodes suggest links you missed.
Your scattered notes become a connected knowledge web."
```

**Animation**: Stagger reveal (150ms), SVG line draws progressively

---

### Section 5: Pricing

**Layout**: Two cards side-by-side, Pro highlighted

**Tiers** (updated):

| | Free | Pro |
|---|---|---|
| Price | $0 | $12/mo ($10/mo yearly) |
| Maps | 3 | Unlimited |
| Nodes | 50/map | Unlimited |
| Collaborators | 3/map | Unlimited |
| AI suggestions | None | 100/month |
| Export | Basic | Advanced |

**Component**: Reuse existing upgrade flow pricing cards

**Animation**: Scroll-reveal, Pro card has subtle glow pulse

---

### Section 6: FAQ (5 Questions)

**Layout**: Accordion, single column, max-w-700px

**Questions**:

1. **"Is my data private?"**
   "Yes. Your maps are private by default. Only you and people you explicitly invite can see them. We don't train AI on your data."

2. **"What happens when I hit the free limit?"**
   "You can still view and edit existing maps. To create new maps or add more nodes, upgrade to Pro or delete old maps."

3. **"Can I export my data?"**
   "Yes. Free users get PNG/SVG export. Pro users get PDF and JSON export. You can download all your data anytime."

4. **"How does real-time collaboration work?"**
   "Share a room code with teammates. They join instantly — no account required for viewers. Edits sync in real-time."

5. **"What AI features are included in Pro?"**
   "AI suggests new nodes, connections between ideas, and helps expand your thinking. 100 suggestions per month, refreshes monthly."

**Animation**: Stagger reveal, accordion expand with chevron rotation

---

### Section 7: Final CTA

**Layout**: Full-width, gradient background

**Content**:
```
"Ready to connect your ideas?"

Start free. No credit card required.

[Try Free - Large]
```

**Animation**: Fade-in, subtle background gradient shift (10s loop)

---

### Section 8: Footer

**Layout**: Single row (desktop), stacked (mobile)

**Content**: `© 2026 Moistus · Privacy · Terms · Contact`

**Style**: Muted gray-500, subtle hover underline

---

## Animation Guidelines

- **Duration**: 200-300ms max (never > 1s)
- **Easing**: ease-out-quart `[0.165, 0.84, 0.44, 1]`
- **Scroll triggers**: IntersectionObserver at 20% viewport
- **Reduced motion**: Fallback to opacity-only transitions
- **Performance**: Only animate opacity/transform

## Design Tokens

- **Primary**: Blue (hue 250°) — buttons, links, interactive
- **Brand Coral**: `oklch(0.79 0.15 25)` — emphasis, highlights
- **Background**: neutral-950 (base) → neutral-800 (elevated)
- **Text**: neutral-50 (primary) → neutral-500 (tertiary)

## Files to Create/Modify

**New components** (`src/components/landing/`):
- `hero-section.tsx`
- `problem-solution.tsx`
- `features-section.tsx`
- `how-it-works.tsx`
- `pricing-section.tsx`
- `faq-section.tsx`
- `final-cta.tsx`

**Modify**:
- `src/app/(landing)/page.tsx` — rebuild with new sections
- `src/constants/pricing-tiers.ts` — update Free/Pro tiers
- `MVP_ROADMAP.md` — add collaboration limits task

**Reuse**:
- `src/components/waitlist/background-effects.tsx`
- `src/components/waitlist/animations.ts`
- Upgrade flow pricing cards

## Implementation Notes

1. **No social proof** — skip logo strip and testimonials (no assets yet)
2. **Placeholder images** — use styled frames with comments for screenshots
3. **Mobile-first** — design for mobile, enhance for desktop
4. **Performance** — target <3s load time, lazy load below-fold images
5. **Accessibility** — WCAG 2.1 AA, prefers-reduced-motion support

## Required Code Changes

### pricing-tiers.ts updates:
```typescript
// Free tier
features: [
  '3 mind maps',
  '50 nodes per map',
  'Up to 3 collaborators per map',
  'Basic export',
  'Community support',
],
limitations: ['No AI features'],
limits: {
  mindMaps: 3,
  nodesPerMap: 50,
  aiSuggestions: 0, // Changed from 10
  collaboratorsPerMap: 3, // NEW
},

// Pro tier
features: [
  'Unlimited mind maps',
  'Unlimited nodes',
  'Unlimited collaborators',
  '100 AI suggestions per month', // Changed from week
  'Priority support',
  'Advanced export options',
],
limits: {
  mindMaps: -1,
  nodesPerMap: -1,
  aiSuggestions: 100, // per month now
  collaboratorsPerMap: -1, // NEW
},
```

### MVP_ROADMAP.md addition:
Add to Phase 1 or 2:
```markdown
### X.X Collaboration Limits
- [ ] Add `collaboratorsPerMap` to pricing-tiers.ts
- [ ] Enforce collaborator limit in share/join-room API
- [ ] Show limit warning in share panel UI
```
