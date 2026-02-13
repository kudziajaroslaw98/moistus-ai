'use client';

import { usePermissions } from '@/hooks/collaboration/use-permissions';
import useAppStore from '@/store/mind-map-store';
import { CheckCheck, CheckSquare, Plus, Square } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { Button } from '../ui/button';
import { BaseNodeWrapper } from './base-node-wrapper';
import { SharedNodeToolbar } from './components/node-toolbar';
import { ToolbarSeparator } from './components/toolbar-controls';
import { TaskContent } from './content/task-content';
import { type TaskNodeMetadata, type TypedNodeProps } from './core/types';
import { GlassmorphismTheme } from './themes/glassmorphism-theme';

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
 * - Toolbar with check all / uncheck all / add task
 */
const TaskNodeComponent = (props: TaskNodeProps) => {
	const { id, data } = props;
	const { canEdit } = usePermissions();
	const { updateNode, selectedNodes } = useAppStore(
		useShallow((state) => ({
			updateNode: state.updateNode,
			selectedNodes: state.selectedNodes,
		}))
	);

	const theme = GlassmorphismTheme;

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

	const handleCheckAll = useCallback(async () => {
		const updatedTasks = tasks.map((task) => ({ ...task, isComplete: true }));
		try {
			await updateNode({
				nodeId: id,
				data: { metadata: { ...data.metadata, tasks: updatedTasks } },
			});
		} catch (error) {
			console.error('Failed to check all tasks:', error);
		}
	}, [tasks, updateNode, id, data.metadata]);

	const handleUncheckAll = useCallback(async () => {
		const updatedTasks = tasks.map((task) => ({ ...task, isComplete: false }));
		try {
			await updateNode({
				nodeId: id,
				data: { metadata: { ...data.metadata, tasks: updatedTasks } },
			});
		} catch (error) {
			console.error('Failed to uncheck all tasks:', error);
		}
	}, [tasks, updateNode, id, data.metadata]);

	const handleAddTask = useCallback(async () => {
		const newTask = {
			id: crypto.randomUUID(),
			text: '',
			isComplete: false,
		};
		const updatedTasks = [...tasks, newTask];
		try {
			await updateNode({
				nodeId: id,
				data: { metadata: { ...data.metadata, tasks: updatedTasks } },
			});
		} catch (error) {
			console.error('Failed to add task:', error);
		}
	}, [tasks, updateNode, id, data.metadata]);

	const buttonStyle = {
		backgroundColor: 'transparent',
		border: `1px solid ${theme.borders.hover}`,
		color: theme.text.medium,
	};

	return (
		<>
			<SharedNodeToolbar
				isVisible={props.selected && selectedNodes.length === 1}
				readOnly={!canEdit}
			>
				<Button
					className="h-8 w-8 p-0"
					disabled={!canEdit}
					onClick={handleCheckAll}
					size="sm"
					style={buttonStyle}
					title="Check all"
					variant="outline"
				>
					<CheckCheck className="w-4 h-4" />
				</Button>
				<Button
					className="h-8 w-8 p-0"
					disabled={!canEdit}
					onClick={handleUncheckAll}
					size="sm"
					style={buttonStyle}
					title="Uncheck all"
					variant="outline"
				>
					<Square className="w-4 h-4" />
				</Button>
				<ToolbarSeparator />
				<Button
					className="h-8 w-8 p-0"
					disabled={!canEdit}
					onClick={handleAddTask}
					size="sm"
					style={buttonStyle}
					title="Add task"
					variant="outline"
				>
					<Plus className="w-4 h-4" />
				</Button>
			</SharedNodeToolbar>

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
					onTaskToggle={canEdit ? handleToggleTask : undefined}
					placeholder='Double click or click the menu to add tasks...'
					showCelebrationEmoji={true}
				/>
			</BaseNodeWrapper>
		</>
	);
};

const TaskNode = memo(TaskNodeComponent);
TaskNode.displayName = 'TaskNode';
export default TaskNode;
