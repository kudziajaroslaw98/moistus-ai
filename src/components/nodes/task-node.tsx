'use client';

import useAppStore from '@/store/mind-map-store';
import { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import { Node, NodeProps } from '@xyflow/react';
import {
	Calendar,
	Check,
	CheckCheck,
	Dot,
	Flag,
	Plus,
	SquareCheck,
	Trash2,
	User,
} from 'lucide-react'; // Import Square icon
import { memo, useCallback, useMemo } from 'react'; // Import useMemo
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { BaseNodeWrapper } from './base-node-wrapper';
import { MetadataBadge, NodeTags } from './shared';

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

	const completedTasks = useMemo(
		() => tasks.filter((task) => task.isComplete),
		[tasks]
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

	const handleAddTask = useCallback(async () => {
		const newTask: Task = {
			id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			text: 'New task',
			isComplete: false,
		};

		const updatedTasks = [...tasks, newTask];

		try {
			await updateNode({
				nodeId: id,
				data: { metadata: { ...data.metadata, tasks: updatedTasks } },
			});
			toast.success('Task added');
		} catch (error) {
			console.error('Failed to add task:', error);
			toast.error('Failed to add task');
		}
	}, [tasks, updateNode, id, data.metadata]);

	const handleCompleteAll = useCallback(async () => {
		if (tasks.length === 0) {
			toast.error('No tasks to complete');
			return;
		}

		const updatedTasks = tasks.map((task) => ({
			...task,
			isComplete: true,
		}));

		try {
			await updateNode({
				nodeId: id,
				data: { metadata: { ...data.metadata, tasks: updatedTasks } },
			});
			toast.success('All tasks completed');
		} catch (error) {
			console.error('Failed to complete all tasks:', error);
			toast.error('Failed to complete all tasks');
		}
	}, [tasks, updateNode, id, data.metadata]);

	const handleClearCompleted = useCallback(async () => {
		if (completedTasks.length === 0) {
			toast.error('No completed tasks to clear');
			return;
		}

		const updatedTasks = tasks.filter((task) => !task.isComplete);

		try {
			await updateNode({
				nodeId: id,
				data: { metadata: { ...data.metadata, tasks: updatedTasks } },
			});
			toast.success(`Cleared ${completedTasks.length} completed task(s)`);
		} catch (error) {
			console.error('Failed to clear completed tasks:', error);
			toast.error('Failed to clear completed tasks');
		}
	}, [tasks, completedTasks.length, updateNode, id, data.metadata]);

	const toolbarContent = useMemo(
		() => (
			<>
				{/* Add Task Button */}
				<Button
					onClick={handleAddTask}
					size={'sm'}
					variant={'outline'}
					className='h-8 px-2'
					title='Add new task'
				>
					<Plus className='w-4 h-4' />
				</Button>

				{/* Task Counter Badge */}
				{tasks.length > 0 && (
					<div className='flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-600/20 text-blue-400'>
						<SquareCheck className='w-3 h-3' />
						{completedTasks.length}/{tasks.length}
					</div>
				)}

				{/* Complete All Button */}
				{tasks.length > 0 && completedTasks.length < tasks.length && (
					<Button
						onClick={handleCompleteAll}
						size={'sm'}
						variant={'outline'}
						className='h-8 px-2'
						title='Mark all tasks as complete'
					>
						<CheckCheck className='w-4 h-4' />
					</Button>
				)}

				{/* Clear Completed Button */}
				{completedTasks.length > 0 && (
					<Button
						onClick={handleClearCompleted}
						size={'sm'}
						variant={'outline'}
						className='h-8 px-2 text-red-400 hover:text-red-300'
						title='Remove completed tasks'
					>
						<Trash2 className='w-4 h-4' />
					</Button>
				)}
			</>
		),
		[
			completedTasks,
			tasks,
			handleCompleteAll,
			handleClearCompleted,
			handleAddTask,
		]
	);

	return (
		<BaseNodeWrapper
			{...props}
			nodeClassName='task-node'
			nodeType='Tasks'
			nodeIcon={<SquareCheck className='size-4' />}
			toolbarContent={toolbarContent}
		>
			<div className='flex flex-col gap-1.5'>
				{/* Task metadata (priority, due date, tags) */}
				{(data.metadata?.priority ||
					data.metadata?.dueDate ||
					(data?.metadata?.tags && data?.metadata?.tags?.length > 0)) && (
					<div className='flex flex-wrap gap-2 items-center text-xs mb-2 pb-2 border-b border-zinc-800'>
						{data.metadata?.priority && (
							<MetadataBadge
								type='priority'
								value={data.metadata.priority}
								icon={Flag}
								size='sm'
							/>
						)}

						{data.metadata?.dueDate && (
							<MetadataBadge
								type='date'
								value={new Date(data.metadata.dueDate).toLocaleDateString()}
								icon={Calendar}
								size='sm'
							/>
						)}

						{data?.metadata?.tags && data.metadata?.tags.length > 0 && (
							<NodeTags
								tags={data.metadata?.tags}
								maxVisible={3}
								className='inline-flex'
							/>
						)}

						{data.metadata?.assignee && (
							<MetadataBadge
								type='assignee'
								value={`@${data.metadata.assignee}`}
								icon={User}
								size='sm'
							/>
						)}
					</div>
				)}

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
