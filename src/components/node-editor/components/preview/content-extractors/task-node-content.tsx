'use client';

import { TaskContent, type Task } from '@/components/nodes/content/task-content';
import { TaskNodeMetadata } from '@/components/nodes/core/types';
import { NodeData } from '@/types/node-data';
import { memo, useMemo } from 'react';

interface TaskNodeContentProps {
	data: NodeData;
}

/**
 * Task Node Content Adapter for Preview
 *
 * Thin wrapper around shared TaskContent component.
 * Non-interactive (read-only) - no onTaskToggle callback.
 */
const TaskNodeContentComponent = ({ data }: TaskNodeContentProps) => {
	const tasks = useMemo(
		(): Task[] => (data.metadata as TaskNodeMetadata)?.tasks || [],
		[data.metadata]
	);

	return (
		<TaskContent
			tasks={tasks}
			placeholder='Add tasks...'
			showCelebrationEmoji={false}
		/>
	);
};

export const TaskNodeContent = memo(TaskNodeContentComponent);
TaskNodeContent.displayName = 'TaskNodeContent';
