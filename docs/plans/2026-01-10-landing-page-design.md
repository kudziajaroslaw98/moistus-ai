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

---

# Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild landing page from waitlist capture → full marketing page with 8 sections

**Architecture:** Component-per-section in `src/components/landing/`, composed in `page.tsx`. Reuse existing animation system and background effects.

**Tech Stack:** Next.js 16, React 19, Motion (framer-motion), Tailwind CSS, Lucide icons

---

## Task 0: Setup & Config Updates

### 0.1 Update pricing-tiers.ts

**Files:**
- Modify: `src/constants/pricing-tiers.ts`

**Step 1: Update Free tier - remove AI, add collaboration limit**

```typescript
// In PRICING_TIERS array, update the free tier object:
{
	id: 'free',
	name: 'Free',
	description: 'Perfect for personal use',
	monthlyPrice: 0,
	yearlyPrice: 0,
	features: [
		'3 mind maps',
		'50 nodes per map',
		'Up to 3 collaborators per map',
		'Basic export',
		'Community support',
	],
	limitations: ['No AI features'],
	ctaText: 'Start Free',
	limits: {
		mindMaps: 3,
		nodesPerMap: 50,
		aiSuggestions: 0,
	},
},
```

**Step 2: Update Pro tier - change AI to monthly**

```typescript
// Update the pro tier object:
{
	id: 'pro',
	name: 'Pro',
	description: 'For professionals and teams',
	monthlyPrice: 12,
	yearlyPrice: 120,
	discount: '17% off',
	features: [
		'Unlimited mind maps',
		'Unlimited nodes',
		'Unlimited collaborators',
		'100 AI suggestions per month',
		'Real-time collaboration',
		'Priority support',
		'Advanced export options',
	],
	recommended: true,
	ctaText: 'Start Pro Trial',
	limits: {
		mindMaps: -1,
		nodesPerMap: -1,
		aiSuggestions: 100,
	},
},
```

**Step 3: Run type-check**

```bash
pnpm type-check
```
Expected: No errors

**Step 4: Commit**

```bash
git add src/constants/pricing-tiers.ts
git commit -m "chore: update pricing tiers - free gets collab, no AI; pro 100/month"
```

---

### 0.2 Create landing components directory

**Files:**
- Create: `src/components/landing/index.ts`

**Step 1: Create directory and barrel export**

```typescript
// src/components/landing/index.ts
export { HeroSection } from './hero-section';
export { ProblemSolution } from './problem-solution';
export { FeaturesSection } from './features-section';
export { HowItWorks } from './how-it-works';
export { PricingSection } from './pricing-section';
export { FaqSection } from './faq-section';
export { FinalCta } from './final-cta';
```

**Step 2: No commit yet** — files don't exist, will error. Continue to next task.

---

## Task 1: Hero Section

### 1.1 Create hero-section.tsx

**Files:**
- Create: `src/components/landing/hero-section.tsx`

**Step 1: Create the component**

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { ChevronDown, Sparkles } from 'lucide-react';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

export function HeroSection() {
	const scrollToFeatures = () => {
		document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
	};

	return (
		<section className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-16">
			<div className="max-w-4xl mx-auto text-center">
				{/* Badge */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.25, ease: EASE_OUT_QUART }}
					className="mb-6"
				>
					<span className="inline-flex items-center gap-2 rounded-full bg-primary-500/10 px-4 py-2 text-sm font-medium text-primary-400 ring-1 ring-inset ring-primary-500/20 backdrop-blur-sm">
						<Sparkles className="h-4 w-4" />
						AI-Powered Mind Mapping
					</span>
				</motion.div>

				{/* Headline */}
				<motion.h1
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.25, ease: EASE_OUT_QUART, delay: 0.1 }}
					className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl md:text-6xl"
				>
					<span className="block">
						From <span className="text-brand-coral">Scattered Notes</span>
					</span>
					<span className="block">
						to <span className="text-primary-400">Connected Ideas</span>
					</span>
				</motion.h1>

				{/* Subheadline */}
				<motion.p
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.25, ease: EASE_OUT_QUART, delay: 0.2 }}
					className="mt-6 text-lg leading-relaxed text-text-secondary max-w-2xl mx-auto"
				>
					The mind mapping tool for power users. AI-native suggestions,
					real-time collaboration, and a keyboard-first editor that makes
					you dangerously fast.
				</motion.p>

				{/* CTAs */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.25, ease: EASE_OUT_QUART, delay: 0.3 }}
					className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
				>
					<Button
						size="lg"
						className="px-8 py-3 text-base font-semibold bg-primary-600 hover:bg-primary-500 transition-all duration-200 hover:-translate-y-0.5"
						asChild
					>
						<a href="/try">Try Free</a>
					</Button>
					<Button
						size="lg"
						variant="ghost"
						className="px-8 py-3 text-base text-text-secondary hover:text-text-primary"
						onClick={scrollToFeatures}
					>
						See How It Works
					</Button>
				</motion.div>
			</div>

			{/* Scroll indicator */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.25, ease: EASE_OUT_QUART, delay: 0.5 }}
				className="absolute bottom-8 left-1/2 -translate-x-1/2"
			>
				<motion.div
					animate={{ y: [0, 8, 0] }}
					transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
				>
					<ChevronDown className="h-6 w-6 text-text-tertiary" />
				</motion.div>
			</motion.div>
		</section>
	);
}
```

**Step 2: Run type-check**

```bash
pnpm type-check
```
Expected: Pass (may warn about unused export in index.ts, that's ok)

**Step 3: Commit**

```bash
git add src/components/landing/hero-section.tsx
git commit -m "feat(landing): add hero section with CTAs and scroll indicator"
```

---

## Task 2: Problem → Solution Section

### 2.1 Create problem-solution.tsx

**Files:**
- Create: `src/components/landing/problem-solution.tsx`

**Step 1: Create the component with scroll-triggered animation**

```typescript
'use client';

import { motion, useInView } from 'motion/react';
import { useRef } from 'react';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

export function ProblemSolution() {
	const ref = useRef<HTMLElement>(null);
	const isInView = useInView(ref, { once: true, margin: '-20% 0px' });

	return (
		<section ref={ref} className="py-24 px-4 sm:px-6 lg:px-8">
			<div className="max-w-5xl mx-auto">
				<div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
					{/* Problem */}
					<motion.div
						initial={{ opacity: 0, x: -20 }}
						animate={isInView ? { opacity: 1, x: 0 } : {}}
						transition={{ duration: 0.3, ease: EASE_OUT_QUART }}
						className="text-center md:text-left"
					>
						<p className="text-xl md:text-2xl leading-relaxed text-text-secondary">
							"Mind mapping tools are either{' '}
							<span className="text-text-primary font-medium">too simple</span>{' '}
							or{' '}
							<span className="text-text-primary font-medium">too bloated</span>.
							You end up fighting the tool instead of thinking."
						</p>
					</motion.div>

					{/* Divider (mobile) / VS indicator (desktop) */}
					<div className="hidden md:flex items-center justify-center absolute left-1/2 -translate-x-1/2">
						<div className="w-px h-16 bg-border-subtle" />
					</div>

					{/* Solution */}
					<motion.div
						initial={{ opacity: 0, x: 20 }}
						animate={isInView ? { opacity: 1, x: 0 } : {}}
						transition={{ duration: 0.3, ease: EASE_OUT_QUART, delay: 0.1 }}
						className="text-center md:text-left"
					>
						<p className="text-xl md:text-2xl leading-relaxed text-text-secondary">
							"Moistus gives you{' '}
							<span className="text-primary-400 font-medium">power without complexity</span>.
							AI surfaces connections. The editor stays out of your way."
						</p>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
```

**Step 2: Run type-check**

```bash
pnpm type-check
```

**Step 3: Commit**

```bash
git add src/components/landing/problem-solution.tsx
git commit -m "feat(landing): add problem-solution section with scroll animation"
```

---

## Task 3: Features Section

### 3.1 Create features-section.tsx

**Files:**
- Create: `src/components/landing/features-section.tsx`

**Step 1: Create component with alternating layout**

```typescript
'use client';

import { motion, useInView } from 'motion/react';
import { useRef } from 'react';
import { Brain, Users, Zap } from 'lucide-react';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

interface Feature {
	icon: typeof Brain;
	title: string;
	headline: string;
	description: string;
	imagePlaceholder: string;
}

const features: Feature[] = [
	{
		icon: Brain,
		title: 'AI-Native Intelligence',
		headline: 'AI that thinks with you, not after you',
		description:
			'Ghost nodes suggest connections as you work. No separate "AI button" — insights emerge naturally from your thinking flow.',
		imagePlaceholder: 'Ghost node suggestions appearing on canvas',
	},
	{
		icon: Users,
		title: 'Real-Time Collaboration',
		headline: 'Think together, in real-time',
		description:
			"See teammates' cursors, edits, and ideas instantly. Brainstorm sessions that feel like being in the same room.",
		imagePlaceholder: 'Multiple cursors + avatar stack on canvas',
	},
	{
		icon: Zap,
		title: 'Speed-First Editor',
		headline: 'Type once, structure automatically',
		description:
			'Commands like $task, #tags, @mentions parsed instantly. A learning curve that pays off in minutes saved daily.',
		imagePlaceholder: 'Node editor with command preview',
	},
];

function FeatureBlock({
	feature,
	index,
}: {
	feature: Feature;
	index: number;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const isInView = useInView(ref, { once: true, margin: '-20% 0px' });
	const isEven = index % 2 === 0;
	const Icon = feature.icon;

	return (
		<div
			ref={ref}
			className={`grid md:grid-cols-2 gap-8 md:gap-16 items-center ${
				isEven ? '' : 'md:direction-rtl'
			}`}
		>
			{/* Text */}
			<motion.div
				initial={{ opacity: 0, x: isEven ? -20 : 20 }}
				animate={isInView ? { opacity: 1, x: 0 } : {}}
				transition={{ duration: 0.3, ease: EASE_OUT_QUART }}
				className={`${isEven ? '' : 'md:order-2'} md:direction-ltr`}
			>
				<div className="flex items-center gap-3 mb-4">
					<div className="p-2 rounded-lg bg-primary-500/10">
						<Icon className="h-5 w-5 text-primary-400" />
					</div>
					<span className="text-sm font-medium text-primary-400">
						{feature.title}
					</span>
				</div>
				<h3 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
					{feature.headline}
				</h3>
				<p className="text-lg text-text-secondary leading-relaxed">
					{feature.description}
				</p>
			</motion.div>

			{/* Image placeholder */}
			<motion.div
				initial={{ opacity: 0, x: isEven ? 20 : -20 }}
				animate={isInView ? { opacity: 1, x: 0 } : {}}
				transition={{ duration: 0.3, ease: EASE_OUT_QUART, delay: 0.1 }}
				className={`${isEven ? '' : 'md:order-1'} md:direction-ltr`}
			>
				<div
					className="aspect-video rounded-xl border border-border-subtle bg-surface/50 backdrop-blur-sm flex items-center justify-center p-8"
					style={{
						background:
							'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
					}}
				>
					{/* TODO: Replace with actual screenshot */}
					<p className="text-text-tertiary text-sm text-center">
						{feature.imagePlaceholder}
					</p>
				</div>
			</motion.div>
		</div>
	);
}

export function FeaturesSection() {
	return (
		<section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
			<div className="max-w-6xl mx-auto space-y-24">
				{features.map((feature, index) => (
					<FeatureBlock key={feature.title} feature={feature} index={index} />
				))}
			</div>
		</section>
	);
}
```

**Step 2: Run type-check**

```bash
pnpm type-check
```

**Step 3: Commit**

```bash
git add src/components/landing/features-section.tsx
git commit -m "feat(landing): add features section with alternating layout"
```

---

## Task 4: How It Works Section

### 4.1 Create how-it-works.tsx

**Files:**
- Create: `src/components/landing/how-it-works.tsx`

**Step 1: Create component with steps and connecting line**

```typescript
'use client';

import { motion, useInView } from 'motion/react';
import { useRef } from 'react';
import { PlusCircle, Keyboard, Sparkles } from 'lucide-react';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

const steps = [
	{
		icon: PlusCircle,
		title: 'Start a map',
		description:
			'Create a new mind map or try free without signing up. Your canvas is ready in seconds.',
	},
	{
		icon: Keyboard,
		title: 'Capture your thoughts',
		description:
			'Type naturally. Use commands to structure. The editor parses #tags, $types, and @mentions as you go.',
	},
	{
		icon: Sparkles,
		title: 'Let AI connect the dots',
		description:
			'Ghost nodes suggest links you missed. Your scattered notes become a connected knowledge web.',
	},
];

export function HowItWorks() {
	const ref = useRef<HTMLElement>(null);
	const isInView = useInView(ref, { once: true, margin: '-20% 0px' });

	return (
		<section ref={ref} className="py-24 px-4 sm:px-6 lg:px-8 bg-surface/30">
			<div className="max-w-5xl mx-auto">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.3, ease: EASE_OUT_QUART }}
					className="text-center mb-16"
				>
					<h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
						How It Works
					</h2>
					<p className="text-lg text-text-secondary">
						From first thought to connected knowledge in three steps
					</p>
				</motion.div>

				{/* Steps */}
				<div className="relative">
					{/* Connecting line (desktop only) */}
					<div className="hidden md:block absolute top-12 left-[16.67%] right-[16.67%] h-px bg-border-subtle" />

					<div className="grid md:grid-cols-3 gap-8 md:gap-12">
						{steps.map((step, index) => {
							const Icon = step.icon;
							return (
								<motion.div
									key={step.title}
									initial={{ opacity: 0, y: 20 }}
									animate={isInView ? { opacity: 1, y: 0 } : {}}
									transition={{
										duration: 0.3,
										ease: EASE_OUT_QUART,
										delay: index * 0.15,
									}}
									className="relative text-center"
								>
									{/* Step number + icon */}
									<div className="relative inline-flex items-center justify-center mb-6">
										<div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500/20 to-primary-600/10 flex items-center justify-center">
											<Icon className="h-10 w-10 text-primary-400" />
										</div>
										<span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary-600 text-text-primary text-sm font-bold flex items-center justify-center">
											{index + 1}
										</span>
									</div>

									<h3 className="text-xl font-semibold text-text-primary mb-3">
										{step.title}
									</h3>
									<p className="text-text-secondary leading-relaxed">
										{step.description}
									</p>
								</motion.div>
							);
						})}
					</div>
				</div>
			</div>
		</section>
	);
}
```

**Step 2: Run type-check**

```bash
pnpm type-check
```

**Step 3: Commit**

```bash
git add src/components/landing/how-it-works.tsx
git commit -m "feat(landing): add how-it-works section with 3 steps"
```

---

## Task 5: Pricing Section

### 5.1 Create pricing-section.tsx

**Files:**
- Create: `src/components/landing/pricing-section.tsx`

**Step 1: Create component reusing pricing card pattern**

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { PRICING_TIERS } from '@/constants/pricing-tiers';
import { motion, useInView } from 'motion/react';
import { useRef, useState } from 'react';
import { Check, X } from 'lucide-react';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

export function PricingSection() {
	const ref = useRef<HTMLElement>(null);
	const isInView = useInView(ref, { once: true, margin: '-20% 0px' });
	const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

	return (
		<section ref={ref} className="py-24 px-4 sm:px-6 lg:px-8">
			<div className="max-w-4xl mx-auto">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.3, ease: EASE_OUT_QUART }}
					className="text-center mb-12"
				>
					<h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
						Simple, Transparent Pricing
					</h2>
					<p className="text-lg text-text-secondary mb-8">
						Start free, upgrade when you need more
					</p>

					{/* Billing toggle */}
					<div className="inline-flex items-center gap-3 p-1 rounded-lg bg-surface">
						<button
							className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
								billingCycle === 'monthly'
									? 'bg-elevated text-text-primary'
									: 'bg-transparent text-text-secondary hover:text-text-primary'
							}`}
							onClick={() => setBillingCycle('monthly')}
						>
							Monthly
						</button>
						<button
							className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
								billingCycle === 'yearly'
									? 'bg-elevated text-text-primary'
									: 'bg-transparent text-text-secondary hover:text-text-primary'
							}`}
							onClick={() => setBillingCycle('yearly')}
						>
							Yearly
							<span className="ml-2 text-xs text-success-500">Save 17%</span>
						</button>
					</div>
				</motion.div>

				{/* Pricing cards */}
				<div className="grid md:grid-cols-2 gap-8">
					{PRICING_TIERS.map((tier, index) => (
						<motion.div
							key={tier.id}
							initial={{ opacity: 0, y: 20 }}
							animate={isInView ? { opacity: 1, y: 0 } : {}}
							transition={{
								duration: 0.3,
								ease: EASE_OUT_QUART,
								delay: index * 0.15,
							}}
							className={`relative rounded-xl p-6 border ${
								tier.recommended
									? 'bg-elevated border-primary-500/50 shadow-[0_0_20px_rgba(96,165,250,0.15)]'
									: 'bg-surface border-border-subtle'
							}`}
						>
							{tier.recommended && (
								<div className="absolute -top-3 left-1/2 -translate-x-1/2">
									<span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary-600 text-zinc-100">
										RECOMMENDED
									</span>
								</div>
							)}

							<div className="mb-4">
								<h3 className="text-xl font-semibold mb-2 text-text-primary">
									{tier.name}
								</h3>
								<p className="text-sm text-text-secondary">{tier.description}</p>
							</div>

							<div className="mb-6">
								<div className="flex items-baseline gap-1">
									<span className="text-4xl font-bold text-text-primary">
										$
										{billingCycle === 'monthly'
											? tier.monthlyPrice
											: Math.floor(tier.yearlyPrice / 12)}
									</span>
									<span className="text-text-secondary">/month</span>
								</div>
								{billingCycle === 'yearly' && tier.yearlyPrice > 0 && (
									<p className="text-sm mt-1 text-text-tertiary">
										${tier.yearlyPrice} billed annually
									</p>
								)}
							</div>

							<div className="space-y-3 mb-6">
								{tier.features.map((feature) => (
									<div className="flex items-start gap-2" key={feature}>
										<Check className="w-4 h-4 mt-0.5 shrink-0 text-success-500" />
										<span className="text-sm text-text-primary">{feature}</span>
									</div>
								))}
								{tier.limitations?.map((limitation) => (
									<div className="flex items-start gap-2" key={limitation}>
										<X className="w-4 h-4 mt-0.5 shrink-0 text-text-disabled" />
										<span className="text-sm text-text-disabled">{limitation}</span>
									</div>
								))}
							</div>

							<Button
								className={`w-full ${
									tier.recommended
										? 'bg-primary-600 hover:bg-primary-500 text-white'
										: 'bg-elevated hover:bg-overlay text-text-primary'
								}`}
								asChild
							>
								<a href={tier.id === 'free' ? '/try' : '/signup?plan=pro'}>
									{tier.ctaText}
								</a>
							</Button>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
```

**Step 2: Run type-check**

```bash
pnpm type-check
```

**Step 3: Commit**

```bash
git add src/components/landing/pricing-section.tsx
git commit -m "feat(landing): add pricing section with billing toggle"
```

---

## Task 6: FAQ Section

### 6.1 Create faq-section.tsx

**Files:**
- Create: `src/components/landing/faq-section.tsx`

**Step 1: Create accordion FAQ component**

```typescript
'use client';

import { motion, useInView, AnimatePresence } from 'motion/react';
import { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

const faqs = [
	{
		question: 'Is my data private?',
		answer:
			"Yes. Your maps are private by default. Only you and people you explicitly invite can see them. We don't train AI on your data.",
	},
	{
		question: 'What happens when I hit the free limit?',
		answer:
			'You can still view and edit existing maps. To create new maps or add more nodes, upgrade to Pro or delete old maps.',
	},
	{
		question: 'Can I export my data?',
		answer:
			'Yes. Free users get PNG/SVG export. Pro users get PDF and JSON export. You can download all your data anytime.',
	},
	{
		question: 'How does real-time collaboration work?',
		answer:
			'Share a room code with teammates. They join instantly — no account required for viewers. Edits sync in real-time.',
	},
	{
		question: 'What AI features are included in Pro?',
		answer:
			'AI suggests new nodes, connections between ideas, and helps expand your thinking. 100 suggestions per month, refreshes monthly.',
	},
];

function FaqItem({
	faq,
	index,
	isInView,
}: {
	faq: (typeof faqs)[0];
	index: number;
	isInView: boolean;
}) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={isInView ? { opacity: 1, y: 0 } : {}}
			transition={{
				duration: 0.3,
				ease: EASE_OUT_QUART,
				delay: index * 0.1,
			}}
			className="border-b border-border-subtle last:border-b-0"
		>
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="w-full py-5 flex items-center justify-between text-left group"
			>
				<span className="text-lg font-medium text-text-primary group-hover:text-primary-400 transition-colors duration-200">
					{faq.question}
				</span>
				<motion.div
					animate={{ rotate: isOpen ? 180 : 0 }}
					transition={{ duration: 0.2 }}
				>
					<ChevronDown className="h-5 w-5 text-text-tertiary" />
				</motion.div>
			</button>
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2, ease: EASE_OUT_QUART }}
						className="overflow-hidden"
					>
						<p className="pb-5 text-text-secondary leading-relaxed">
							{faq.answer}
						</p>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
}

export function FaqSection() {
	const ref = useRef<HTMLElement>(null);
	const isInView = useInView(ref, { once: true, margin: '-20% 0px' });

	return (
		<section ref={ref} className="py-24 px-4 sm:px-6 lg:px-8 bg-surface/30">
			<div className="max-w-2xl mx-auto">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={isInView ? { opacity: 1, y: 0 } : {}}
					transition={{ duration: 0.3, ease: EASE_OUT_QUART }}
					className="text-center mb-12"
				>
					<h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
						Frequently Asked Questions
					</h2>
				</motion.div>

				{/* FAQ items */}
				<div
					className="rounded-xl border border-border-subtle bg-surface/50 backdrop-blur-sm px-6"
					style={{
						background:
							'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
					}}
				>
					{faqs.map((faq, index) => (
						<FaqItem key={faq.question} faq={faq} index={index} isInView={isInView} />
					))}
				</div>
			</div>
		</section>
	);
}
```

**Step 2: Run type-check**

```bash
pnpm type-check
```

**Step 3: Commit**

```bash
git add src/components/landing/faq-section.tsx
git commit -m "feat(landing): add FAQ section with accordion animation"
```

---

## Task 7: Final CTA Section

### 7.1 Create final-cta.tsx

**Files:**
- Create: `src/components/landing/final-cta.tsx`

**Step 1: Create the component**

```typescript
'use client';

import { Button } from '@/components/ui/button';
import { motion, useInView } from 'motion/react';
import { useRef } from 'react';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

export function FinalCta() {
	const ref = useRef<HTMLElement>(null);
	const isInView = useInView(ref, { once: true, margin: '-20% 0px' });

	return (
		<section
			ref={ref}
			className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
		>
			{/* Gradient background */}
			<div className="absolute inset-0 bg-gradient-to-b from-primary-900/20 to-transparent" />

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={isInView ? { opacity: 1, y: 0 } : {}}
				transition={{ duration: 0.3, ease: EASE_OUT_QUART }}
				className="relative max-w-2xl mx-auto text-center"
			>
				<h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
					Ready to connect your ideas?
				</h2>
				<p className="text-lg text-text-secondary mb-8">
					Start free. No credit card required.
				</p>
				<Button
					size="lg"
					className="px-10 py-4 text-lg font-semibold bg-primary-600 hover:bg-primary-500 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(96,165,250,0.3)]"
					asChild
				>
					<a href="/try">Try Free</a>
				</Button>
			</motion.div>
		</section>
	);
}
```

**Step 2: Run type-check**

```bash
pnpm type-check
```

**Step 3: Commit**

```bash
git add src/components/landing/final-cta.tsx
git commit -m "feat(landing): add final CTA section"
```

---

## Task 8: Barrel Export & Page Assembly

### 8.1 Update barrel export

**Files:**
- Modify: `src/components/landing/index.ts`

**Step 1: Ensure all exports are correct**

The file should already have all exports from Task 0. Verify it exists and is correct.

**Step 2: Run type-check**

```bash
pnpm type-check
```

---

### 8.2 Rebuild page.tsx

**Files:**
- Modify: `src/app/(landing)/page.tsx`

**Step 1: Replace page content with new sections**

```typescript
import BackgroundEffects from '@/components/waitlist/background-effects';
import MinimalFooter from '@/components/waitlist/minimal-footer';
import {
	HeroSection,
	ProblemSolution,
	FeaturesSection,
	HowItWorks,
	PricingSection,
	FaqSection,
	FinalCta,
} from '@/components/landing';
import { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Moistus AI - AI-Powered Mind Mapping for Power Users',
	description:
		'Transform your thoughts into connected knowledge with AI-powered mind mapping. Real-time collaboration, keyboard-first editor, and AI that thinks with you.',
	keywords: [
		'mind mapping',
		'AI',
		'knowledge management',
		'collaboration',
		'productivity',
		'brainstorming',
		'PKM',
		'second brain',
	],
	openGraph: {
		title: 'Moistus AI - From Scattered Notes to Connected Ideas',
		description:
			'The mind mapping tool for power users. AI-native suggestions, real-time collaboration, and a keyboard-first editor.',
		type: 'website',
		url: 'https://moistus.ai',
		images: [
			{
				url: '/og-image.png',
				width: 1200,
				height: 630,
				alt: 'Moistus AI - AI-Powered Mind Mapping',
			},
		],
	},
	twitter: {
		card: 'summary_large_image',
		title: 'Moistus AI - From Scattered Notes to Connected Ideas',
		description:
			'The mind mapping tool for power users. AI-native suggestions, real-time collaboration.',
		images: ['/og-image.png'],
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			'max-video-preview': -1,
			'max-image-preview': 'large',
			'max-snippet': -1,
		},
	},
};

export default function Home() {
	return (
		<main className="relative min-h-screen flex flex-col bg-background">
			<BackgroundEffects />

			<div className="relative z-10">
				<HeroSection />
				<ProblemSolution />
				<FeaturesSection />
				<HowItWorks />
				<PricingSection />
				<FaqSection />
				<FinalCta />
				<MinimalFooter />
			</div>
		</main>
	);
}
```

**Step 2: Run type-check**

```bash
pnpm type-check
```

**Step 3: Run build to verify**

```bash
pnpm build
```

**Step 4: Commit**

```bash
git add src/components/landing/index.ts src/app/\(landing\)/page.tsx
git commit -m "feat(landing): assemble new landing page with all sections"
```

---

## Task 9: Final Verification & Documentation

### 9.1 Full verification

**Step 1: Run all checks**

```bash
pnpm type-check && pnpm build && pnpm test
```

**Step 2: Update MVP_ROADMAP.md**

Add collaboration limits task to Phase 1:

```markdown
### 1.5 Collaboration Limits
- [ ] Add `collaboratorsPerMap` field to pricing-tiers.ts limits
- [ ] Enforce collaborator limit in share/join-room API
- [ ] Show limit warning in share panel UI

**Effort:** 2-3 hours | **Risk:** Low
```

**Step 3: Update CHANGELOG.md**

```markdown
## [2026-01-10]

### Added
- **landing**: Complete landing page rebuild with 8 sections
  - Hero with CTAs and scroll indicator
  - Problem/Solution contrast section
  - 3 feature blocks with placeholders for screenshots
  - How it Works (3 steps)
  - Pricing with billing toggle
  - FAQ accordion
  - Final CTA
- **pricing**: Updated tiers - Free gets 3 collaborators, no AI; Pro gets 100 AI/month

### Changed
- **landing**: Replaced waitlist page with full marketing page
```

**Step 4: Final commit**

```bash
git add MVP_ROADMAP.md CHANGELOG.md
git commit -m "docs: update roadmap with collab limits, update changelog"
```

---

## Summary

| Task | Component | Est. Time |
|------|-----------|-----------|
| 0 | Setup & pricing updates | 10 min |
| 1 | Hero section | 15 min |
| 2 | Problem/Solution | 10 min |
| 3 | Features section | 20 min |
| 4 | How it Works | 15 min |
| 5 | Pricing section | 20 min |
| 6 | FAQ section | 15 min |
| 7 | Final CTA | 10 min |
| 8 | Page assembly | 15 min |
| 9 | Verification & docs | 10 min |

**Total: ~2-2.5 hours**
