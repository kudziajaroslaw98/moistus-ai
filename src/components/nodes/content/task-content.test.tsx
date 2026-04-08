import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskContent } from './task-content'

// Mock the theme
jest.mock('@/components/nodes/themes/glassmorphism-theme', () => ({
	GlassmorphismTheme: {
		text: {
			high: 'rgba(255, 255, 255, 0.87)',
			medium: 'rgba(255, 255, 255, 0.6)',
			disabled: 'rgba(255, 255, 255, 0.38)',
		},
		indicators: {
			status: { complete: 'rgba(52, 211, 153, 1)' },
			progress: {
				background: 'rgba(255, 255, 255, 0.1)',
				fill: 'rgba(96, 165, 250, 1)',
				completeFill: 'rgba(52, 211, 153, 1)',
			},
		},
	},
}))

describe('TaskContent', () => {
	describe('title rendering', () => {
		it('renders title above task content when provided', () => {
			const tasks = [{ id: '1', text: 'Task 1', isComplete: false }]
			render(<TaskContent tasks={tasks} title='Sprint Tasks' />)

			expect(screen.getByText('Sprint Tasks')).toBeInTheDocument()
		})
	})

	describe('placeholder behavior', () => {
		it('shows default placeholder when tasks array is empty', () => {
			render(<TaskContent tasks={[]} />)

			expect(screen.getByText('Add tasks...')).toBeInTheDocument()
		})

		it('shows custom placeholder when provided', () => {
			render(<TaskContent tasks={[]} placeholder="No tasks yet" />)

			expect(screen.getByText('No tasks yet')).toBeInTheDocument()
		})

		it('shows filtered empty message when all visible tasks are hidden', () => {
			const statsTasks = [{ id: '1', text: 'Done task', isComplete: true }]

			render(
				<TaskContent
					tasks={[]}
					statsTasks={statsTasks}
					filteredEmptyMessage='Completed tasks are hidden'
				/>
			)

			expect(screen.getByText('Completed tasks are hidden')).toBeInTheDocument()
			expect(screen.queryByText('Add tasks...')).not.toBeInTheDocument()
		})
	})

	describe('task rendering', () => {
		it('renders task list', () => {
			const tasks = [
				{ id: '1', text: 'Task 1', isComplete: false },
				{ id: '2', text: 'Task 2', isComplete: true },
			]
			render(<TaskContent tasks={tasks} />)

			expect(screen.getByText('Task 1')).toBeInTheDocument()
			expect(screen.getByText('Task 2')).toBeInTheDocument()
		})

		it('shows empty task placeholder for tasks without text', () => {
			const tasks = [{ id: '1', text: '', isComplete: false }]
			render(<TaskContent tasks={tasks} />)

			expect(screen.getByText('Empty task')).toBeInTheDocument()
		})

		it('applies strikethrough style to completed tasks', () => {
			const tasks = [{ id: '1', text: 'Completed task', isComplete: true }]
			render(<TaskContent tasks={tasks} />)

			const taskText = screen.getByText('Completed task')
			expect(taskText).toHaveClass('line-through')
		})

		it('does not apply strikethrough to incomplete tasks', () => {
			const tasks = [{ id: '1', text: 'Incomplete task', isComplete: false }]
			render(<TaskContent tasks={tasks} />)

			const taskText = screen.getByText('Incomplete task')
			expect(taskText).not.toHaveClass('line-through')
		})
	})

	describe('progress indicator', () => {
		it('shows progress label', () => {
			const tasks = [{ id: '1', text: 'Task', isComplete: false }]
			render(<TaskContent tasks={tasks} />)

			expect(screen.getByText('Progress')).toBeInTheDocument()
		})

		it('shows correct completed count', () => {
			const tasks = [
				{ id: '1', text: 'Task 1', isComplete: true },
				{ id: '2', text: 'Task 2', isComplete: true },
				{ id: '3', text: 'Task 3', isComplete: false },
			]
			render(<TaskContent tasks={tasks} />)

			expect(screen.getByText('2')).toBeInTheDocument()
			expect(screen.getByText('3')).toBeInTheDocument()
		})

		it('uses statsTasks for progress when provided', () => {
			const visibleTasks = [{ id: '1', text: 'Task 1', isComplete: false }]
			const statsTasks = [
				{ id: '1', text: 'Task 1', isComplete: false },
				{ id: '2', text: 'Task 2', isComplete: true },
				{ id: '3', text: 'Task 3', isComplete: true },
			]
			render(<TaskContent tasks={visibleTasks} statsTasks={statsTasks} />)

			expect(screen.getByText('2')).toBeInTheDocument()
			expect(screen.getByText('3')).toBeInTheDocument()
		})

		it('shows 0/N when no tasks completed', () => {
			const tasks = [
				{ id: '1', text: 'Task 1', isComplete: false },
				{ id: '2', text: 'Task 2', isComplete: false },
			]
			render(<TaskContent tasks={tasks} />)

			expect(screen.getByText('0')).toBeInTheDocument()
		})
	})

	describe('interactivity', () => {
		it('calls onTaskToggle when task is clicked', async () => {
			const user = userEvent.setup()
			const onTaskToggle = jest.fn()
			const tasks = [{ id: '1', text: 'Click me', isComplete: false }]

			render(<TaskContent tasks={tasks} onTaskToggle={onTaskToggle} />)

			await user.click(screen.getByText('Click me'))

			expect(onTaskToggle).toHaveBeenCalledWith('1')
		})

		it('applies hover styles when interactive', () => {
			const onTaskToggle = jest.fn()
			const tasks = [{ id: '1', text: 'Task', isComplete: false }]

			const { container } = render(<TaskContent tasks={tasks} onTaskToggle={onTaskToggle} />)

			const taskElement = container.querySelector('.cursor-pointer')
			expect(taskElement).toBeInTheDocument()
		})

		it('does not apply cursor-pointer when not interactive', () => {
			const tasks = [{ id: '1', text: 'Task', isComplete: false }]

			const { container } = render(<TaskContent tasks={tasks} />)

			const taskElement = container.querySelector('.cursor-pointer')
			expect(taskElement).not.toBeInTheDocument()
		})
	})

	describe('celebration message', () => {
		it('shows celebration message when all tasks complete', () => {
			const tasks = [
				{ id: '1', text: 'Task 1', isComplete: true },
				{ id: '2', text: 'Task 2', isComplete: true },
			]
			render(<TaskContent tasks={tasks} />)

			expect(screen.getByText(/All tasks complete!/)).toBeInTheDocument()
		})

		it('does not show celebration message when some tasks incomplete', () => {
			const tasks = [
				{ id: '1', text: 'Task 1', isComplete: true },
				{ id: '2', text: 'Task 2', isComplete: false },
			]
			render(<TaskContent tasks={tasks} />)

			expect(screen.queryByText(/All tasks complete!/)).not.toBeInTheDocument()
		})

		it('shows emoji when showCelebrationEmoji is true', () => {
			const tasks = [{ id: '1', text: 'Task', isComplete: true }]
			render(<TaskContent tasks={tasks} showCelebrationEmoji={true} />)

			expect(screen.getByText('All tasks complete! 🎉')).toBeInTheDocument()
		})

		it('does not show emoji when showCelebrationEmoji is false', () => {
			const tasks = [{ id: '1', text: 'Task', isComplete: true }]
			render(<TaskContent tasks={tasks} showCelebrationEmoji={false} />)

			expect(screen.getByText('All tasks complete!')).toBeInTheDocument()
			expect(screen.queryByText(/🎉/)).not.toBeInTheDocument()
		})
	})

	describe('custom className', () => {
		it('applies custom className to container', () => {
			const tasks = [{ id: '1', text: 'Task', isComplete: false }]
			const { container } = render(<TaskContent tasks={tasks} className="custom-class" />)

			expect(container.querySelector('.custom-class')).toBeInTheDocument()
		})
	})

	describe('display name', () => {
		it('has correct display name', () => {
			expect(TaskContent.displayName).toBe('TaskContent')
		})
	})
})
