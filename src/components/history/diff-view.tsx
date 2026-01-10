'use client';

import { formatDelta } from '@/helpers/history/diff-formatter';
import { HistoryDelta } from '@/types/history-state';
import { AlertCircle, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ChangeItem } from './change-item';

interface DiffViewProps {
	delta: HistoryDelta | null;
	isLoading?: boolean;
	error?: string | null;
}

export function DiffView({ delta, isLoading, error }: DiffViewProps) {
	// Loading state
	if (isLoading) {
		return (
			<motion.div
				animate={{ opacity: 1 }}
				className='flex items-center justify-center gap-2 py-4'
				exit={{ opacity: 0 }}
				initial={{ opacity: 0 }}
				transition={{ ease: [0.215, 0.61, 0.355, 1], duration: 0.2 }}
			>
				<Loader2 className='h-4 w-4 animate-spin text-white/60' />

				<span className='text-sm text-white/60'>Loading changes...</span>
			</motion.div>
		);
	}

	// Error state
	if (error) {
		return (
			<motion.div
				animate={{ opacity: 1 }}
				className='flex items-start gap-2 rounded p-3 bg-red-500/10 border border-red-500/30'
				exit={{ opacity: 0 }}
				initial={{ opacity: 0 }}
				transition={{ ease: [0.215, 0.61, 0.355, 1], duration: 0.2 }}
			>
				<AlertCircle className='h-4 w-4 text-red-400 shrink-0 mt-0.5' />

				<div className='flex flex-col gap-1'>
					<span className='text-sm text-red-400 font-medium'>
						Failed to load changes
					</span>

					<span className='text-xs text-red-400/80'>{error}</span>
				</div>
			</motion.div>
		);
	}

	// No delta
	if (!delta) {
		return (
			<motion.div
				animate={{ opacity: 1 }}
				className='py-4 text-center text-sm text-white/38'
				exit={{ opacity: 0 }}
				initial={{ opacity: 0 }}
				transition={{ ease: [0.215, 0.61, 0.355, 1], duration: 0.2 }}
			>
				No change details available
			</motion.div>
		);
	}

	const formatted = formatDelta(delta);

	return (
		<motion.div
			animate={{ opacity: 1, height: 'auto' }}
			className='flex flex-col gap-3 pt-3 max-h-96 overflow-y-auto'
			exit={{ opacity: 0, height: 0 }}
			initial={{ opacity: 0, height: 0 }}
			transition={{ ease: [0.215, 0.61, 0.355, 1], duration: 0.3 }}
		>
			{/* Changes list */}
			<div className='flex flex-col gap-2.5 pb-1'>
				<AnimatePresence mode='sync'>
					{formatted.changes.map((change, index) => (
						<ChangeItem
							details={change.details}
							entityType={change.entityType}
							index={index}
							key={`${change.operation}-${change.entityType}-${index}`}
							label={change.label}
							operation={change.operation}
							patches={change.patches}
						/>
					))}
				</AnimatePresence>
			</div>
		</motion.div>
	);
}
