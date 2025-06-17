'use client';

import useAppStore from '@/store/mind-map-store';
import { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import { Node, NodeProps } from '@xyflow/react';
import { Check, Dot, SquareCheck } from 'lucide-react'; // Import Square icon
import { memo, useCallback, useMemo } from 'react'; // Import useMemo
import { BaseNodeWrapper } from './base-node-wrapper';

interface Task {
	id: string;
	text: string;
	isComplete: boolean;
}

type TaskNodeProps = NodeProps<Node<NodeData>>;

const TaskNodeComponent = (props: TaskNodeProps) => {
	const { id, data } = props;
	const updateNode = useAppStore((state) => state.updateNode);

	const tasks: Task[] = useMemo(
		() => data.metadata?.tasks || [],
		[data.metadata?.tasks]
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
			nodeClassName='task-node'
			nodeType='Tasks'
			nodeIcon={<SquareCheck className='size-4' />}
		>
			<div className='flex flex-col gap-1.5'>
				{tasks.length === 0 ? (
					<span className='text-zinc-500 italic'>
						Double click or click the menu to add tasks...
					</span>
				) : (
					<>
						<div className='flex gap-2 items-center p-1 font-semibold'>
							<span>Tasks: {tasks.length}</span>

							<Dot className='size-4 text-zinc-700' />

							<span>
								Done: {tasks.filter((task) => task.isComplete).length}
							</span>
						</div>

						{tasks.map((task) => (
							<div key={task.id} className='flex items-start gap-2 text-sm'>
								<button
									onClick={() => handleToggleTask(task.id)}
									className='nodrag flex-shrink-0 cursor-pointer rounded p-0.5 text-zinc-400 hover:text-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:ring-offset-1 focus:ring-offset-zinc-950'
									aria-label={
										task.isComplete
											? 'Mark task incomplete'
											: 'Mark task complete'
									}
								>
									{task.isComplete ? (
										<div className='size-4 flex justify-center items-center border-node-accent border text-node-accent rounded-sm'>
											<Check className='size-3' />
										</div>
									) : (
										<div className='size-4 text-node-text-secondary border border-node-text-secondary rounded-sm'></div>
									)}
								</button>

								<span
									className={cn([
										'break-words',
										task.isComplete
											? 'text-node-text-checked decoration line-through'
											: 'text-node-text-secondary',
									])}
								>
									{task.text || (
										<span className='italic text-zinc-600'>Empty task</span>
									)}
								</span>
							</div>
						))}
					</>
				)}
			</div>
		</BaseNodeWrapper>
	);
};

const TaskNode = memo(TaskNodeComponent);
TaskNode.displayName = 'TaskNode';
export default TaskNode;
