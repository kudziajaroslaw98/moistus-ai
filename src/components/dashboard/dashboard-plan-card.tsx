'use client';

import { useEffectiveSubscriptionState } from '@/components/providers/subscription-hydration-provider';
import { isProSubscription } from '@/helpers/subscription/subscription-hydration';
import { useSubscriptionLimits } from '@/hooks/subscription/use-feature-gate';
import useAppStore from '@/store/mind-map-store';
import { Sparkles } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

interface DashboardPlanCardProps {
	onUpgrade: () => void;
	onManageBilling: () => void;
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
	const shouldReduceMotion = useReducedMotion() ?? false;
	const ratio = limit > 0 ? Math.min(1, used / limit) : 0;

	return (
		<div className='mt-2 h-1 overflow-hidden rounded-full bg-[#222329]'>
			<motion.div
				animate={{ scaleX: ratio }}
				className='h-full origin-left rounded-full bg-linear-to-r from-blue-400/60 to-blue-400/80'
				initial={shouldReduceMotion ? false : { scaleX: 0 }}
				transition={{ duration: 0.5, ease: EASE_OUT_QUART }}
			/>
		</div>
	);
}

function formatResetDate(iso: string | undefined) {
	if (!iso) return null;
	const date = new Date(iso);
	// Usage rows can carry a stale period; never promise a reset in the past.
	if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return null;
	return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

/** Sidebar plan summary: maps used on Free, AI suggestions used on Pro. */
export function DashboardPlanCard({
	onUpgrade,
	onManageBilling,
}: DashboardPlanCardProps) {
	const { currentSubscription, hasResolvedSubscription } =
		useEffectiveSubscriptionState();
	const { limits, usage } = useSubscriptionLimits();
	const billingPeriodEnd = useAppStore(
		(state) => state.usageData?.billingPeriod?.end
	);

	if (!hasResolvedSubscription) {
		return (
			<div className='h-[132px] rounded-[14px] border border-[#1d1f24] bg-[#0e0f12] motion-safe:animate-pulse' />
		);
	}

	const isPro = isProSubscription(currentSubscription);

	if (isPro) {
		const resetsOn = formatResetDate(billingPeriodEnd);
		const hasAiLimit = limits.aiSuggestions > 0;

		return (
			<div className='rounded-[14px] border border-[#1d1f24] bg-[#0e0f12] p-3.5'>
				<div className='flex items-center justify-between'>
					<span className='font-semibold'>Pro plan</span>

					<button
						className='rounded-sm py-1 text-xs text-zinc-400 transition-colors duration-200 ease hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
						onClick={onManageBilling}
						type='button'
					>
						Manage
					</button>
				</div>

				{hasAiLimit ? (
					<>
						<div className='mt-3 flex items-center justify-between text-xs text-zinc-400'>
							<span className='flex items-center gap-1.5'>
								<Sparkles aria-hidden='true' className='size-3' />
								AI suggestions
							</span>

							<span className='font-mono text-white'>
								{`${usage.aiSuggestions} / ${limits.aiSuggestions}`}
							</span>
						</div>

						<UsageBar limit={limits.aiSuggestions} used={usage.aiSuggestions} />

						{resetsOn && (
							<p className='mt-2 text-xs text-zinc-500'>Resets {resetsOn}</p>
						)}
					</>
				) : (
					<p className='mt-2 text-xs text-zinc-500'>
						Unlimited maps and nodes.
					</p>
				)}
			</div>
		);
	}

	const mapLimit = limits.mindMaps;
	const nodesPerMap = limits.nodesPerMap;

	return (
		<div className='rounded-[14px] border border-[#1d1f24] bg-[#0e0f12] p-3.5'>
			<div className='flex items-center justify-between'>
				<span className='font-semibold'>Free plan</span>

				<span className='text-xs text-zinc-500'>Personal</span>
			</div>

			{mapLimit > 0 && (
				<>
					<div className='mt-3 flex items-center justify-between text-xs text-zinc-400'>
						<span>Maps</span>

						<span className='font-mono text-white'>
							{`${usage.mindMaps} / ${mapLimit}`}
						</span>
					</div>

					<UsageBar limit={mapLimit} used={usage.mindMaps} />
				</>
			)}

			{nodesPerMap > 0 && (
				<p className='mt-2 text-xs text-zinc-500'>{nodesPerMap} nodes per map</p>
			)}

			<button
				className='mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-[9px] border border-[#2a2c33] bg-[#131418] text-[13px] font-medium text-white transition-colors duration-200 ease [@media(hover:hover)]:hover:bg-[#1a1b20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
				onClick={onUpgrade}
				type='button'
			>
				<Sparkles aria-hidden='true' className='size-3.5 text-zinc-400' />
				Unlock AI with Pro
			</button>
		</div>
	);
}
