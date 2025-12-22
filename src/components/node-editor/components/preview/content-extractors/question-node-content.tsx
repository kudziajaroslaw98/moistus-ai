'use client';

import { QuestionNodeMetadata } from '@/components/nodes/core/types';
import { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import { memo, useMemo } from 'react';

interface QuestionNodeContentProps {
	data: NodeData;
}

/**
 * Question Node Content - Question with response options
 * Extracted from: src/components/nodes/question-node.tsx
 */
const QuestionNodeContentComponent = ({ data }: QuestionNodeContentProps) => {
	const metadata = data.metadata as QuestionNodeMetadata;
	const questionType = metadata?.questionType || 'binary';
	const responseFormat = metadata?.responseFormat || {};
	const userResponse = metadata?.userResponse;
	const isAnswered = metadata?.isAnswered || Boolean(userResponse !== undefined);

	// Clean the question text (remove brackets)
	const cleanQuestionText = useMemo(() => {
		return data.content?.replace(/\[.*?\]/g, '').trim() || '';
	}, [data.content]);

	// Get options for multiple choice
	const options = useMemo(() => {
		if (responseFormat.options && responseFormat.options.length > 0) {
			return responseFormat.options;
		}
		return [
			{ id: '1', label: 'Option A' },
			{ id: '2', label: 'Option B' },
			{ id: '3', label: 'Option C' },
		];
	}, [responseFormat.options]);

	return (
		<div className='flex flex-col gap-3'>
			{/* Question content */}
			<div className='relative'>
				<div className='text-center px-2'>
					{data.content ? (
						<h3 className='font-medium leading-5 text-text-primary text-base'>
							{cleanQuestionText}
						</h3>
					) : (
						<span className='text-text-disabled text-sm italic'>
							Add a question...
						</span>
					)}
				</div>
			</div>

			{/* Response Section */}
			{data.content && (
				<div className='space-y-3'>
					{/* Response area */}
					<div>
						{questionType === 'binary' && (
							<div className='flex items-center justify-center gap-2'>
								{/* Yes button */}
								<div
									className={cn(
										'px-4 py-2 rounded-md text-sm font-medium transition-all',
										userResponse === true
											? 'bg-success-500/20 border border-success-500/30 text-success-500'
											: 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400'
									)}
								>
									Yes
								</div>
								{/* No button */}
								<div
									className={cn(
										'px-4 py-2 rounded-md text-sm font-medium transition-all',
										userResponse === false
											? 'bg-red-500/20 border border-red-500/30 text-red-400'
											: 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400'
									)}
								>
									No
								</div>
							</div>
						)}

						{questionType === 'multiple' && (
							<div className='flex flex-col gap-2'>
								{options.map((option) => {
									const isSelected = Array.isArray(userResponse)
										? userResponse.includes(option.id)
										: userResponse === option.id;

									return (
										<div
											key={option.id}
											className={cn(
												'px-3 py-2 rounded-md text-sm transition-all text-left',
												isSelected
													? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
													: 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-400'
											)}
										>
											{option.label}
										</div>
									);
								})}
							</div>
						)}
					</div>

					{/* Status indicator */}
					{isAnswered && (
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

export const QuestionNodeContent = memo(QuestionNodeContentComponent);
QuestionNodeContent.displayName = 'QuestionNodeContent';
