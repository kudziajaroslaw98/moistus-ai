'use client';

import { cn } from '@/utils/cn';
import { motion } from 'motion/react';

interface PreviewRendererProps {
	preview: any;
	nodeType: string;
}

export const PreviewRenderer: React.FC<PreviewRendererProps> = ({
	preview,
	nodeType,
}) => {
	if (!preview) return null;

	switch (nodeType) {
		case 'taskNode':
			// Handle both old format (preview.tasks) and new format (preview.metadata.tasks)
			const tasks =
				preview.tasks || (preview.metadata && preview.metadata.tasks) || [];
			// Handle metadata from either location
			const metadata = preview.metadata || preview;

			return (
				<motion.div
					animate={{ opacity: 1 }}
					initial={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
				>
					{tasks && tasks.length > 0 ? (
						<div className='space-y-1.5'>
							{tasks.slice(0, 5).map((task: any, index: number) => (
								<motion.div
									animate={{ opacity: 1, x: 0 }}
									className='space-y-1'
									initial={{ opacity: 0, x: -20 }}
									key={index}
									transition={{
										delay: index * 0.05,
										duration: 0.2,
										ease: 'easeOut' as const,
									}}
								>
									{/* Task checkbox and text */}
									<div className='flex items-center gap-2'>
										<motion.div
											animate={{ scale: 1 }}
											data-iscomplete={task.isComplete || task.completed}
											data-task-text={task.text}
											initial={{ scale: 0 }}
											className={cn(
												'w-3 h-3 border border-zinc-600 rounded-sm flex items-center justify-center',
												(task.isComplete || task.completed) && 'bg-teal-500 border-teal-500'
											)}
											transition={{
												delay: index * 0.05 + 0.1,
												duration: 0.15,
												ease: 'easeOut' as const,
											}}
										>
											{(task.isComplete || task.completed) && (
												<motion.div
													animate={{ scale: 1 }}
													className='text-white text-xs'
													initial={{ scale: 0 }}
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
											animate={{ opacity: 1 }}
											initial={{ opacity: 0 }}
											className={cn(
												'text-sm',
												(task.isComplete || task.completed) && 'line-through text-zinc-500'
											)}
											style={{
												color: (task.isComplete || task.completed)
													? 'rgb(113, 113, 122)'
													: 'rgb(212, 212, 216)',
												fontSize: '16px',
												lineHeight: '1.4',
											}}
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
									animate={{ opacity: 1, y: 0 }}
									className='text-xs text-zinc-500 pl-5'
									initial={{ opacity: 0, y: 10 }}
									transition={{ delay: 0.3, duration: 0.2 }}
								>
									+{tasks.length - 5} more tasks...
								</motion.div>
							)}
						</div>
					) : (
						<motion.div
							animate={{ opacity: 1, scale: 1 }}
							className='flex items-center gap-2'
							initial={{ opacity: 0, scale: 0.9 }}
							transition={{ duration: 0.2, ease: 'easeOut' as const }}
						>
							<motion.div
								animate={{ scale: 1 }}
								className='w-4 h-4 border border-zinc-600 rounded'
								initial={{ scale: 0 }}
								transition={{ delay: 0.1, duration: 0.15 }}
							/>

							<motion.span
								animate={{ opacity: 1, x: 0 }}
								initial={{ opacity: 0, x: -10 }}
								transition={{ delay: 0.15, duration: 0.2 }}
								style={{
									color: 'rgb(212, 212, 216)',
									fontSize: '16px',
									lineHeight: '1.4',
								}}
							>
								New task
							</motion.span>
						</motion.div>
					)}

					{/* Node-level metadata display */}
					{(metadata.dueDate ||
						metadata.priority ||
						metadata.status ||
						(metadata.tags && metadata.tags.length > 0) ||
						metadata.assignee) && (
						<motion.div
							animate={{ opacity: 1, y: 0 }}
							className='mt-3 pt-2 border-t border-zinc-700/50 flex flex-wrap gap-1'
							initial={{ opacity: 0, y: 10 }}
							transition={{ delay: 0.4, duration: 0.2 }}
						>
							{/* Due Date */}
							{metadata.dueDate && (
								<motion.div
									animate={{ opacity: 1, scale: 1 }}
									className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20'
									initial={{ opacity: 0, scale: 0.8 }}
									transition={{ delay: 0.45, duration: 0.15 }}
								>
									<span className='opacity-70'>📅</span>

									<span className='flex items-center gap-0.5'>
										<span className='opacity-70 text-xs'>Due:</span>

										<span className='font-medium'>
											{metadata.dueDate.toLocaleDateString
												? metadata.dueDate.toLocaleDateString()
												: metadata.dueDate}
										</span>
									</span>
								</motion.div>
							)}

							{/* Priority */}
							{metadata.priority && (
								<motion.div
									animate={{ opacity: 1, scale: 1 }}
									className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20'
									initial={{ opacity: 0, scale: 0.8 }}
									transition={{ delay: 0.5, duration: 0.15 }}
								>
									<span className='opacity-70'>🔥</span>

									<span className='flex items-center gap-0.5'>
										<span className='opacity-70 text-xs'>Priority:</span>

										<span className='font-medium capitalize'>
											{metadata.priority}
										</span>
									</span>
								</motion.div>
							)}

							{/* Status */}
							{metadata.status && (
								<motion.div
									animate={{ opacity: 1, scale: 1 }}
									className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20'
									initial={{ opacity: 0, scale: 0.8 }}
									transition={{ delay: 0.52, duration: 0.15 }}
								>
									<span className='opacity-70'>●</span>

									<span className='flex items-center gap-0.5'>
										<span className='opacity-70 text-xs'>Status:</span>

										<span className='font-medium capitalize'>
											{metadata.status}
										</span>
									</span>
								</motion.div>
							)}

							{/* Tags */}
							{metadata.tags &&
								metadata.tags.length > 0 &&
								metadata.tags.map((tag: string, tagIndex: number) => (
									<motion.div
										animate={{ opacity: 1, scale: 1 }}
										className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20'
										initial={{ opacity: 0, scale: 0.8 }}
										key={`tag-${tagIndex}`}
										transition={{
											delay: 0.55 + tagIndex * 0.05,
											duration: 0.15,
										}}
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
									animate={{ opacity: 1, scale: 1 }}
									className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20'
									initial={{ opacity: 0, scale: 0.8 }}
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
					animate={{ opacity: 1 }}
					initial={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
				>
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className='text-xs text-teal-500 mb-1'
						initial={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.2, ease: 'easeOut' as const }}
					>
						{preview.language || 'plaintext'}
					</motion.div>

					<motion.pre
						animate={{ opacity: 1, scale: 1 }}
						className='text-xs overflow-x-auto'
						initial={{ opacity: 0, scale: 0.95 }}
						transition={{ delay: 0.1, duration: 0.25, ease: 'easeOut' as const }}
					>
						<code>{preview.code || '// Your code here'}</code>
					</motion.pre>
				</motion.div>
			);

		case 'imageNode':
			return (
				<motion.div
					animate={{ opacity: 1 }}
					initial={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
				>
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className='text-xs text-zinc-500 mb-1'
						initial={{ opacity: 0, y: -5 }}
						transition={{ duration: 0.2 }}
					>
						Image URL:
					</motion.div>

					<motion.div
						animate={{ opacity: 1, x: 0 }}
						className='text-xs truncate'
						initial={{ opacity: 0, x: -10 }}
						transition={{ delay: 0.1, duration: 0.2 }}
					>
						{preview.url}
					</motion.div>

					{preview.alt && (
						<motion.div
							animate={{ opacity: 1, y: 0 }}
							className='text-xs text-zinc-500 mt-1'
							initial={{ opacity: 0, y: 5 }}
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
					animate={{ opacity: 1, scale: 1, y: 0 }}
					initial={{ opacity: 0, scale: 0.9, y: 10 }}
					transition={{ duration: 0.25, ease: 'easeOut' as const }}
					className={cn(
						'px-2 py-1 rounded',
						preview.type === 'warning' && 'bg-yellow-500/10 text-yellow-400',
						preview.type === 'error' && 'bg-red-500/10 text-red-400',
						preview.type === 'success' && 'bg-green-500/10 text-green-400',
						preview.type === 'info' && 'bg-blue-500/10 text-blue-400',
						(!preview.type || preview.type === 'note') &&
							'bg-zinc-700/50 text-zinc-300'
					)}
				>
					{preview.icon && (
						<motion.span
							animate={{ opacity: 1, scale: 1 }}
							className='mr-1'
							initial={{ opacity: 0, scale: 0 }}
							transition={{ delay: 0.1, duration: 0.2 }}
						>
							{preview.icon}
						</motion.span>
					)}

					<motion.span
						animate={{ opacity: 1, x: 0 }}
						initial={{ opacity: 0, x: -10 }}
						transition={{ delay: 0.15, duration: 0.2 }}
					>
						{preview.text}
					</motion.span>
				</motion.div>
			);

		case 'referenceNode':
			return (
				<motion.div
					animate={{ opacity: 1 }}
					className='space-y-2'
					initial={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
				>
					{preview.referencePreview ? (
						<div className='space-y-2'>
							<div className='flex items-center gap-2'>
								<span className='text-pink-400'>🔗</span>

								<span className='text-pink-400 font-medium'>
									Reference Selected
								</span>
							</div>

							<blockquote className='border-l-2 border-pink-500/30 pl-3 text-sm text-zinc-300 italic'>
								&quot;
								{preview.referencePreview.contentSnippet?.slice(0, 100) ||
									'Referenced content...'}
								&quot;
							</blockquote>

							<div className='text-xs text-pink-300'>
								From:{' '}

								<span className='font-medium'>
									{preview.referencePreview.targetMapTitle || 'Unknown Map'}
								</span>
							</div>
						</div>
					) : (
						<div className='flex items-center gap-2 text-zinc-500'>
							<span>🔗</span>

							<span className='text-sm'>
								Type to search for nodes to reference...
							</span>
						</div>
					)}
				</motion.div>
			);

		default:
			// Handle metadata from either location
			const defaultMetadata = preview.metadata || preview;

			return (
				<motion.div
					animate={{ opacity: 1 }}
					initial={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
				>
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className='text-sm'
						initial={{ opacity: 0, y: 10 }}
						transition={{ duration: 0.2, ease: 'easeOut' as const }}
						style={{
							color: 'rgb(212, 212, 216)',
							fontSize: '16px',
							lineHeight: '1.4',
						}}
					>
						{preview.content || preview.text || preview.question || 'Preview'}
					</motion.div>

					{/* Metadata display for default/note nodes */}
					{(defaultMetadata.dueDate ||
						defaultMetadata.priority ||
						defaultMetadata.status ||
						(defaultMetadata.tags && defaultMetadata.tags.length > 0) ||
						defaultMetadata.assignee) && (
						<motion.div
							animate={{ opacity: 1, y: 0 }}
							className='mt-3 pt-2 border-t border-zinc-700/50 flex flex-wrap gap-1'
							initial={{ opacity: 0, y: 10 }}
							transition={{ delay: 0.3, duration: 0.2 }}
						>
							{/* Due Date */}
							{defaultMetadata.dueDate && (
								<motion.div
									animate={{ opacity: 1, scale: 1 }}
									className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20'
									initial={{ opacity: 0, scale: 0.8 }}
									transition={{ delay: 0.35, duration: 0.15 }}
								>
									<span className='opacity-70'>📅</span>

									<span className='flex items-center gap-0.5'>
										<span className='opacity-70 text-xs'>Due:</span>

										<span className='font-medium'>
											{typeof defaultMetadata.dueDate === 'object' &&
											defaultMetadata.dueDate.toLocaleDateString
												? defaultMetadata.dueDate.toLocaleDateString()
												: defaultMetadata.dueDate}
										</span>
									</span>
								</motion.div>
							)}

							{/* Priority */}
							{defaultMetadata.priority && (
								<motion.div
									animate={{ opacity: 1, scale: 1 }}
									className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20'
									initial={{ opacity: 0, scale: 0.8 }}
									transition={{ delay: 0.4, duration: 0.15 }}
								>
									<span className='opacity-70'>🔥</span>

									<span className='flex items-center gap-0.5'>
										<span className='opacity-70 text-xs'>Priority:</span>

										<span className='font-medium capitalize'>
											{defaultMetadata.priority}
										</span>
									</span>
								</motion.div>
							)}

							{/* Status */}
							{defaultMetadata.status && (
								<motion.div
									animate={{ opacity: 1, scale: 1 }}
									className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20'
									initial={{ opacity: 0, scale: 0.8 }}
									transition={{ delay: 0.45, duration: 0.15 }}
								>
									<span className='opacity-70'>●</span>

									<span className='flex items-center gap-0.5'>
										<span className='opacity-70 text-xs'>Status:</span>

										<span className='font-medium capitalize'>
											{defaultMetadata.status}
										</span>
									</span>
								</motion.div>
							)}

							{/* Tags */}
							{defaultMetadata.tags &&
								defaultMetadata.tags.length > 0 &&
								defaultMetadata.tags.map((tag: string, tagIndex: number) => (
									<motion.div
										animate={{ opacity: 1, scale: 1 }}
										className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20'
										initial={{ opacity: 0, scale: 0.8 }}
										key={`tag-${tagIndex}`}
										transition={{
											delay: 0.5 + tagIndex * 0.05,
											duration: 0.15,
										}}
									>
										<span className='opacity-70'>🏷️</span>

										<span className='flex items-center gap-0.5'>
											<span className='font-medium'>{tag}</span>
										</span>
									</motion.div>
								))}

							{/* Assignee */}
							{defaultMetadata.assignee && (
								<motion.div
									animate={{ opacity: 1, scale: 1 }}
									className='inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20'
									initial={{ opacity: 0, scale: 0.8 }}
									transition={{ delay: 0.55, duration: 0.15 }}
								>
									<span className='opacity-70'>👤</span>

									<span className='flex items-center gap-0.5'>
										<span className='opacity-70 text-xs'>Assigned:</span>

										<span className='font-medium'>
											{Array.isArray(defaultMetadata.assignee)
												? defaultMetadata.assignee.join(', ')
												: defaultMetadata.assignee}
										</span>
									</span>
								</motion.div>
							)}
						</motion.div>
					)}
				</motion.div>
			);
	}
};
