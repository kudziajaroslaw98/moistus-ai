'use client';

import useAppStore from '@/store/mind-map-store';
import { CheckSquare } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { BaseNodeWrapper } from './base-node-wrapper';
import { TaskContent } from './content/task-content';
import { type TaskNodeMetadata, type TypedNodeProps } from './core/types';

type TaskNodeProps = TypedNodeProps<'taskNode'>;

/**
 * Task Node Component
 *
 * Displays interactive task list with progress tracking.
 * Uses shared TaskContent from content/task-content.tsx
 *
 * Features:
 * - Task toggle via onClick
 * - Progress bar with completion percentage
 * - Celebration message when all complete
 * - Persists changes to store/database
 */
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

	return (
		<BaseNodeWrapper
			{...props}
			hideNodeType
			elevation={1}
			nodeClassName='task-node'
			nodeIcon={<CheckSquare className='size-4' />}
			nodeType='Tasks'
		>
			<TaskContent
				tasks={tasks}
				onTaskToggle={handleToggleTask}
				placeholder='Double click or click the menu to add tasks...'
				showCelebrationEmoji={true}
			/>
		</BaseNodeWrapper>
	);
};

const TaskNode = memo(TaskNodeComponent);
TaskNode.displayName = 'TaskNode';
export default TaskNode;
