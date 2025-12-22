'use client';

import { TaskNodeMetadata } from '@/components/nodes/core/types';
import { GlassmorphismTheme } from '@/components/nodes/themes/glassmorphism-theme';
import { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import { memo, useMemo } from 'react';

interface TaskNodeContentProps {
	data: NodeData;
}

/**
 * Task Node Content - Task list with progress
 * Extracted from: src/components/nodes/task-node.tsx
 */
const TaskNodeContentComponent = ({ data }: TaskNodeContentProps) => {
	const tasks = useMemo(
		() => (data.metadata as TaskNodeMetadata)?.tasks || [],
		[data.metadata]
	);

	// Calculate completion statistics
	const stats = useMemo(() => {
		const completed = tasks.filter((t) => t.isComplete).length;
		const total = tasks.length;
		const percentage = total > 0 ? (completed / total) * 100 : 0;
		return { completed, total, percentage };
	}, [tasks]);

	if (tasks.length === 0) {
		return (
			<span
				style={{
					color: GlassmorphismTheme.text.disabled,
					fontStyle: 'italic',
					fontSize: '14px',
					textAlign: 'center',
					padding: '8px 0',
					display: 'block',
				}}
			>
				Add tasks...
			</span>
		);
	}

	return (
		<div className='flex flex-col gap-3'>
			{/* Progress indicator */}
			<div className='space-y-2'>
				<div className='flex items-center justify-between text-sm'>
					<span style={{ color: GlassmorphismTheme.text.medium }}>
						Progress
					</span>
					<span
						className='flex gap-1'
						style={{
							color:
								stats.percentage === 100
									? GlassmorphismTheme.indicators.status.complete
									: GlassmorphismTheme.text.high,
						}}
					>
						<span>{stats.completed}</span>
						<span>/</span>
						<span>{stats.total}</span>
					</span>
				</div>

				{/* Progress bar */}
				<div
					className='relative w-full h-1 rounded-full overflow-hidden'
					style={{
						backgroundColor: GlassmorphismTheme.indicators.progress.background,
					}}
				>
					<motion.div
						animate={{ width: `${stats.percentage}%` }}
						className='h-full rounded-full'
						initial={{ width: 0 }}
						style={{
							width: `${stats.percentage}%`,
							background:
								stats.percentage === 100
									? GlassmorphismTheme.indicators.progress.completeFill
									: GlassmorphismTheme.indicators.progress.fill,
							transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
						}}
					/>
				</div>
			</div>

			{/* Task list */}
			<div className='flex flex-col gap-1'>
				{tasks.map((task, index) => (
					<motion.div
						animate={{ opacity: 1, x: 0 }}
						initial={{ opacity: 0, x: -10 }}
						key={task.id || index}
						transition={{ delay: index * 0.05 }}
						className={cn(
							'flex items-start gap-3 p-2 -mx-2 rounded-md'
						)}
					>
						{/* Checkbox */}
						<div className='mt-0.5 flex-shrink-0'>
							<div
								className='relative w-5 h-5 rounded transition-all duration-200'
								style={{
									border: task.isComplete
										? `2px solid ${GlassmorphismTheme.indicators.status.complete}`
										: `2px solid ${GlassmorphismTheme.text.disabled}`,
									backgroundColor: task.isComplete
										? 'rgba(52, 211, 153, 0.15)'
										: 'transparent',
								}}
							>
								{task.isComplete && (
									<motion.div
										animate={{ scale: 1, opacity: 1 }}
										className='absolute inset-0 flex items-center justify-center'
										initial={{ scale: 0, opacity: 0 }}
										transition={{ type: 'spring', stiffness: 500 }}
									>
										<Check
											className='w-3 h-3'
											style={{
												color: GlassmorphismTheme.indicators.status.complete,
											}}
										/>
									</motion.div>
								)}
							</div>
						</div>

						{/* Task text */}
						<span
							className={cn([
								'flex-1 select-none transition-all duration-200',
								task.isComplete && 'line-through',
							])}
							style={{
								color: task.isComplete
									? GlassmorphismTheme.text.disabled
									: GlassmorphismTheme.text.high,
								fontSize: '14px',
								lineHeight: '20px',
							}}
						>
							{task.text || (
								<span
									style={{
										fontStyle: 'italic',
										color: GlassmorphismTheme.text.disabled,
									}}
								>
									Empty task
								</span>
							)}
						</span>
					</motion.div>
				))}
			</div>

			{/* Completion celebration */}
			{stats.percentage === 100 && (
				<motion.div
					animate={{ opacity: 1, scale: 1 }}
					className='text-center py-2 px-3 rounded-md'
					initial={{ opacity: 0, scale: 0.9 }}
					style={{
						backgroundColor: 'rgba(52, 211, 153, 0.1)',
						border: `1px solid ${GlassmorphismTheme.indicators.status.complete}`,
					}}
				>
					<span
						style={{
							color: GlassmorphismTheme.indicators.status.complete,
							fontSize: '13px',
							fontWeight: 500,
						}}
					>
						All tasks complete!
					</span>
				</motion.div>
			)}
		</div>
	);
};

export const TaskNodeContent = memo(TaskNodeContentComponent);
TaskNodeContent.displayName = 'TaskNodeContent';
