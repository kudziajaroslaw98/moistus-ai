'use client';

import { HelpCircle, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useState, useCallback, useMemo, useEffect } from 'react';
import { BaseNodeWrapper } from './base-node-wrapper';
import { type TypedNodeProps, type QuestionNodeMetadata } from './core/types';
import { GlassmorphismTheme } from './themes/glassmorphism-theme';
import useAppStore from '@/store/mind-map-store';

// Import response components
import { BinaryResponse } from './question-node/binary-response';
import { MultipleChoiceResponse } from './question-node/multiple-choice-response';
import { detectQuestionType, parseQuestionOptions } from './question-node/question-type-detector';

type QuestionNodeProps = TypedNodeProps<'questionNode'>;

const QuestionNodeComponent = (props: QuestionNodeProps) => {
	const { id, data } = props;
	const updateNode = useAppStore((state) => state.updateNode);

	const metadata = data.metadata as QuestionNodeMetadata;
	const [isExpanded, setIsExpanded] = useState(false);

	// AI answer for backward compatibility
	const aiAnswer = metadata?.answer;
	const hasAIAnswer = Boolean(aiAnswer);

	// Parse question content for type and options
	const parsedOptions = useMemo(() => {
		return parseQuestionOptions(data.content || '');
	}, [data.content]);

	// Determine question type
	const questionType = metadata?.questionType ||
		parsedOptions.questionType ||
		detectQuestionType(data.content || '');

	// Response system
	const userResponse = metadata?.userResponse;
	const responseFormat = metadata?.responseFormat || {};
	const isAnswered = metadata?.isAnswered || Boolean(userResponse !== undefined);

	// Update metadata when parsed options change
	useEffect(() => {
		const updates: Partial<QuestionNodeMetadata> = {};
		let needsUpdate = false;

		// Update question type if it changed
		if (parsedOptions.questionType && parsedOptions.questionType !== metadata?.questionType) {
			updates.questionType = parsedOptions.questionType;
			needsUpdate = true;
		}

		// Update options if they changed (compare by content, not just existence)
		if (parsedOptions.options) {
			const newOptions = parsedOptions.options.map((label, index) => ({
				id: `opt-${index}`,
				label: label.trim()
			}));

			// Check if options actually changed
			const existingOptions = responseFormat.options || [];
			const optionsChanged =
				newOptions.length !== existingOptions.length ||
				newOptions.some((opt, idx) =>
					!existingOptions[idx] || opt.label !== existingOptions[idx].label
				);

			if (optionsChanged) {
				updates.responseFormat = {
					...responseFormat,
					options: newOptions
				};
				// Also update question type to multiple when options are provided
				updates.questionType = 'multiple';
				needsUpdate = true;
			}
		} else if (parsedOptions.questionType === 'binary' && (responseFormat.options?.length ?? 0) > 0) {
			// Clear options if switching to binary
			updates.responseFormat = {
				...responseFormat,
				options: []
			};
			needsUpdate = true;
		}

		if (needsUpdate) {
			updateNode({
				nodeId: id,
				data: {
					metadata: {
						...metadata,
						...updates
					}
				},
			});
		}
	}, [data.content]); // Only depend on content changes, not on metadata

	const handleResponseChange = useCallback(async (newResponse: boolean | string | string[]) => {
		try {
			await updateNode({
				nodeId: id,
				data: {
					metadata: {
						...metadata,
						userResponse: newResponse,
						isAnswered: true,
						// Add to responses array for tracking
						responses: [
							...(metadata?.responses || []),
							{
								answer: newResponse,
								timestamp: new Date().toISOString()
							}
						].slice(-10) // Keep last 10 responses
					}
				},
			});
		} catch (error) {
			console.error('Failed to save response:', error);
		}
	}, [updateNode, id, metadata]);

	// Clean the question text (remove brackets)
	const cleanQuestionText = useMemo(() => {
		return data.content?.replace(/\[.*?\]/g, '').trim() || '';
	}, [data.content]);

	return (
		<BaseNodeWrapper
			{...props}
			nodeClassName='question-node'
			nodeType='Question'
			hideNodeType
			nodeIcon={<HelpCircle className='size-4' />}
			elevation={isAnswered ? 2 : 1}
		>
			<div className='flex flex-col gap-3'>
				{/* Question content */}
				<div className='relative'>
					{/* Main question text */}
					<div className='text-center px-2'>
						{data.content ? (
							<h3
								style={{
									fontSize: '16px',
									fontWeight: 500,
									color: GlassmorphismTheme.text.high,
									lineHeight: 1.4,
								}}
							>
								{cleanQuestionText}
							</h3>
						) : (
							<span
								style={{
									color: GlassmorphismTheme.text.disabled,
									fontSize: '14px',
									fontStyle: 'italic',
								}}
							>
								Click to add a question...
							</span>
						)}
					</div>
				</div>

				{/* Interactive Response Section - Always visible when there's content */}
				{data.content && (
					<div className='space-y-3'>
						{/* Response area */}
						<div>
							{questionType === 'binary' && (
								<BinaryResponse
									value={userResponse as boolean}
									onChange={handleResponseChange}
								/>
							)}

							{questionType === 'multiple' && (
								<MultipleChoiceResponse
									value={userResponse as string | string[]}
									onChange={handleResponseChange}
									options={
										responseFormat.options && responseFormat.options.length > 0
											? responseFormat.options
											: parsedOptions.options && parsedOptions.options.length > 0
												? parsedOptions.options.map((label, index) => ({
													id: `opt-${index}`,
													label: label.trim()
												}))
												: [
													{ id: '1', label: 'Option A' },
													{ id: '2', label: 'Option B' },
													{ id: '3', label: 'Option C' },
												]
									}
									allowMultiple={responseFormat.allowMultiple || false}
								/>
							)}
						</div>

						{/* Status indicator - minimal */}
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

				{/* AI Answer section (backward compatibility) - Collapsible */}
				{hasAIAnswer && (
					<div>
						<motion.button
							onClick={() => setIsExpanded(!isExpanded)}
							className='w-full flex items-center justify-center gap-2 py-1.5 rounded-md transition-all'
							style={{
								backgroundColor: 'rgba(147, 197, 253, 0.05)',
								border: '1px solid rgba(147, 197, 253, 0.1)',
							}}
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
						>
							<Sparkles
								className='w-3 h-3'
								style={{ color: 'rgba(147, 197, 253, 0.7)' }}
							/>

							<span
								style={{
									fontSize: '12px',
									color: 'rgba(147, 197, 253, 0.87)',
									fontWeight: 500,
								}}
							>
								AI Insight
							</span>

							{isExpanded ? (
								<ChevronUp className='w-3 h-3' style={{ color: 'rgba(147, 197, 253, 0.7)' }} />
							) : (
								<ChevronDown className='w-3 h-3' style={{ color: 'rgba(147, 197, 253, 0.7)' }} />
							)}
						</motion.button>

						<AnimatePresence>
							{isExpanded && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									exit={{ opacity: 0, height: 0 }}
									transition={{ duration: 0.2 }}
									className='overflow-hidden'
								>
									<div
										className='mt-2 p-3 rounded-md'
										style={{
											backgroundColor: 'rgba(147, 197, 253, 0.05)',
											border: '1px solid rgba(147, 197, 253, 0.1)',
										}}
									>
										<div
											style={{
												fontSize: '13px',
												color: GlassmorphismTheme.text.medium,
												lineHeight: 1.6,
											}}
										>
											{aiAnswer}
										</div>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				)}
			</div>
		</BaseNodeWrapper>
	);
};

const QuestionNode = memo(QuestionNodeComponent);
QuestionNode.displayName = 'QuestionNode';
export default QuestionNode;