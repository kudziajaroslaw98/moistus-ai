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
			return (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.2 }}
				>
					{preview.tasks && preview.tasks.length > 0 ? (
						<div className='space-y-1.5'>
							{preview.tasks.slice(0, 5).map((task: any, index: number) => (
								<motion.div
									key={index}
									className='flex items-center gap-2'
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{
										delay: index * 0.05,
										duration: 0.2,
										ease: 'easeOut',
									}}
								>
									<motion.div
										className='w-3 h-3 border border-zinc-600 rounded-sm'
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={{
											delay: index * 0.05 + 0.1,
											duration: 0.15,
											ease: 'easeOut',
										}}
									/>

									<motion.span
										className='text-sm'
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{
											delay: index * 0.05 + 0.15,
											duration: 0.2,
										}}
									>
										{task.text}
									</motion.span>
								</motion.div>
							))}

							{preview.tasks.length > 5 && (
								<motion.div
									className='text-xs text-zinc-500 pl-5'
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.3, duration: 0.2 }}
								>
									+{preview.tasks.length - 5} more tasks...
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
								initial={{ opacity: 0, x: -10 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: 0.15, duration: 0.2 }}
							>
								New task
							</motion.span>
						</motion.div>
					)}

					<motion.div
						className='mt-2 space-y-1'
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2, duration: 0.3 }}
					>
						{preview.dueDate && (
							<motion.div
								className='text-xs text-zinc-500'
								initial={{ opacity: 0, x: -10 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: 0.25, duration: 0.2 }}
							>
								Due: {preview.dueDate.toLocaleDateString()}
							</motion.div>
						)}

						{preview.priority && (
							<motion.div
								className='text-xs text-zinc-500'
								initial={{ opacity: 0, x: -10 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: 0.3, duration: 0.2 }}
							>
								Priority: {preview.priority}
							</motion.div>
						)}

						{preview.tasks && preview.tasks.length > 1 && (
							<motion.div
								className='text-xs text-zinc-500'
								initial={{ opacity: 0, x: -10 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: 0.35, duration: 0.2 }}
							>
								Total tasks: {preview.tasks.length}
							</motion.div>
						)}
					</motion.div>
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
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.2, ease: 'easeOut' }}
				>
					{preview.content || preview.text || preview.question || 'Preview'}
				</motion.div>
			);
	}
};
