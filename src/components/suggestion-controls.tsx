'use client';

import { Button } from '@/components/ui/button';
import { useNodeSuggestion } from '@/hooks/use-node-suggestion';
import { cn } from '@/lib/utils';
import useAppStore from '@/store/mind-map-store';
import {
	AlertCircle,
	Lightbulb,
	Loader2,
	RefreshCw,
	Sparkles,
	X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';

interface SuggestionControlsProps {
	className?: string;
}

export function SuggestionControls({ className }: SuggestionControlsProps) {
	const { ghostNodes, isGeneratingSuggestions, suggestionError } = useAppStore(
		useShallow((state) => ({
			ghostNodes: state.ghostNodes,
			isGeneratingSuggestions: state.isGeneratingSuggestions,
			suggestionError: state.suggestionError,
		}))
	);

	const { clearAllSuggestions, retry, isGenerating } = useNodeSuggestion();

	const hasSuggestions = ghostNodes.length > 0;
	const hasError = !!suggestionError;
	const isLoading = isGenerating || isGeneratingSuggestions;

	// Don't show if no suggestions and not loading/error
	if (!hasSuggestions && !isLoading && !hasError) {
		return null;
	}

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: 20 }}
				className={cn(
					'bg-zinc-900/95 border border-zinc-700/50',
					'rounded-lg p-4 shadow-xl',
					'min-w-[280px] max-w-[400px]',
					className
				)}
			>
				{/* Header */}
				<div className='flex items-center justify-between mb-3'>
					<div className='flex items-center gap-2'>
						<Sparkles className='h-4 w-4 text-blue-400' />

						<span className='text-sm font-medium text-zinc-200'>
							AI Suggestions
						</span>
					</div>

					{hasSuggestions && (
						<Button
							onClick={clearAllSuggestions}
							variant='ghost'
							size='sm'
							className='h-6 w-6 p-0 text-zinc-400 hover:text-zinc-200'
							aria-label='Clear all suggestions'
						>
							<X className='h-3 w-3' />
						</Button>
					)}
				</div>

				{/* Loading State */}
				{isLoading && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className='flex items-center gap-2 text-zinc-400 text-sm'
					>
						<Loader2 className='h-4 w-4 animate-spin' />

						<span>Generating suggestions...</span>
					</motion.div>
				)}

				{/* Error State */}
				{hasError && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className='space-y-2'
					>
						<div className='flex items-center gap-2 text-red-400 text-sm'>
							<AlertCircle className='h-4 w-4' />

							<span>Error generating suggestions</span>
						</div>

						<p className='text-xs text-zinc-500 leading-relaxed'>
							{suggestionError}
						</p>

						<Button
							onClick={retry}
							variant='secondary'
							size='sm'
							className='w-full mt-2'
						>
							<RefreshCw className='h-3 w-3 mr-1' />
							Try Again
						</Button>
					</motion.div>
				)}

				{/* Suggestions Count */}
				{hasSuggestions && !isLoading && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className='space-y-3'
					>
						<div className='flex items-center gap-2 text-zinc-300 text-sm'>
							<Lightbulb className='h-4 w-4 text-yellow-400' />

							<span>
								{ghostNodes.length} suggestion
								{ghostNodes.length !== 1 ? 's' : ''} available
							</span>
						</div>

						<div className='text-xs text-zinc-500 leading-relaxed'>
							Click the checkmark (✓) to add a suggestion to your mind map, or
							the X to dismiss it.
						</div>

						<div className='flex gap-2'>
							<Button
								onClick={clearAllSuggestions}
								variant='secondary'
								size='sm'
								className='flex-1'
							>
								<X className='h-3 w-3 mr-1' />
								Clear All
							</Button>
						</div>
					</motion.div>
				)}

				{/* Suggestion Quality Indicator */}
				{hasSuggestions && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className='mt-3 pt-3 border-t border-zinc-700/50'
					>
						<div className='text-xs text-zinc-500'>
							Confidence:{' '}
							{ghostNodes.map((node, index) => {
								const confidence = node.data.metadata?.confidence || 0;
								return (
									<span key={node.id}>
										<span
											className={cn(
												'font-medium',
												confidence >= 0.8
													? 'text-green-400'
													: confidence >= 0.6
														? 'text-yellow-400'
														: 'text-red-400'
											)}
										>
											{Math.round(confidence * 100)}%
										</span>

										{index < ghostNodes.length - 1 && ', '}
									</span>
								);
							})}
						</div>
					</motion.div>
				)}
			</motion.div>
		</AnimatePresence>
	);
}
