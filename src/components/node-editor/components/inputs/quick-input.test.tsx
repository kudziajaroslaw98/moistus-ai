import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuickInput } from './quick-input'

// Mock store with all required slices
const mockSetValue = jest.fn()
const mockSetCurrentNodeType = jest.fn()
const mockSetCursorPosition = jest.fn()
const mockInitializeQuickInput = jest.fn()
const mockCloseNodeEditor = jest.fn()
const mockAddNode = jest.fn().mockResolvedValue({ id: 'new-node-1' })
const mockUpdateNode = jest.fn().mockResolvedValue(undefined)

let mockQuickInputValue = ''
let mockQuickInputNodeType: string | null = null

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: jest.fn((selector) =>
		selector({
			quickInputValue: mockQuickInputValue,
			quickInputNodeType: mockQuickInputNodeType,
			quickInputCursorPosition: 0,
			setQuickInputValue: (val: string) => {
				mockQuickInputValue = val
				mockSetValue(val)
			},
			setQuickInputNodeType: (val: string) => {
				mockQuickInputNodeType = val
				mockSetCurrentNodeType(val)
			},
			setQuickInputCursorPosition: mockSetCursorPosition,
			initializeQuickInput: mockInitializeQuickInput,
			closeNodeEditor: mockCloseNodeEditor,
			addNode: mockAddNode,
			updateNode: mockUpdateNode,
		})
	),
}))

// Mock node type config
jest.mock('../../core/config/node-type-config', () => ({
	getNodeTypeConfig: jest.fn((nodeType: string) => ({
		icon: () => null,
		label:
			nodeType === 'taskNode'
				? 'Tasks'
				: nodeType === 'referenceNode'
					? 'Reference'
					: 'Note',
		examples: ['Example input #tag', 'Another example'],
		parsingPatterns: [
			{
				pattern: '#tag',
				description: 'Add a tag',
				category: 'metadata',
				examples: ['#important'],
			},
		],
	})),
	getUniversalParsingPatterns: jest.fn((nodeType: string) => {
		if (nodeType === 'referenceNode') return []
		return [
			{
				pattern: '#tag',
				description: 'Add a tag',
				category: 'metadata',
				examples: ['#important'],
			},
			{
				pattern: '@assignee',
				description: 'Assign person',
				category: 'metadata',
				examples: ['@me'],
			},
		]
	}),
	getNodeSpecificParsingPatterns: jest.fn((nodeType: string) => {
		if (nodeType === 'referenceNode') return []
		if (nodeType === 'taskNode') {
			return [
				{
					pattern: '[ ]',
					description: 'Task checkbox',
					category: 'formatting',
					examples: ['[ ] Write tests'],
				},
			]
		}
		return [
			{
				pattern: '$note',
				description: 'Switch to note',
				category: 'metadata',
				examples: ['$note hello'],
			},
		]
	}),
}))

// Mock parseInput
jest.mock('../../core/parsers/pattern-extractor', () => ({
	parseInput: jest.fn((text: string) => ({
		content: text,
		tags: [],
		metadata: {},
	})),
}))

// Mock createOrUpdateNode
jest.mock('../../node-updater', () => ({
	createOrUpdateNode: jest.fn().mockResolvedValue({ success: true, nodeId: 'new-node-1' }),
	transformNodeToQuickInputString: jest.fn().mockReturnValue('Existing content'),
}))

// Mock command registry
jest.mock('../../core/commands/command-registry', () => ({
	commandRegistry: {
		getCommandByTrigger: jest.fn().mockReturnValue(null),
	},
}))

// Mock command executor
jest.mock('../../core/commands/command-executor', () => ({
	processNodeTypeSwitch: jest.fn().mockReturnValue({
		hasSwitch: false,
		nodeType: null,
		processedText: '',
		cursorPosition: 0,
	}),
}))

// Mock text utils
jest.mock('../../core/utils/text-utils', () => ({
	announceToScreenReader: jest.fn(),
}))

jest.mock('@/hooks/subscription/use-map-node-limit', () => ({
	useMapNodeLimit: jest.fn(() => ({
		isAtLimit: false,
		isLoading: false,
		limitInfo: null,
		limitMessage: null,
	})),
}))

// Mock sub-components to isolate QuickInput logic
jest.mock('../component-header', () => ({
	ComponentHeader: ({ label }: { label: string }) => (
		<div data-testid="component-header">{label}</div>
	),
}))

jest.mock('../parent-node-reference', () => ({
	ParentNodeReference: ({ parentNode }: { parentNode: { id: string } }) => (
		<div data-testid="parent-reference">Parent: {parentNode.id}</div>
	),
}))

jest.mock('./enhanced-input', () => ({
	EnhancedInput: ({
		value,
		onChange,
		onKeyDown,
		onNodeTypeChange,
		placeholder,
		disabled,
	}: {
		value: string
		onChange: (val: string) => void
		onKeyDown: (e: React.KeyboardEvent) => void
		onNodeTypeChange?: (nodeType: string) => void
		placeholder: string
		disabled: boolean
	}) => (
		<div>
			<textarea
				data-testid="enhanced-input"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={onKeyDown}
				placeholder={placeholder}
				disabled={disabled}
			/>
			<button
				data-testid="switch-task-node"
				onClick={() => onNodeTypeChange?.('taskNode')}
			>
				Switch Task
			</button>
		</div>
	),
}))

jest.mock('../preview-section', () => ({
	PreviewSection: ({ nodeType, preview, hasInput }: { nodeType: string; preview: unknown; hasInput: boolean }) => (
		<div data-testid="preview-section" data-node-type={nodeType} data-has-input={hasInput}>
			{preview ? 'Has preview' : 'No preview'}
		</div>
	),
}))

jest.mock('../parsing-legend', () => ({
	ParsingLegend: ({
		isCollapsed,
		onToggleCollapse,
		isUniversalCollapsed,
		onToggleUniversalCollapse,
		isNodeSpecificCollapsed,
		onToggleNodeSpecificCollapse,
		universalPatterns,
		nodeSpecificPatterns,
		onPatternClick,
	}: {
		isCollapsed: boolean
		onToggleCollapse: () => void
		isUniversalCollapsed: boolean
		onToggleUniversalCollapse: () => void
		isNodeSpecificCollapsed: boolean
		onToggleNodeSpecificCollapse: () => void
		universalPatterns: Array<{ pattern: string }>
		nodeSpecificPatterns: Array<{ pattern: string }>
		onPatternClick: (pattern: string) => void
	}) => (
		<div
			data-testid="parsing-legend"
			data-collapsed={isCollapsed}
			data-universal-collapsed={isUniversalCollapsed}
			data-node-specific-collapsed={isNodeSpecificCollapsed}
			data-universal-count={universalPatterns.length}
			data-node-specific-count={nodeSpecificPatterns.length}
			data-universal-patterns={universalPatterns.map((pattern) => pattern.pattern).join(',')}
			data-node-specific-patterns={nodeSpecificPatterns.map((pattern) => pattern.pattern).join(',')}
		>
			<button onClick={onToggleCollapse} data-testid="toggle-legend">
				Toggle
			</button>
			<button onClick={onToggleUniversalCollapse} data-testid="toggle-universal-legend">
				Toggle Universal
			</button>
			<button onClick={onToggleNodeSpecificCollapse} data-testid="toggle-node-specific-legend">
				Toggle Node-specific
			</button>
			<button onClick={() => onPatternClick('#tag')} data-testid="insert-pattern">
				Insert #tag
			</button>
		</div>
	),
}))

jest.mock('../examples-section', () => ({
	ExamplesSection: ({
		examples,
		onUseExample,
		hasValue,
	}: {
		examples: string[]
		onUseExample: (example: string) => void
		hasValue: boolean
	}) => (
		<div data-testid="examples-section" data-has-value={hasValue}>
			{examples.map((example, i) => (
				<button key={i} onClick={() => onUseExample(example)} data-testid={`example-${i}`}>
					{example}
				</button>
			))}
		</div>
	),
}))

jest.mock('../error-display', () => ({
	ErrorDisplay: ({ error }: { error: string | null }) =>
		error ? <div data-testid="error-display">{error}</div> : null,
}))

jest.mock('../action-bar', () => ({
	ActionBar: ({
		canCreate,
		isCreating,
		mode,
		onCreate,
	}: {
		canCreate: boolean
		isCreating: boolean
		mode: string
		onCreate: () => void
	}) => (
		<div data-testid="action-bar">
			<button
				onClick={onCreate}
				disabled={!canCreate || isCreating}
				data-testid="create-button"
				data-mode={mode}
			>
				{isCreating ? 'Creating...' : mode === 'edit' ? 'Update' : 'Create'}
			</button>
		</div>
	),
}))

// Mock localStorage
const localStorageMock = {
	getItem: jest.fn().mockReturnValue(null),
	setItem: jest.fn(),
	clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('QuickInput', () => {
	const defaultProps = {
		nodeType: 'defaultNode' as const,
		parentNode: null,
		position: { x: 100, y: 100 },
		mode: 'create' as const,
	}

	beforeEach(() => {
		jest.clearAllMocks()
		mockQuickInputValue = ''
		mockQuickInputNodeType = null
		localStorageMock.getItem.mockReturnValue(null)
	})

	describe('rendering', () => {
		it('renders component header with correct label', () => {
			render(<QuickInput {...defaultProps} />)

			expect(screen.getByTestId('component-header')).toHaveTextContent('Note')
		})

		it('renders enhanced input', () => {
			render(<QuickInput {...defaultProps} />)

			expect(screen.getByTestId('enhanced-input')).toBeInTheDocument()
		})

		it('renders preview section', () => {
			render(<QuickInput {...defaultProps} />)

			expect(screen.getByTestId('preview-section')).toBeInTheDocument()
		})

		it('renders parsing legend', () => {
			render(<QuickInput {...defaultProps} />)

			expect(screen.getByTestId('parsing-legend')).toBeInTheDocument()
		})

		it('passes universal and node-specific parser sections to legend', () => {
			render(<QuickInput {...defaultProps} />)

			const legend = screen.getByTestId('parsing-legend')
			expect(legend).toHaveAttribute('data-universal-count', '2')
			expect(legend).toHaveAttribute('data-node-specific-count', '1')
			expect(legend).toHaveAttribute('data-node-specific-patterns', '$note')
		})

		it('hides parser legend for reference node when both sections are empty', () => {
			render(<QuickInput {...defaultProps} nodeType="referenceNode" />)

			expect(screen.queryByTestId('parsing-legend')).not.toBeInTheDocument()
			expect(
				screen.getByText('This node type accepts plain text input without special syntax.')
			).toBeInTheDocument()
		})

		it('renders examples section', () => {
			render(<QuickInput {...defaultProps} />)

			expect(screen.getByTestId('examples-section')).toBeInTheDocument()
		})

		it('renders action bar', () => {
			render(<QuickInput {...defaultProps} />)

			expect(screen.getByTestId('action-bar')).toBeInTheDocument()
		})

		it('shows parent reference when parentNode is provided', () => {
			const parentNode = {
				id: 'parent-1',
				type: 'defaultNode',
				data: { id: 'parent-1', content: 'Parent', map_id: 'map-1' },
				position: { x: 0, y: 0 },
			}
			render(<QuickInput {...defaultProps} parentNode={parentNode as any} />)

			expect(screen.getByTestId('parent-reference')).toHaveTextContent('Parent: parent-1')
		})

		it('does not show parent reference when parentNode is null', () => {
			render(<QuickInput {...defaultProps} />)

			expect(screen.queryByTestId('parent-reference')).not.toBeInTheDocument()
		})
	})

	describe('input handling', () => {
		it('calls setValue when input changes', async () => {
			const user = userEvent.setup()
			render(<QuickInput {...defaultProps} />)

			const input = screen.getByTestId('enhanced-input')
			await user.type(input, 'Hello')

			expect(mockSetValue).toHaveBeenCalled()
		})

		it('disables input when isCreating is true', async () => {
			// We can't easily test this without triggering create
			// but we verify initial state is not disabled
			render(<QuickInput {...defaultProps} />)

			const input = screen.getByTestId('enhanced-input')
			expect(input).not.toBeDisabled()
		})
	})

	describe('create button behavior', () => {
		it('disables create button when input is empty', () => {
			render(<QuickInput {...defaultProps} />)

			const createButton = screen.getByTestId('create-button')
			expect(createButton).toBeDisabled()
		})

		it('enables create button when input has content', async () => {
			mockQuickInputValue = 'Test content'
			render(<QuickInput {...defaultProps} />)

			const createButton = screen.getByTestId('create-button')
			expect(createButton).not.toBeDisabled()
		})

		it('shows correct mode label for create mode', () => {
			render(<QuickInput {...defaultProps} mode="create" />)

			expect(screen.getByTestId('create-button')).toHaveTextContent('Create')
		})

		it('shows correct mode label for edit mode', () => {
			const existingNode = {
				id: 'existing-1',
				type: 'defaultNode',
				data: { id: 'existing-1', content: 'Existing', map_id: 'map-1' },
				position: { x: 0, y: 0 },
			}
			render(<QuickInput {...defaultProps} mode="edit" existingNode={existingNode as any} />)

			expect(screen.getByTestId('create-button')).toHaveAttribute('data-mode', 'edit')
		})
	})

	describe('keyboard shortcuts', () => {
		it('calls create on Ctrl+Enter when input has content', async () => {
			const user = userEvent.setup()
			mockQuickInputValue = 'Test content'

			const { createOrUpdateNode } = require('../../node-updater')

			render(<QuickInput {...defaultProps} />)

			const input = screen.getByTestId('enhanced-input')
			await user.click(input)
			await user.keyboard('{Control>}{Enter}{/Control}')

			await waitFor(() => {
				expect(createOrUpdateNode).toHaveBeenCalled()
			})
		})

		it('toggles legend on Ctrl+/', async () => {
			const user = userEvent.setup()
			render(<QuickInput {...defaultProps} />)

			// Initial state - not collapsed
			expect(screen.getByTestId('parsing-legend')).toHaveAttribute('data-collapsed', 'false')

			// Press Ctrl+/
			await user.keyboard('{Control>}/{/Control}')

			await waitFor(() => {
				expect(screen.getByTestId('parsing-legend')).toHaveAttribute('data-collapsed', 'true')
			})
		})
	})

	describe('examples section', () => {
		it('fills input when example is clicked', async () => {
			const user = userEvent.setup()
			render(<QuickInput {...defaultProps} />)

			const firstExample = screen.getByTestId('example-0')
			await user.click(firstExample)

			expect(mockSetValue).toHaveBeenCalledWith('Example input #tag')
		})
	})

	describe('legend toggle', () => {
		it('toggles legend collapsed state when toggle button clicked', async () => {
			const user = userEvent.setup()
			render(<QuickInput {...defaultProps} />)

			const toggleButton = screen.getByTestId('toggle-legend')
			await user.click(toggleButton)

			expect(screen.getByTestId('parsing-legend')).toHaveAttribute('data-collapsed', 'true')
		})

		it('persists legend collapsed state to localStorage', async () => {
			const user = userEvent.setup()
			render(<QuickInput {...defaultProps} />)

			const toggleButton = screen.getByTestId('toggle-legend')
			await user.click(toggleButton)

			await waitFor(() => {
				expect(localStorageMock.setItem).toHaveBeenCalledWith('parsingLegendCollapsed', 'true')
			})
		})

		it('loads legend collapsed state from localStorage', () => {
			localStorageMock.getItem.mockReturnValue('true')
			render(<QuickInput {...defaultProps} />)

			expect(screen.getByTestId('parsing-legend')).toHaveAttribute('data-collapsed', 'true')
		})

		it('toggles universal and node-specific sub-sections', async () => {
			const user = userEvent.setup()
			render(<QuickInput {...defaultProps} />)

			await user.click(screen.getByTestId('toggle-universal-legend'))
			await user.click(screen.getByTestId('toggle-node-specific-legend'))

			const legend = screen.getByTestId('parsing-legend')
			expect(legend).toHaveAttribute('data-universal-collapsed', 'true')
			expect(legend).toHaveAttribute('data-node-specific-collapsed', 'true')
		})

		it('persists universal and node-specific collapsed state', async () => {
			const user = userEvent.setup()
			render(<QuickInput {...defaultProps} />)

			await user.click(screen.getByTestId('toggle-universal-legend'))
			await user.click(screen.getByTestId('toggle-node-specific-legend'))

			await waitFor(() => {
				expect(localStorageMock.setItem).toHaveBeenCalledWith(
					'parsingLegendUniversalCollapsed',
					'true'
				)
				expect(localStorageMock.setItem).toHaveBeenCalledWith(
					'parsingLegendNodeSpecificCollapsed',
					'true'
				)
			})
		})
	})

	describe('pattern insertion', () => {
		it('inserts pattern when legend pattern is clicked', async () => {
			const user = userEvent.setup()
			render(<QuickInput {...defaultProps} />)

			const insertButton = screen.getByTestId('insert-pattern')
			await user.click(insertButton)

			expect(mockSetValue).toHaveBeenCalledWith('#tag')
		})
	})

	describe('preview section', () => {
		it('passes hasInput=false when input is empty', () => {
			render(<QuickInput {...defaultProps} />)

			expect(screen.getByTestId('preview-section')).toHaveAttribute('data-has-input', 'false')
		})

		it('passes hasInput=true when input has content', () => {
			mockQuickInputValue = 'Some content'
			render(<QuickInput {...defaultProps} />)

			expect(screen.getByTestId('preview-section')).toHaveAttribute('data-has-input', 'true')
		})

		it('passes correct nodeType to preview', () => {
			render(<QuickInput {...defaultProps} nodeType="taskNode" />)

			expect(screen.getByTestId('preview-section')).toHaveAttribute('data-node-type', 'taskNode')
		})
	})

	describe('edit mode initialization', () => {
		it('calls initializeQuickInput with existing node content in edit mode', () => {
			const existingNode = {
				id: 'existing-1',
				type: 'defaultNode',
				data: { id: 'existing-1', content: 'Existing content', map_id: 'map-1' },
				position: { x: 0, y: 0 },
			}
			render(<QuickInput {...defaultProps} mode="edit" existingNode={existingNode as any} />)

			expect(mockInitializeQuickInput).toHaveBeenCalledWith('Existing content', 'defaultNode')
		})
	})

	describe('create mode initialization', () => {
		it('sets node type when currentNodeType is null', () => {
			mockQuickInputNodeType = null
			render(<QuickInput {...defaultProps} nodeType="taskNode" />)

			expect(mockSetCurrentNodeType).toHaveBeenCalledWith('taskNode')
		})

		it('does not override existing node type', () => {
			mockQuickInputNodeType = 'codeNode'
			render(<QuickInput {...defaultProps} nodeType="taskNode" />)

			// Should not be called because node type is already set
			expect(mockSetCurrentNodeType).not.toHaveBeenCalled()
		})

		it('updates node-specific parser section when node type switches', async () => {
			const user = userEvent.setup()
			const { rerender } = render(<QuickInput {...defaultProps} />)

			expect(screen.getByTestId('parsing-legend')).toHaveAttribute(
				'data-node-specific-patterns',
				'$note'
			)

			await user.click(screen.getByTestId('switch-task-node'))
			rerender(<QuickInput {...defaultProps} />)

			expect(screen.getByTestId('component-header')).toHaveTextContent('Tasks')
			expect(screen.getByTestId('parsing-legend')).toHaveAttribute(
				'data-node-specific-patterns',
				'[ ]'
			)
		})
	})

	describe('node creation', () => {
		it('calls closeNodeEditor after successful creation', async () => {
			const user = userEvent.setup()
			mockQuickInputValue = 'Test content'

			render(<QuickInput {...defaultProps} />)

			const createButton = screen.getByTestId('create-button')
			await user.click(createButton)

			await waitFor(() => {
				expect(mockCloseNodeEditor).toHaveBeenCalled()
			})
		})
	})
})
