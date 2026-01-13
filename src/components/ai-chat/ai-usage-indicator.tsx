'use client';

import { useSubscriptionLimits } from '@/hooks/subscription/use-feature-gate';
import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import { AlertCircle, Sparkles, TrendingUp } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useMemo } from 'react';

// Feature flag: Set NEXT_PUBLIC_ENABLE_AI_CHAT=true to enable AI Chat
const ENABLE_AI_CHAT = process.env.NEXT_PUBLIC_ENABLE_AI_CHAT === 'true';

type UsageState = 'normal' | 'warning' | 'critical';

/**
 * Compact AI usage indicator for chat panel header.
 * Shows "X / Y AI suggestions used this month" with color coding:
 * - Normal (< 80%): teal/primary colors
 * - Warning (80-99%): amber colors
 * - Critical (100%): red colors
 *
 * Clicking opens the upgrade modal.
 */
export function AIUsageIndicator() {
	const { limits, usage, isLoadingUsage, usageError } = useSubscriptionLimits();
	const shouldReduceMotion = useReducedMotion();

	const showUpgradePrompt = useCallback(() => {
		useAppStore.getState().setPopoverOpen({ upgradeUser: true });
	}, []);

	const { percentage, state } = useMemo(() => {
		const limit = limits.aiSuggestions;
		const used = usage.aiSuggestions;

		// -1 means unlimited, shouldn't happen for AI but handle gracefully
		if (limit === -1 || limit === 0) {
			return { percentage: 0, state: 'normal' as UsageState };
		}

		const pct = (used / limit) * 100;

		let usageState: UsageState = 'normal';
		if (pct >= 100) {
			usageState = 'critical';
		} else if (pct >= 80) {
			usageState = 'warning';
		}

		return { percentage: pct, state: usageState };
	}, [limits.aiSuggestions, usage.aiSuggestions]);

	// Don't render if AI chat is disabled
	if (!ENABLE_AI_CHAT) {
		return null;
	}

	// Don't render if unlimited (Pro tier check - though Pro has limit 100, not -1)
	if (limits.aiSuggestions === -1) {
		return null;
	}

	// Loading state: show subtle skeleton
	if (isLoadingUsage) {
		return (
			<div className='flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-zinc-800/30 animate-pulse'>
				<div className='h-3 w-3 rounded-full bg-zinc-700' />
				<div className='h-3 w-16 rounded bg-zinc-700' />
			</div>
		);
	}

	// Error state: show warning icon with retry hint
	if (usageError && !usage.aiSuggestions) {
		return (
			<div
				className='flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-zinc-800/30 border border-zinc-700/50'
				title='Failed to load usage data'
			>
				<AlertCircle className='h-3.5 w-3.5 text-zinc-500' />
				<span className='text-xs text-zinc-500'>--/--</span>
			</div>
		);
	}

	const transition = shouldReduceMotion
		? { duration: 0 }
		: { duration: 0.2, ease: 'easeOut' as const };

	// Style configurations per state
	const stateStyles = {
		normal: {
			container: 'bg-zinc-800/30 border-zinc-700/50 hover:border-primary-500/30',
			icon: 'text-primary-400',
			text: 'text-zinc-300',
			subtext: 'text-zinc-500',
		},
		warning: {
			container:
				'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50',
			icon: 'text-amber-400',
			text: 'text-amber-300',
			subtext: 'text-amber-400/70',
		},
		critical: {
			container: 'bg-red-500/10 border-red-500/30 hover:border-red-500/50',
			icon: 'text-red-400',
			text: 'text-red-300',
			subtext: 'text-red-400/70',
		},
	};

	const styles = stateStyles[state];

	return (
		<motion.button
			type='button'
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={transition}
			whileHover={{ scale: 1.02 }}
			whileTap={{ scale: 0.98 }}
			onClick={showUpgradePrompt}
			className={cn(
				'flex items-center gap-2 px-2.5 py-1.5 rounded-md border',
				'cursor-pointer transition-colors duration-200',
				'focus:outline-none focus:ring-2 focus:ring-primary-500/30',
				styles.container
			)}
			aria-label={`AI usage: ${usage.aiSuggestions} of ${limits.aiSuggestions} suggestions used. Click to upgrade.`}
		>
			{state === 'critical' ? (
				<TrendingUp className={cn('h-3.5 w-3.5', styles.icon)} />
			) : (
				<Sparkles className={cn('h-3.5 w-3.5', styles.icon)} />
			)}

			<div className='flex items-center gap-1 text-xs'>
				<span className={cn('font-medium', styles.text)}>
					{usage.aiSuggestions}
				</span>
				<span className={styles.subtext}>/</span>
				<span className={styles.subtext}>{limits.aiSuggestions}</span>
				<span className={cn('hidden sm:inline', styles.subtext)}>AI</span>
			</div>

			{state === 'critical' && (
				<span className='text-[10px] font-medium text-red-400'>Limit</span>
			)}
		</motion.button>
	);
}
