'use client';

import { Button } from '@/components/ui/button';
import { useSubscriptionLimits } from '@/hooks/subscription/use-feature-gate';
import useAppStore from '@/store/mind-map-store';
import { AlertCircle, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface LimitWarningProps {
	limitType: 'mindMaps' | 'nodesPerMap' | 'aiSuggestions' | 'collaboratorsPerMap';
	className?: string;
}

export function LimitWarning({ limitType, className }: LimitWarningProps) {
	const { limits, usage, remaining, isAtLimit } = useSubscriptionLimits();
	const { setShowOnboarding, updateOnboardingData, setOnboardingStep } =
		useAppStore();

	if (!isAtLimit(limitType) || limits[limitType] === -1) {
		return null;
	}

	const handleUpgrade = () => {
		// Show onboarding at pricing step
		updateOnboardingData({ selectedPlan: 'pro' });
		setOnboardingStep(2);
		setShowOnboarding(true);
	};

	const limitMessages = {
		mindMaps: {
			title: 'Mind Map Limit Reached',
			description: `You've created ${usage.mindMaps} of ${limits.mindMaps} mind maps.`,
			action: 'Upgrade to create unlimited mind maps',
		},
		nodesPerMap: {
			title: 'Node Limit Reached',
			description: `This map has ${usage.nodesPerMap} of ${limits.nodesPerMap} nodes.`,
			action: 'Upgrade for unlimited nodes',
		},
		aiSuggestions: {
			title: 'AI Suggestion Limit Reached',
			description: `You've used ${usage.aiSuggestions} of ${limits.aiSuggestions} AI suggestions.`,
			action: 'Upgrade for unlimited AI suggestions',
		},
		collaboratorsPerMap: {
			title: 'Collaborator Limit Reached',
			description: `This map has ${usage.collaboratorsPerMap} of ${limits.collaboratorsPerMap} collaborators.`,
			action: 'Upgrade for unlimited collaborators',
		},
	};

	const message = limitMessages[limitType];

	return (
		<AnimatePresence>
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className={`bg-zinc-800 border border-zinc-700 rounded-lg p-4 ${className}`}
				exit={{ opacity: 0, y: -10 }}
				initial={{ opacity: 0, y: -10 }}
			>
				<div className='flex items-start gap-3'>
					<AlertCircle className='w-5 h-5 text-amber-500 mt-0.5 shrink-0' />

					<div className='flex-1'>
						<h4 className='text-sm font-semibold text-zinc-50 mb-1'>
							{message.title}
						</h4>

						<p className='text-sm text-zinc-400 mb-3'>{message.description}</p>

						<Button
							className='bg-teal-500 hover:bg-teal-600 text-zinc-900 font-medium'
							onClick={handleUpgrade}
							size='sm'
						>
							<Sparkles className='w-4 h-4 mr-2' />

							{message.action}
						</Button>
					</div>
				</div>
			</motion.div>
		</AnimatePresence>
	);
}

// Inline warning for smaller UI elements
export function InlineLimitWarning({
	limitType,
}: {
	limitType: LimitWarningProps['limitType'];
}) {
	const { limits, usage, remaining, isAtLimit } = useSubscriptionLimits();
	const { setShowOnboarding, updateOnboardingData, setOnboardingStep } =
		useAppStore();

	const percentageUsed =
		limits[limitType] === -1 ? 0 : (usage[limitType] / limits[limitType]) * 100;

	// Show warning when at 80% capacity or more
	const showWarning = percentageUsed >= 80;

	if (!showWarning || limits[limitType] === -1) {
		return null;
	}

	const handleClick = () => {
		updateOnboardingData({ selectedPlan: 'pro' });
		setOnboardingStep(2);
		setShowOnboarding(true);
	};

	return (
		<motion.button
			animate={{ opacity: 1, scale: 1 }}
			initial={{ opacity: 0, scale: 0.9 }}
			onClick={handleClick}
			whileHover={{ scale: 1.05 }}
			whileTap={{ scale: 0.95 }}
			className={`
        inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full
        transition-colors cursor-pointer
        ${
					isAtLimit(limitType)
						? 'bg-red-500/20 text-red-400 border border-red-500/30'
						: 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
				}
      `}
		>
			<AlertCircle className='w-3.5 h-3.5' />

			<span>
				{remaining[limitType] === 0
					? 'Limit reached'
					: `${remaining[limitType]} remaining`}
			</span>
		</motion.button>
	);
}

// Usage meter component
export function UsageMeter({
	limitType,
}: {
	limitType: LimitWarningProps['limitType'];
}) {
	const { limits, usage } = useSubscriptionLimits();

	if (limits[limitType] === -1) {
		return null;
	}

	const percentageUsed = (usage[limitType] / limits[limitType]) * 100;
	const isNearLimit = percentageUsed >= 80;
	const isAtLimit = percentageUsed >= 100;

	return (
		<div className='space-y-2'>
			<div className='flex items-center justify-between text-sm'>
				<span className='text-zinc-400'>
					{limitType === 'mindMaps' && 'Mind Maps'}

					{limitType === 'nodesPerMap' && 'Nodes'}

					{limitType === 'aiSuggestions' && 'AI Suggestions'}

					{limitType === 'collaboratorsPerMap' && 'Collaborators'}
				</span>

				<span
					className={`font-medium flex gap-1 ${
						isAtLimit
							? 'text-red-400'
							: isNearLimit
								? 'text-amber-400'
								: 'text-zinc-300'
					}`}
				>
					<span>{usage[limitType]}</span>

					<span>/</span>

					<span>{limits[limitType]}</span>
				</span>
			</div>

			<div className='h-2 bg-zinc-800 rounded-full overflow-hidden'>
				<motion.div
					animate={{ width: `${Math.min(percentageUsed, 100)}%` }}
					initial={{ width: 0 }}
					transition={{ duration: 0.5, ease: 'easeOut' as const }}
					className={`h-full rounded-full ${
						isAtLimit
							? 'bg-red-500'
							: isNearLimit
								? 'bg-amber-500'
								: 'bg-teal-500'
					}`}
				/>
			</div>
		</div>
	);
}
