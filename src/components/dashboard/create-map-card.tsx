'use client';

import { cn } from '@/utils/cn';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface CreateMapCardProps {
	onClick: () => void;
	viewMode: 'grid' | 'list';
	className?: string;
}

export function CreateMapCard({
	onClick,
	viewMode,
	className,
}: CreateMapCardProps) {
	return (
		<motion.div
			onClick={onClick}
			whileHover={{ scale: 1.02, y: -2 }}
			whileTap={{ scale: 0.98 }}
			initial={{ opacity: 0, scale: 0.9 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.3, ease: 'easeOut' }}
			className={cn(
				'group/new-card relative cursor-pointer overflow-hidden',
				viewMode === 'grid'
					? 'rounded-xl'
					: 'h-20 rounded-lg flex items-center justify-center',
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
					whileHover={{ scale: 1.1 }}
					transition={{ duration: 0.3, ease: 'easeOut' }}
					className='relative mb-3 flex items-center justify-center'
				>
					{/* Icon Background */}
					<div className='absolute inset-0 rounded-full bg-gradient-to-br from-sky-500/20 to-purple-500/20 blur-xl scale-150 group-hover/new-card:scale-175 transition-transform duration-300' />

					{/* Main Icon */}
					<div className='relative rounded-full bg-gradient-to-br from-sky-600 to-sky-700 p-4 shadow-lg shadow-sky-600/25 group-hover/new-card:shadow-xl group-hover/new-card:shadow-sky-600/40 transition-all duration-300'>
						<Plus className='h-6 w-6 text-white' />
					</div>
				</motion.div>

				{/* Text Content */}
				<div
					className={cn(
						'space-y-1',
						viewMode === 'list' && 'space-y-0 text-left'
					)}
				>
					<h3 className='font-semibold text-white group-hover:text-sky-100 transition-colors duration-200'>
						Create New Map
					</h3>

					<p className='text-sm text-zinc-400 group-hover/new-card:text-zinc-300 transition-colors duration-200'>
						Start organizing your ideas
					</p>
				</div>

				{/* Subtle Arrow Indicator for List View */}
				{viewMode === 'list' && (
					<motion.div
						animate={{ x: [0, 4, 0] }}
						transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
						className='ml-auto opacity-0 group-hover/new-card:opacity-100 transition-opacity duration-300'
					>
						<div className='w-2 h-2 border-r-2 border-t-2 border-sky-400 rotate-45' />
					</motion.div>
				)}
			</div>

			{/* Ripple Effect on Click */}
			<div className='absolute inset-0 rounded-inherit bg-sky-400/10 scale-0 blur-2xl group-active/new-card:scale-100 transition-transform duration-200 ease-out' />
		</motion.div>
	);
}
