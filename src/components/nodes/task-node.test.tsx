import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TaskNode from './task-node'
import useAppStore from '@/store/mind-map-store'

// Mock the store
const mockUpdateNode = jest.fn().mockResolvedValue(undefined)

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: jest.fn((selector) => selector({ updateNode: mockUpdateNode })),
}))

// Mock BaseNodeWrapper
jest.mock('./base-node-wrapper', () => ({
	BaseNodeWrapper: ({
		children,
		nodeType,
	}: {
		children: React.ReactNode
		nodeType?: string
	}) => (
		<div data-testid='base-node-wrapper' data-node-type={nodeType}>
			{children}
		</div>
	),
}))

// Mock TaskContent to verify props and enable interaction testing
jest.mock('./content/task-content', () => ({
	TaskContent: ({
		tasks,
		onTaskToggle,
		placeholder,
		showCelebrationEmoji,
	}: {
		tasks: Array<{ id: string; text: string; isComplete: boolean }>
		onTaskToggle?: (id: string) => void
		placeholder?: string
		showCelebrationEmoji?: boolean
	}) => (
		<div data-testid='task-content' data-placeholder={placeholder} data-celebration={showCelebrationEmoji}>
			{tasks.length === 0 ? (
				<span data-testid='placeholder'>{placeholder}</span>
			) : (
				<ul>
					{tasks.map((task) => (
						<li
							key={task.id}
							data-testid={`task-${task.id}`}
							data-completed={task.isComplete}
							onClick={() => onTaskToggle?.(task.id)}
							role='checkbox'
							aria-checked={task.isComplete}
						>
							{task.text}
						</li>
					))}
				</ul>
			)}
			{tasks.length > 0 && tasks.every((t) => t.isComplete) && (
				<div data-testid='all-complete'>All complete!</div>
			)}
		</div>
	),
}))

describe('TaskNode', () => {
	// Reset mocks before each test
	beforeEach(() => {
		jest.clearAllMocks()
		mockUpdateNode.mockResolvedValue(undefined)
	})

	// Create base props that match TypedNodeProps<'taskNode'>
	const createBaseProps = (
		tasks: Array<{ id: string; text: string; isComplete: boolean }> = []
	) => ({
		id: 'task-node-1',
		type: 'taskNode' as const,
		data: {
			id: 'task-node-1',
			map_id: 'test-map',
			parent_id: null,
			content: '',
			position_x: 0,
			position_y: 0,
			node_type: 'taskNode' as const,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			metadata: { tasks },
		},
		selected: false,
		dragging: false,
		isConnectable: true,
		positionAbsoluteX: 0,
		positionAbsoluteY: 0,
		zIndex: 0,
		selectable: true,
		deletable: true,
		draggable: true,
	})

	describe('rendering', () => {
		it('renders BaseNodeWrapper with Tasks node type', () => {
			const props = createBaseProps([])
			render(<TaskNode {...props} />)

			const wrapper = screen.getByTestId('base-node-wrapper')
			expect(wrapper).toHaveAttribute('data-node-type', 'Tasks')
		})

		it('renders TaskContent component', () => {
			const props = createBaseProps([])
			render(<TaskNode {...props} />)

			expect(screen.getByTestId('task-content')).toBeInTheDocument()
		})

		it('passes correct placeholder to TaskContent', () => {
			const props = createBaseProps([])
			render(<TaskNode {...props} />)

			const taskContent = screen.getByTestId('task-content')
			expect(taskContent).toHaveAttribute(
				'data-placeholder',
				'Double click or click the menu to add tasks...'
			)
		})

		it('enables celebration emoji', () => {
			const props = createBaseProps([])
			render(<TaskNode {...props} />)

			const taskContent = screen.getByTestId('task-content')
			expect(taskContent).toHaveAttribute('data-celebration', 'true')
		})

		it('renders tasks from metadata', () => {
			const tasks = [
				{ id: '1', text: 'Buy milk', isComplete: false },
				{ id: '2', text: 'Walk dog', isComplete: true },
			]
			const props = createBaseProps(tasks)
			render(<TaskNode {...props} />)

			expect(screen.getByTestId('task-1')).toHaveTextContent('Buy milk')
			expect(screen.getByTestId('task-2')).toHaveTextContent('Walk dog')
		})

		it('shows completed status on tasks', () => {
			const tasks = [
				{ id: '1', text: 'Task 1', isComplete: false },
				{ id: '2', text: 'Task 2', isComplete: true },
			]
			const props = createBaseProps(tasks)
			render(<TaskNode {...props} />)

			expect(screen.getByTestId('task-1')).toHaveAttribute('data-completed', 'false')
			expect(screen.getByTestId('task-2')).toHaveAttribute('data-completed', 'true')
		})

		it('handles empty tasks array', () => {
			const props = createBaseProps([])
			render(<TaskNode {...props} />)

			expect(screen.getByTestId('placeholder')).toHaveTextContent(
				'Double click or click the menu to add tasks...'
			)
		})

		it('handles undefined metadata gracefully', () => {
			const props = {
				...createBaseProps([]),
				data: {
					...createBaseProps([]).data,
					metadata: undefined,
				},
			}
			render(<TaskNode {...props} />)

			// Should render with empty tasks
			expect(screen.getByTestId('task-content')).toBeInTheDocument()
		})
	})

	describe('task toggling', () => {
		it('calls updateNode when task is clicked', async () => {
			const user = userEvent.setup()
			const tasks = [{ id: '1', text: 'Test task', isComplete: false }]
			const props = createBaseProps(tasks)

			render(<TaskNode {...props} />)

			await user.click(screen.getByTestId('task-1'))

			expect(mockUpdateNode).toHaveBeenCalledTimes(1)
			expect(mockUpdateNode).toHaveBeenCalledWith({
				nodeId: 'task-node-1',
				data: {
					metadata: {
						tasks: [{ id: '1', text: 'Test task', isComplete: true }],
					},
				},
			})
		})

		it('toggles task from complete to incomplete', async () => {
			const user = userEvent.setup()
			const tasks = [{ id: '1', text: 'Completed task', isComplete: true }]
			const props = createBaseProps(tasks)

			render(<TaskNode {...props} />)

			await user.click(screen.getByTestId('task-1'))

			expect(mockUpdateNode).toHaveBeenCalledWith({
				nodeId: 'task-node-1',
				data: {
					metadata: {
						tasks: [{ id: '1', text: 'Completed task', isComplete: false }],
					},
				},
			})
		})

		it('only toggles the clicked task, preserves others', async () => {
			const user = userEvent.setup()
			const tasks = [
				{ id: '1', text: 'Task 1', isComplete: false },
				{ id: '2', text: 'Task 2', isComplete: true },
				{ id: '3', text: 'Task 3', isComplete: false },
			]
			const props = createBaseProps(tasks)

			render(<TaskNode {...props} />)

			await user.click(screen.getByTestId('task-2'))

			expect(mockUpdateNode).toHaveBeenCalledWith({
				nodeId: 'task-node-1',
				data: {
					metadata: {
						tasks: [
							{ id: '1', text: 'Task 1', isComplete: false },
							{ id: '2', text: 'Task 2', isComplete: false }, // Toggled
							{ id: '3', text: 'Task 3', isComplete: false },
						],
					},
				},
			})
		})

		it('handles updateNode error gracefully', async () => {
			const user = userEvent.setup()
			const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
			mockUpdateNode.mockRejectedValueOnce(new Error('Network error'))

			const tasks = [{ id: '1', text: 'Test task', isComplete: false }]
			const props = createBaseProps(tasks)

			render(<TaskNode {...props} />)

			await user.click(screen.getByTestId('task-1'))

			// Wait for async error handling
			await new Promise((resolve) => setTimeout(resolve, 0))

			expect(consoleError).toHaveBeenCalledWith(
				'Failed to save task status:',
				expect.any(Error)
			)

			consoleError.mockRestore()
		})
	})

	describe('completion state', () => {
		it('shows completion message when all tasks complete', () => {
			const tasks = [
				{ id: '1', text: 'Task 1', isComplete: true },
				{ id: '2', text: 'Task 2', isComplete: true },
			]
			const props = createBaseProps(tasks)

			render(<TaskNode {...props} />)

			expect(screen.getByTestId('all-complete')).toBeInTheDocument()
		})

		it('does not show completion message when some tasks incomplete', () => {
			const tasks = [
				{ id: '1', text: 'Task 1', isComplete: true },
				{ id: '2', text: 'Task 2', isComplete: false },
			]
			const props = createBaseProps(tasks)

			render(<TaskNode {...props} />)

			expect(screen.queryByTestId('all-complete')).not.toBeInTheDocument()
		})
	})

	describe('display name', () => {
		it('has correct display name', () => {
			expect(TaskNode.displayName).toBe('TaskNode')
		})
	})
})
