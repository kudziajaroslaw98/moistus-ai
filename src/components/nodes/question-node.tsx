'use client';

import { NodeData } from '@/types/node-data';
import { Node, NodeProps } from '@xyflow/react';
import { HelpCircle, Sparkles } from 'lucide-react';
import { memo } from 'react';
import { BaseNodeWrapper } from './base-node-wrapper';
import { motion, AnimatePresence } from 'motion/react';

type QuestionNodeProps = NodeProps<Node<NodeData>>;

const QuestionNodeComponent = (props: QuestionNodeProps) => {
	const { data } = props;
	const aiAnswer = data.aiData?.aiAnswer as string | undefined;
	const isAnswered = Boolean(aiAnswer);

	return (
		<BaseNodeWrapper
			{...props}
			nodeClassName='question-node'
			nodeType='Question'
			nodeIcon={<HelpCircle className='size-4' />}
			elevation={isAnswered ? 2 : 1} // Slightly elevated when answered
		>
			<div className='flex flex-col gap-4'>
				{/* Question content with emphasis hierarchy */}
				<div className='relative'>
					{/* Subtle question mark watermark - positioned better */}
					<div 
						className='absolute -top-2 -right-2 select-none pointer-events-none'
						style={{
							fontSize: '48px',
							fontWeight: 300,
							color: 'rgba(96, 165, 250, 0.03)',
							transform: 'rotate(12deg)',
						}}
					>
						?
					</div>
					
					{/* Main question text */}
					<div className='relative z-10 text-center px-2'>
						{data.content ? (
							<h3 style={{
								fontSize: '18px',
								fontWeight: 500,
								color: 'rgba(255, 255, 255, 0.87)', // High emphasis
								lineHeight: 1.4,
								letterSpacing: '0.01em',
							}}>
								{data.content}
							</h3>
						) : (
							<span style={{
								color: 'rgba(255, 255, 255, 0.38)',
								fontSize: '14px',
								fontStyle: 'italic',
							}}>
								Double click or click the menu to add a question...
							</span>
						)}
					</div>

					{/* Status indicator for unanswered questions */}
					{data.content && !isAnswered && (
						<motion.div 
							className='flex items-center justify-center gap-2 mt-3'
							initial={{ opacity: 0, y: -5 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3 }}
						>
							<div className='flex items-center gap-1.5 px-3 py-1 rounded-full'
								style={{
									backgroundColor: 'rgba(251, 191, 36, 0.1)', // Amber with low opacity
									border: '1px solid rgba(251, 191, 36, 0.2)',
								}}>
								<motion.div
									animate={{ 
										opacity: [0.4, 1, 0.4],
									}}
									transition={{ 
										duration: 2,
										repeat: Infinity,
										ease: 'easeInOut'
									}}
									className='w-1.5 h-1.5 rounded-full'
									style={{ backgroundColor: 'rgba(251, 191, 36, 0.8)' }}
								/>
								<span style={{
									fontSize: '12px',
									color: 'rgba(251, 191, 36, 0.87)',
									fontWeight: 500,
								}}>
									Awaiting answer
								</span>
							</div>
						</motion.div>
					)}
				</div>

				{/* AI Answer section with sophisticated styling */}
				<AnimatePresence>
					{aiAnswer && (
						<motion.div
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: 'auto' }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.3 }}
							className='overflow-hidden'
						>
							{/* Elegant divider with gradient */}
							<div className='relative py-3'>
								<div className='absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px]'
									style={{
										background: 'linear-gradient(90deg, transparent, rgba(147, 197, 253, 0.2) 30%, rgba(147, 197, 253, 0.2) 70%, transparent)',
									}}
								/>
								<div className='relative flex justify-center'>
									<div className='flex items-center gap-2 px-3 py-1.5 rounded-full'
										style={{
											backgroundColor: '#1E1E1E', // Elevation 1
											border: '1px solid rgba(147, 197, 253, 0.2)',
										}}>
										<Sparkles className='w-3 h-3' style={{ color: 'rgba(147, 197, 253, 0.87)' }} />
										<span style={{
											fontSize: '12px',
											color: 'rgba(147, 197, 253, 0.87)',
											fontWeight: 500,
											letterSpacing: '0.05em',
											textTransform: 'uppercase',
										}}>
											AI Answer
										</span>
									</div>
								</div>
							</div>

							{/* Answer content with glassmorphic container */}
							<div className='p-4 rounded-lg'
								style={{
									backgroundColor: 'rgba(96, 165, 250, 0.05)',
									border: '1px solid rgba(96, 165, 250, 0.1)',
									backdropFilter: 'blur(8px)',
								}}>
								<div style={{
									fontSize: '14px',
									color: 'rgba(255, 255, 255, 0.60)', // Medium emphasis for body text
									lineHeight: 1.7,
									letterSpacing: '0.01em',
								}}>
									{aiAnswer}
								</div>

								{/* Optional confidence indicator */}
								{data.aiData?.confidence && (
									<div className='mt-3 flex items-center gap-2'>
										<div className='flex-1 h-1 rounded-full overflow-hidden'
											style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }}>
											<div 
												className='h-full rounded-full transition-all duration-500'
												style={{
													width: `${data.aiData.confidence * 100}%`,
													backgroundColor: data.aiData.confidence > 0.8 
														? 'rgba(52, 211, 153, 0.5)'
														: data.aiData.confidence > 0.5
														? 'rgba(251, 191, 36, 0.5)'
														: 'rgba(239, 68, 68, 0.5)'
												}}
											/>
										</div>
										<span style={{
											fontSize: '11px',
											color: 'rgba(255, 255, 255, 0.38)',
										}}>
											{Math.round(data.aiData.confidence * 100)}% confidence
										</span>
									</div>
								)}
							</div>

							{/* Source attribution if available */}
							{data.aiData?.source && (
								<div className='mt-2 text-right'>
									<span style={{
										fontSize: '11px',
										color: 'rgba(255, 255, 255, 0.38)',
										fontStyle: 'italic',
									}}>
										Source: {data.aiData.source}
									</span>
								</div>
							)}
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</BaseNodeWrapper>
	);
};

const QuestionNode = memo(QuestionNodeComponent);
QuestionNode.displayName = 'QuestionNode';
export default QuestionNode;