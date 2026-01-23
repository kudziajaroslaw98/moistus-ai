'use client';

import { cn } from '@/utils/cn';
import { motion } from 'motion/react';
import { Lock, Plus } from 'lucide-react';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/Tooltip';

interface CreateMapCardProps {
	onClick: () => void;
	viewMode: 'grid' | 'list';
	className?: string;
	disabled?: boolean;
	limitInfo?: { current: number; max: number };
}

export function CreateMapCard({
	onClick,
	viewMode,
	className,
	disabled = false,
	limitInfo,
}: CreateMapCardProps) {
	const cardContent = (
		<motion.div
			animate={{ opacity: 1, scale: 1 }}
			initial={{ opacity: 0, scale: 0.9 }}
			onClick={disabled ? undefined : onClick}
			transition={{ duration: 0.3, ease: 'easeOut' as const }}
			whileHover={disabled ? undefined : { scale: 1.02, y: -2 }}
			whileTap={disabled ? undefined : { scale: 0.98 }}
			className={cn(
				'group/new-card relative overflow-hidden',
				viewMode === 'grid'
					? 'h-56 sm:h-52 md:h-56 rounded-xl'
					: 'h-20 rounded-lg flex items-center justify-center',
				disabled
					? 'cursor-not-allowed opacity-60'
					: 'cursor-pointer',
				className
			)}
		>
			{/* Animated Background */}
			<div className='absolute inset-0 bg-gradient-to-tl from-zinc-900/50 to-zinc-950' />

			{/* Subtle Glow Effect */}
			<div className='absolute inset-0 rounded-inherit bg-gradient-to-br from-sky-500/5 to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover/new-card:opacity-100' />

			{/* Content */}
			<div
				className={cn(
					'relative z-10 flex flex-col items-center justify-center text-center p-6 h-full',
					viewMode === 'list' && 'flex-row gap-4 p-4'
				)}
			>
				{/* Icon Container */}
				<motion.div
					className='relative mb-3 flex items-center justify-center'
					transition={{ duration: 0.3, ease: 'easeOut' as const }}
					whileHover={disabled ? undefined : { scale: 1.1 }}
				>
					{/* Icon Background */}
					<div
						className={cn(
							'absolute inset-0 rounded-full blur-xl scale-150 transition-transform duration-300',
							disabled
								? 'bg-gradient-to-br from-zinc-500/20 to-zinc-600/20'
								: 'bg-gradient-to-br from-sky-500/20 to-purple-500/20 group-hover/new-card:scale-175'
						)}
					/>

					{/* Main Icon */}
					<div
						className={cn(
							'relative rounded-full p-4 shadow-lg transition-all duration-300',
							disabled
								? 'bg-gradient-to-br from-zinc-600 to-zinc-700 shadow-zinc-600/25'
								: 'bg-gradient-to-br from-sky-600 to-sky-700 shadow-sky-600/25 group-hover/new-card:shadow-xl group-hover/new-card:shadow-sky-600/40'
						)}
					>
						{disabled ? (
							<Lock className='h-6 w-6 text-white' />
						) : (
							<Plus className='h-6 w-6 text-white' />
						)}
					</div>
				</motion.div>

				{/* Text Content */}
				<div
					className={cn(
						'space-y-1',
						viewMode === 'list' && 'space-y-0 text-left'
					)}
				>
					<h3
						className={cn(
							'font-semibold transition-colors duration-200',
							disabled
								? 'text-zinc-400'
								: 'text-white group-hover:text-sky-100'
						)}
					>
						{disabled ? 'Map Limit Reached' : 'Create New Map'}
					</h3>

					<p className='text-sm text-zinc-400 group-hover/new-card:text-zinc-300 transition-colors duration-200'>
						{disabled && limitInfo
							? `${limitInfo.current}/${limitInfo.max} maps used`
							: 'Start organizing your ideas'}
					</p>
				</div>

				{/* Subtle Arrow Indicator for List View */}
				{viewMode === 'list' && (
					<motion.div
						animate={{ x: [0, 4, 0] }}
						className='ml-auto opacity-0 group-hover/new-card:opacity-100 transition-opacity duration-300'
						transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' as const }}
					>
						<div className='w-2 h-2 border-r-2 border-t-2 border-sky-400 rotate-45' />
					</motion.div>
				)}
			</div>

			{/* Ripple Effect on Click */}
			{!disabled && (
				<div className='absolute inset-0 rounded-inherit bg-sky-400/10 scale-0 blur-2xl group-active/new-card:scale-100 transition-transform duration-200 ease-out' />
			)}
		</motion.div>
	);

	// Wrap in tooltip when disabled to show upgrade prompt
	if (disabled) {
		return (
			<Tooltip>
				<TooltipTrigger>{cardContent}</TooltipTrigger>
				<TooltipContent className='max-w-xs'>
					<p className='font-medium'>Upgrade to create more maps</p>
					{limitInfo && (
						<p className='text-xs text-zinc-400 mt-1'>
							You've used all {limitInfo.max} maps in your free plan
						</p>
					)}
				</TooltipContent>
			</Tooltip>
		);
	}

	return cardContent;
}
