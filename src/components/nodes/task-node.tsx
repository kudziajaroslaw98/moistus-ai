'use client';

import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import { Check, CheckSquare } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { BaseNodeWrapper } from './base-node-wrapper';
import { motion } from 'motion/react';
import { GlassmorphismTheme } from './themes/glassmorphism-theme';
import { type TypedNodeProps, type TaskNodeMetadata } from './core/types';

type TaskNodeProps = TypedNodeProps<'taskNode'>;

const TaskNodeComponent = (props: TaskNodeProps) => {
	const { id, data } = props;
	const updateNode = useAppStore((state) => state.updateNode);

	const tasks = useMemo(
		() => (data.metadata as TaskNodeMetadata)?.tasks || [],
		[data.metadata]
	);

	const handleToggleTask = useCallback(
		async (taskId: string) => {
			const updatedTasks = tasks.map((task) =>
				task.id === taskId ? { ...task, isComplete: !task.isComplete } : task
			);

			try {
				await updateNode({
					nodeId: id,
					data: { metadata: { ...data.metadata, tasks: updatedTasks } },
				});
			} catch (error) {
				console.error('Failed to save task status:', error);
			}
		},
		[tasks, updateNode, id, data.metadata]
	);

	// Calculate completion statistics
	const stats = useMemo(() => {
		const completed = tasks.filter(t => t.isComplete).length;
		const total = tasks.length;
		const percentage = total > 0 ? (completed / total) * 100 : 0;
		return { completed, total, percentage };
	}, [tasks]);

	return (
		<BaseNodeWrapper
			{...props}
			nodeClassName='task-node'
			nodeType='Tasks'
			nodeIcon={<CheckSquare className='size-4' />}
			hideNodeType
			elevation={1}
		>
			<div className='flex flex-col gap-3'>
				{tasks.length === 0 ? (
					<span style={{ 
						color: GlassmorphismTheme.text.disabled, 
						fontStyle: 'italic',
						fontSize: '14px',
						textAlign: 'center',
						padding: '8px 0'
					}}>
						Double click or click the menu to add tasks...
					</span>
				) : (
					<>
						{/* Progress indicator using Material Design principles */}
						<div className='space-y-2'>
							{/* Stats bar */}
							<div className='flex items-center justify-between text-sm'>
								<span style={{ color: GlassmorphismTheme.text.medium }}>
									Progress
								</span>

								<span style={{ 
									color: stats.percentage === 100 
										? GlassmorphismTheme.indicators.status.complete
										: GlassmorphismTheme.text.high
								}}>
									{stats.completed}/{stats.total}
								</span>
							</div>
							
							{/* Progress bar with Material Design semantic colors */}
							<div className='relative w-full h-1 rounded-full overflow-hidden'
								style={{ backgroundColor: GlassmorphismTheme.indicators.progress.background }}>
								<motion.div 
									className='h-full rounded-full'
									style={{ 
										width: `${stats.percentage}%`,
										background: stats.percentage === 100
											? GlassmorphismTheme.indicators.progress.completeFill // Green for complete
											: GlassmorphismTheme.indicators.progress.fill, // Blue for in-progress
										transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
									}}
									initial={{ width: 0 }}
									animate={{ width: `${stats.percentage}%` }}
								/>
							</div>
						</div>

						{/* Task list with Material Design interaction patterns */}
						<div className='flex flex-col gap-1'>
							{tasks.map((task, index) => (
								<motion.div 
									key={task.id} 
									className={cn(
										'flex items-start gap-3 p-2 -mx-2 rounded-md transition-all cursor-pointer group',
										'hover:bg-white/[0.03]'
									)}
									onClick={() => handleToggleTask(task.id)}
									initial={{ opacity: 0, x: -10 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: index * 0.05 }}
								>
									{/* Custom checkbox following Material Design */}
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
													initial={{ scale: 0, opacity: 0 }}
													animate={{ scale: 1, opacity: 1 }}
													transition={{ type: 'spring', stiffness: 500 }}
													className='absolute inset-0 flex items-center justify-center'
												>
													<Check 
														className='w-3 h-3' 
														style={{ color: GlassmorphismTheme.indicators.status.complete }}
													/>
												</motion.div>
											)}
										</div>
									</div>

									{/* Task text with proper emphasis hierarchy */}
									<span
										className={cn([
											'flex-1 select-none transition-all duration-200',
											task.isComplete && 'line-through'
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
											<span style={{ 
												fontStyle: 'italic',
												color: GlassmorphismTheme.text.disabled
											}}>
												Empty task
											</span>
										)}
									</span>
								</motion.div>
							))}
						</div>

						{/* Completion celebration - subtle animation */}
						{stats.percentage === 100 && (
							<motion.div
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								className='text-center py-2 px-3 rounded-md'
								style={{
									backgroundColor: 'rgba(52, 211, 153, 0.1)',
									border: `1px solid ${GlassmorphismTheme.indicators.status.complete}`,
								}}
							>
								<span style={{ 
									color: GlassmorphismTheme.indicators.status.complete,
									fontSize: '13px',
									fontWeight: 500
								}}>
									All tasks complete! 🎉
								</span>
							</motion.div>
						)}
					</>
				)}
			</div>
		</BaseNodeWrapper>
	);
};

const TaskNode = memo(TaskNodeComponent);
TaskNode.displayName = 'TaskNode';
export default TaskNode;