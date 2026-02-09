'use client';

import { Button } from '@/components/ui/button';
import { useFeatureGate } from '@/hooks/subscription/use-feature-gate';
import { cn } from '@/lib/utils';
import { Lock, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface AIFeatureButtonProps {
	onClick: () => void;
	children: React.ReactNode;
	className?: string;
	variant?: 'default' | 'outline' | 'ghost';
	size?: 'default' | 'sm' | 'lg' | 'icon';
	disabled?: boolean;
}

export function AIFeatureButton({
	onClick,
	children,
	className,
	variant = 'default',
	size = 'default',
	disabled = false,
}: AIFeatureButtonProps) {
	const { hasAccess, isLoading, requiresPlan, showUpgradePrompt } =
		useFeatureGate('ai-suggestions');

	const handleClick = () => {
		if (!hasAccess) {
			showUpgradePrompt();
			return;
		}

		onClick();
	};

	// While loading subscription status, show the button as normal
	if (isLoading) {
		return (
			<Button
				className={cn('relative', className)}
				disabled={disabled}
				size={size}
				variant={variant}
			>
				<Sparkles className='w-4 h-4 mr-2' />

				{children}
			</Button>
		);
	}

	// If user doesn't have access, show locked state
	if (!hasAccess) {
		return (
			<motion.div
				initial={{ scale: 1 }}
				whileHover={{ scale: 1.02 }}
				whileTap={{ scale: 0.98 }}
			>
				<Button
					onClick={handleClick}
					size={size}
					variant={variant}
					className={cn(
						'relative group',
						variant === 'default' && 'bg-zinc-700 hover:bg-zinc-600',
						className
					)}
				>
					<Lock className='w-4 h-4 mr-2 group-hover:hidden' />

					<Sparkles className='w-4 h-4 mr-2 hidden group-hover:inline-block' />

					{children}

					{/* Upgrade badge */}
					<span className='absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-semibold bg-primary-500 text-zinc-900 rounded-full'>
						PRO
					</span>

					{/* Hover tooltip */}
					<motion.div
						className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-xs text-zinc-300 whitespace-nowrap pointer-events-none'
						initial={{ opacity: 0, y: 5 }}
						whileHover={{ opacity: 1, y: 0 }}
					>
						Upgrade to Pro to use AI features
					</motion.div>
				</Button>
			</motion.div>
		);
	}

	// User has access, show normal button
	return (
		<Button
			className={cn('relative', className)}
			disabled={disabled}
			onClick={handleClick}
			size={size}
			variant={variant}
		>
			<Sparkles className='w-4 h-4 mr-2' />

			{children}
		</Button>
	);
}

// Example usage in a component
export function AIGenerateSuggestions() {
	const { hasAccess } = useFeatureGate('ai-suggestions');

	const handleGenerateSuggestions = async () => {
		// This will only be called if user has access
		// Your AI logic here
	};

	return (
		<div className='space-y-4'>
			<h3 className='text-lg font-semibold text-zinc-50'>AI Suggestions</h3>

			<AIFeatureButton
				className='w-full'
				onClick={handleGenerateSuggestions}
				variant='outline'
			>
				Generate AI Suggestions
			</AIFeatureButton>

			{!hasAccess && (
				<p className='text-sm text-zinc-400 text-center'>
					Upgrade to Pro to unlock AI-powered suggestions that help expand your
					ideas
				</p>
			)}
		</div>
	);
}
