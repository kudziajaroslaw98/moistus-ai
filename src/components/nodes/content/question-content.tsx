'use client';

import { cn } from '@/lib/utils';
import { memo, useMemo } from 'react';

export interface QuestionOption {
	id: string;
	label: string;
}

export interface QuestionContentProps {
	/** Question text */
	content?: string | null;
	/** Question type: binary (yes/no) or multiple choice */
	questionType?: 'binary' | 'multiple';
	/** Options for multiple choice */
	options?: QuestionOption[];
	/** User's response (boolean for binary, string/string[] for multiple) */
	userResponse?: boolean | string | string[];
	/** Whether the question has been answered */
	isAnswered?: boolean;
	/** Placeholder when no content */
	placeholder?: string;
	/** Callback when binary option clicked */
	onBinarySelect?: (value: boolean) => void;
	/** Callback when multiple choice option clicked */
	onOptionSelect?: (optionId: string) => void;
	/** Additional class name */
	className?: string;
}

/**
 * Question Content Component
 *
 * Pure rendering component for questions with response options.
 * Used by both canvas nodes and preview system.
 *
 * Features:
 * - Binary (yes/no) questions
 * - Multiple choice questions
 * - Visual feedback for selected options
 * - Answered status indicator
 */
const QuestionContentComponent = ({
	content,
	questionType = 'binary',
	options,
	userResponse,
	isAnswered,
	placeholder = 'Add a question...',
	onBinarySelect,
	onOptionSelect,
	className,
}: QuestionContentProps) => {
	// Clean the question text (remove brackets from pattern syntax)
	const cleanQuestionText = useMemo(() => {
		return content?.replace(/\[.*?\]/g, '').trim() || '';
	}, [content]);

	// Get options for multiple choice with defaults
	const displayOptions = useMemo(() => {
		if (options && options.length > 0) {
			return options;
		}
		return [
			{ id: '1', label: 'Option A' },
			{ id: '2', label: 'Option B' },
			{ id: '3', label: 'Option C' },
		];
	}, [options]);

	const hasAnswer = isAnswered || userResponse !== undefined;
	const isInteractive = Boolean(onBinarySelect || onOptionSelect);

	return (
		<div className={cn('flex flex-col gap-3', className)}>
			{/* Question content */}
			<div className='relative'>
				<div className='text-center px-2'>
					{content ? (
						<h3 className='font-medium leading-5 text-text-primary text-base'>
							{cleanQuestionText}
						</h3>
					) : (
						<span className='text-text-disabled text-sm italic'>
							{placeholder}
						</span>
					)}
				</div>
			</div>

			{/* Response Section */}
			{content && (
				<div className='space-y-3'>
					{questionType === 'binary' && (
						<div className='flex items-center justify-center gap-2'>
							{/* Yes button */}
							<div
								onClick={isInteractive ? () => onBinarySelect?.(true) : undefined}
								className={cn(
									'px-4 py-2 rounded-md text-sm font-medium transition-all',
									userResponse === true
										? 'bg-success-500/20 border border-success-500/30 text-success-500'
										: 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400',
									isInteractive && 'cursor-pointer hover:bg-zinc-700/50'
								)}
							>
								Yes
							</div>
							{/* No button */}
							<div
								onClick={isInteractive ? () => onBinarySelect?.(false) : undefined}
								className={cn(
									'px-4 py-2 rounded-md text-sm font-medium transition-all',
									userResponse === false
										? 'bg-red-500/20 border border-red-500/30 text-red-400'
										: 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400',
									isInteractive && 'cursor-pointer hover:bg-zinc-700/50'
								)}
							>
								No
							</div>
						</div>
					)}

					{questionType === 'multiple' && (
						<div className='flex flex-col gap-2'>
							{displayOptions.map((option) => {
								const isSelected = Array.isArray(userResponse)
									? userResponse.includes(option.id)
									: userResponse === option.id;

								return (
									<div
										key={option.id}
										onClick={isInteractive ? () => onOptionSelect?.(option.id) : undefined}
										className={cn(
											'px-3 py-2 rounded-md text-sm transition-all text-left',
											isSelected
												? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
												: 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400',
											isInteractive && 'cursor-pointer hover:bg-zinc-700/50'
										)}
									>
										{option.label}
									</div>
								);
							})}
						</div>
					)}

					{/* Status indicator */}
					{hasAnswer && (
						<div className='flex justify-center'>
							<div
								className='px-2 py-1 rounded-full text-xs'
								style={{
									backgroundColor: 'rgba(34, 197, 94, 0.1)',
									color: '#22c55e',
									fontSize: '11px',
								}}
							>
								Answered
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export const QuestionContent = memo(QuestionContentComponent);
QuestionContent.displayName = 'QuestionContent';
