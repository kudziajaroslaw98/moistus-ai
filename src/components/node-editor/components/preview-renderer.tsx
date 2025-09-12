'use client';

import { cn } from '@/utils/cn';
import { motion } from 'motion/react';

interface PreviewRendererProps {
	preview: any;
	nodeType: string;
}

// Helper function to get pattern labels for better UX
const getPatternLabel = (patternType: string, display: string): { label: string; value: string } => {
	switch (patternType) {
		case 'date':
			return { label: 'Due:', value: display };
		case 'priority':
			return { label: 'Priority:', value: display };
		case 'tag':
			return { label: 'Tags:', value: display };
		case 'assignee':
			return { label: 'Assigned:', value: display };
		case 'color':
			return { label: 'Color:', value: display };
		default:
			return { label: '', value: display };
	}
};

// Helper function to get consistent styling for pattern types
const getPatternStyles = (patternType: string) => {
	switch (patternType) {
		case 'date':
			return {
				background: 'bg-blue-500/10',
				text: 'text-blue-400',
				border: 'border border-blue-500/20',
				icon: 'text-blue-400',
				emoji: '📅'
			};
		case 'priority':
			return {
				background: 'bg-red-500/10',
				text: 'text-red-400',
				border: 'border border-red-500/20',
				icon: 'text-red-400',
				emoji: '🔥'
			};
		case 'color':
			return {
				background: 'bg-purple-500/10',
				text: 'text-purple-400',
				border: 'border border-purple-500/20',
				icon: 'text-purple-400',
				emoji: '🎨'
			};
		case 'tag':
			return {
				background: 'bg-green-500/10',
				text: 'text-green-400',
				border: 'border border-green-500/20',
				icon: 'text-green-400',
				emoji: '🏷️'
			};
		case 'assignee':
			return {
				background: 'bg-orange-500/10',
				text: 'text-orange-400',
				border: 'border border-orange-500/20',
				icon: 'text-orange-400',
				emoji: '👤'
			};
		default:
			return {
				background: 'bg-zinc-700/50',
				text: 'text-zinc-400',
				border: 'border border-zinc-600/50',
				icon: 'text-zinc-400',
				emoji: '•'
			};
	}
};

export const PreviewRenderer: React.FC<PreviewRendererProps> = ({
	preview,
	nodeType,
}) => {
	if (!preview) return null;

	switch (nodeType) {
		case 'taskNode':
			// Handle both old format (preview.tasks) and new format (preview.metadata.tasks)
			const tasks = preview.tasks || (preview.metadata && preview.metadata.tasks) || [];
			// Handle metadata from either location
			const metadata = preview.metadata || preview;
			
			return (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.2 }}
				>
					{tasks && tasks.length > 0 ? (
						<div className='space-y-1.5'>
							{tasks.slice(0, 5).map((task: any, index: number) => (
								<motion.div
									key={index}
									className='space-y-1'
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{
										delay: index * 0.05,
										duration: 0.2,
										ease: 'easeOut',
									}}
								>
									{/* Task checkbox and text */}
									<div className='flex items-center gap-2'>
										<motion.div
											className={cn(
												'w-3 h-3 border border-zinc-600 rounded-sm flex items-center justify-center',
												task.isComplete && 'bg-teal-500 border-teal-500'
											)}
											data-iscomplete={task.isComplete}
											data-task-text={task.text}
											initial={{ scale: 0 }}
											animate={{ scale: 1 }}
											transition={{
												delay: index * 0.05 + 0.1,
												duration: 0.15,
												ease: 'easeOut',
											}}
										>
											{task.isComplete && (
												<motion.div
													className='text-white text-xs'
													initial={{ scale: 0 }}
													animate={{ scale: 1 }}
													transition={{
														delay: index * 0.05 + 0.2,
														duration: 0.15,
													}}
												>
													✓
												</motion.div>
											)}
										</motion.div>

										<motion.span
											className={cn(
												'text-sm',
												task.isComplete && 'line-through text-zinc-500'
											)}
											style={{ 
												color: task.isComplete ? 'rgb(113, 113, 122)' : 'rgb(212, 212, 216)',
												fontSize: '16px',
												lineHeight: '1.4'
											}}
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											transition={{
												delay: index * 0.05 + 0.15,
												duration: 0.2,
											}}
										>
											{task.text}
										</motion.span>
									</div>

								</motion.div>
							))}

							{tasks.length > 5 && (
								<motion.div
									className='text-xs text-zinc-500 pl-5'
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.3, duration: 0.2 }}
								>
									+{tasks.length - 5} more tasks...
								</motion.div>
							)}
						</div>
					) : (
						<motion.div
							className='flex items-center gap-2'
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.2, ease: 'easeOut' }}
						>
							<motion.div
								className='w-4 h-4 border border-zinc-600 rounded'
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								transition={{ delay: 0.1, duration: 0.15 }}
							/>

							<motion.span
								style={{ 
									color: 'rgb(212, 212, 216)',
									fontSize: '16px',
									lineHeight: '1.4'
								}}
								initial={{ opacity: 0, x: -10 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: 0.15, duration: 0.2 }}
							>
								New task
							</motion.span>
						</motion.div>
					)}

					{/* Node-level metadata display */}
					{(metadata.dueDate || metadata.priority || (metadata.tags && metadata.tags.length > 0) || metadata.assignee) && (
						<motion.div
							className='mt-3 pt-2 border-t border-zinc-700/50 flex flex-wrap gap-1'
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.4, duration: 0.2 }}
						>
							{/* Due Date */}
							{metadata.dueDate && (
								<motion.div
									className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20'
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{ delay: 0.45, duration: 0.15 }}
								>
									<span className='opacity-70'>📅</span>
									<span className='flex items-center gap-0.5'>
										<span className='opacity-70 text-xs'>Due:</span>
										<span className='font-medium'>{metadata.dueDate.toLocaleDateString ? metadata.dueDate.toLocaleDateString() : metadata.dueDate}</span>
									</span>
								</motion.div>
							)}

							{/* Priority */}
							{metadata.priority && (
								<motion.div
									className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20'
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{ delay: 0.5, duration: 0.15 }}
								>
									<span className='opacity-70'>🔥</span>
									<span className='flex items-center gap-0.5'>
										<span className='opacity-70 text-xs'>Priority:</span>
										<span className='font-medium capitalize'>{metadata.priority}</span>
									</span>
								</motion.div>
							)}

							{/* Tags */}
							{metadata.tags && metadata.tags.length > 0 && metadata.tags.map((tag, tagIndex) => (
								<motion.div
									key={`tag-${tagIndex}`}
									className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20'
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{ delay: 0.55 + tagIndex * 0.05, duration: 0.15 }}
								>
									<span className='opacity-70'>🏷️</span>
									<span className='flex items-center gap-0.5'>
										<span className='font-medium'>{tag}</span>
									</span>
								</motion.div>
							))}

							{/* Assignee */}
							{metadata.assignee && (
								<motion.div
									className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20'
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{ delay: 0.6, duration: 0.15 }}
								>
									<span className='opacity-70'>👤</span>
									<span className='flex items-center gap-0.5'>
										<span className='opacity-70 text-xs'>Assigned:</span>
										<span className='font-medium'>{metadata.assignee}</span>
									</span>
								</motion.div>
							)}
						</motion.div>
					)}

				</motion.div>
			);

		case 'codeNode':
			return (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.2 }}
				>
					<motion.div
						className='text-xs text-teal-500 mb-1'
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.2, ease: 'easeOut' }}
					>
						{preview.language || 'plaintext'}
					</motion.div>

					<motion.pre
						className='text-xs overflow-x-auto'
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 0.1, duration: 0.25, ease: 'easeOut' }}
					>
						<code>{preview.code || '// Your code here'}</code>
					</motion.pre>
				</motion.div>
			);

		case 'imageNode':
			return (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.2 }}
				>
					<motion.div
						className='text-xs text-zinc-500 mb-1'
						initial={{ opacity: 0, y: -5 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.2 }}
					>
						Image URL:
					</motion.div>

					<motion.div
						className='text-xs truncate'
						initial={{ opacity: 0, x: -10 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: 0.1, duration: 0.2 }}
					>
						{preview.url}
					</motion.div>

					{preview.alt && (
						<motion.div
							className='text-xs text-zinc-500 mt-1'
							initial={{ opacity: 0, y: 5 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.15, duration: 0.2 }}
						>
							Alt: {preview.alt}
						</motion.div>
					)}
				</motion.div>
			);

		case 'annotationNode':
			return (
				<motion.div
					className={cn(
						'px-2 py-1 rounded',
						preview.type === 'warning' && 'bg-yellow-500/10 text-yellow-400',
						preview.type === 'error' && 'bg-red-500/10 text-red-400',
						preview.type === 'success' && 'bg-green-500/10 text-green-400',
						preview.type === 'info' && 'bg-blue-500/10 text-blue-400',
						(!preview.type || preview.type === 'note') &&
							'bg-zinc-700/50 text-zinc-300'
					)}
					initial={{ opacity: 0, scale: 0.9, y: 10 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					transition={{ duration: 0.25, ease: 'easeOut' }}
				>
					{preview.icon && (
						<motion.span
							className='mr-1'
							initial={{ opacity: 0, scale: 0 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0.1, duration: 0.2 }}
						>
							{preview.icon}
						</motion.span>
					)}

					<motion.span
						initial={{ opacity: 0, x: -10 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: 0.15, duration: 0.2 }}
					>
						{preview.text}
					</motion.span>
				</motion.div>
			);

		default:
			return (
				<motion.div
					className='text-sm'
					style={{ 
						color: 'rgb(212, 212, 216)',
						fontSize: '16px',
						lineHeight: '1.4'
					}}
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2, ease: 'easeOut' }}
				>
					{preview.content || preview.text || preview.question || 'Preview'}
				</motion.div>
			);
	}
};