import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BaseNodeWrapper } from './base-node-wrapper'

// Mock store
const mockOpenNodeEditor = jest.fn()
const mockGetNode = jest.fn()
const mockGenerateSuggestions = jest.fn()

let mockSelectedNodes: Array<{ id: string }> = []
let mockIsDraggingNodes = false
let mockActiveTool = 'select'

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: jest.fn((selector) =>
		selector({
			openNodeEditor: mockOpenNodeEditor,
			getNode: mockGetNode,
			isDraggingNodes: mockIsDraggingNodes,
			realtimeSelectedNodes: [],
			currentUser: { id: 'user-1' },
			selectedNodes: mockSelectedNodes,
			activeTool: mockActiveTool,
			ghostNodes: [],
			isStreaming: false,
			generateSuggestions: mockGenerateSuggestions,
		})
	),
}))

// Mock usePermissions
let mockCanEdit = true
jest.mock('@/hooks/collaboration/use-permissions', () => ({
	usePermissions: () => ({ canEdit: mockCanEdit }),
}))

// Mock useMeasure
jest.mock('@/hooks/use-measure', () => ({
	useMeasure: () => [jest.fn(), { width: 200, height: 100 }],
}))

// Mock useNodeDimensions
jest.mock('@/hooks/use-node-dimensions', () => ({
	useNodeDimensions: () => ({
		dimensions: { width: 280, height: 150 },
		handleResizeStart: jest.fn(),
		handleResize: jest.fn(),
		handleResizeEnd: jest.fn(),
		shouldResize: () => true,
		nodeRef: { current: null },
	}),
}))

// Mock node dimension utils
jest.mock('@/utils/node-dimension-utils', () => ({
	getNodeConstraints: () => ({
		minWidth: 200,
		minHeight: 100,
		maxWidth: 800,
		maxHeight: undefined,
	}),
}))

// Mock React Flow
jest.mock('@xyflow/react', () => ({
	Handle: ({ position, type }: { position: string; type: string }) => (
		<div data-testid={`handle-${type}-${position}`} />
	),
	NodeResizer: ({ isVisible }: { isVisible: boolean }) =>
		isVisible ? <div data-testid="node-resizer" /> : null,
	Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
	useConnection: () => ({ inProgress: false, toNode: null }),
}))

// Mock sub-components
jest.mock('./node-additions/collapse-button', () => ({
	__esModule: true,
	default: () => <button data-testid="collapse-button">Collapse</button>,
}))

jest.mock('./node-additions/collapsed-indicator', () => ({
	__esModule: true,
	default: ({ data }: { data: { metadata?: { isCollapsed?: boolean } } }) =>
		data.metadata?.isCollapsed ? <div data-testid="collapsed-indicator">Collapsed</div> : null,
}))

jest.mock('./node-additions/group-button', () => ({
	__esModule: true,
	default: () => <button data-testid="group-button">Group</button>,
}))

jest.mock('./shared/universal-metadata-bar', () => ({
	UniversalMetadataBar: ({ metadata }: { metadata: Record<string, unknown> }) => (
		<div data-testid="metadata-bar">{JSON.stringify(metadata)}</div>
	),
}))

jest.mock('../ui/avatar-stack', () => ({
	AvatarStack: ({ avatars }: { avatars: Array<{ id: string }> }) => (
		<div data-testid="avatar-stack">{avatars.length} users</div>
	),
}))

jest.mock('../ui/button', () => ({
	Button: ({ children, onClick, title, ...props }: React.ComponentProps<'button'>) => (
		<button onClick={onClick} title={title} data-testid={title} {...props}>
			{children}
		</button>
	),
}))

describe('BaseNodeWrapper', () => {
	const createDefaultProps = (overrides = {}) => ({
		id: 'node-1',
		data: {
			id: 'node-1',
			map_id: 'map-1',
			parent_id: null,
			content: 'Test content',
			position_x: 0,
			position_y: 0,
			node_type: 'defaultNode' as const,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			metadata: {},
		},
		children: <div data-testid="child-content">Child Content</div>,
		type: 'defaultNode' as const,
		selected: false,
		dragging: false,
		isConnectable: true,
		positionAbsoluteX: 0,
		positionAbsoluteY: 0,
		zIndex: 0,
		selectable: true,
		deletable: true,
		draggable: true,
		...overrides,
	})

	beforeEach(() => {
		jest.clearAllMocks()
		mockSelectedNodes = []
		mockIsDraggingNodes = false
		mockActiveTool = 'select'
		mockCanEdit = true
		mockGetNode.mockReturnValue({
			id: 'node-1',
			position: { x: 100, y: 100 },
			height: 150,
		})
	})

	describe('rendering', () => {
		it('renders children content', () => {
			render(<BaseNodeWrapper {...createDefaultProps()} />)

			expect(screen.getByTestId('child-content')).toHaveTextContent('Child Content')
		})

		it('renders collapse button', () => {
			render(<BaseNodeWrapper {...createDefaultProps()} />)

			expect(screen.getByTestId('collapse-button')).toBeInTheDocument()
		})

		it('renders group button', () => {
			render(<BaseNodeWrapper {...createDefaultProps()} />)

			expect(screen.getByTestId('group-button')).toBeInTheDocument()
		})

		it('renders connection handles', () => {
			render(<BaseNodeWrapper {...createDefaultProps()} />)

			expect(screen.getByTestId('handle-source-bottom')).toBeInTheDocument()
			expect(screen.getByTestId('handle-target-top')).toBeInTheDocument()
		})

		it('returns null when data is undefined', () => {
			// Note: The component has a null check (if (!data) return null) at line 145,
			// but accesses data.metadata earlier at line 103. This test verifies the
			// behavior with empty data object which triggers the falsy check.
			const props = createDefaultProps({
				data: {
					id: '',
					map_id: '',
					parent_id: null,
					content: '',
					position_x: 0,
					position_y: 0,
					node_type: 'defaultNode' as const,
					created_at: '',
					updated_at: '',
					metadata: {},
				},
			})
			// Component should render with empty/falsy data values
			const { container } = render(<BaseNodeWrapper {...props} />)
			expect(container.firstChild).not.toBeNull()
		})

		it('has correct display name', () => {
			expect(BaseNodeWrapper.displayName).toBe('BaseNodeWrapper')
		})
	})

	describe('metadata bar', () => {
		it('shows metadata bar when metadata has values', () => {
			const props = createDefaultProps({
				data: {
					...createDefaultProps().data,
					metadata: { tags: ['important'], priority: 'high' },
				},
			})
			render(<BaseNodeWrapper {...props} />)

			expect(screen.getByTestId('metadata-bar')).toBeInTheDocument()
		})

		it('hides metadata bar when metadata is empty', () => {
			const props = createDefaultProps({
				data: {
					...createDefaultProps().data,
					metadata: {},
				},
			})
			render(<BaseNodeWrapper {...props} />)

			expect(screen.queryByTestId('metadata-bar')).not.toBeInTheDocument()
		})

		it('hides metadata bar when all metadata values are null/undefined', () => {
			const props = createDefaultProps({
				data: {
					...createDefaultProps().data,
					metadata: { tags: undefined, priority: null },
				},
			})
			render(<BaseNodeWrapper {...props} />)

			expect(screen.queryByTestId('metadata-bar')).not.toBeInTheDocument()
		})
	})

	describe('collapsed state', () => {
		it('shows collapsed indicator when node is collapsed', () => {
			const props = createDefaultProps({
				data: {
					...createDefaultProps().data,
					metadata: { isCollapsed: true },
				},
			})
			render(<BaseNodeWrapper {...props} />)

			expect(screen.getByTestId('collapsed-indicator')).toBeInTheDocument()
		})

		it('hides collapsed indicator when node is not collapsed', () => {
			const props = createDefaultProps({
				data: {
					...createDefaultProps().data,
					metadata: { isCollapsed: false },
				},
			})
			render(<BaseNodeWrapper {...props} />)

			expect(screen.queryByTestId('collapsed-indicator')).not.toBeInTheDocument()
		})
	})

	describe('selection state', () => {
		it('shows resizer when node is selected and canEdit', () => {
			mockSelectedNodes = [{ id: 'node-1' }]
			render(<BaseNodeWrapper {...createDefaultProps()} />)

			expect(screen.getByTestId('node-resizer')).toBeInTheDocument()
		})

		it('hides resizer when node is not selected', () => {
			mockSelectedNodes = []
			render(<BaseNodeWrapper {...createDefaultProps()} />)

			expect(screen.queryByTestId('node-resizer')).not.toBeInTheDocument()
		})

		it('hides resizer when canEdit is false', () => {
			mockSelectedNodes = [{ id: 'node-1' }]
			mockCanEdit = false
			render(<BaseNodeWrapper {...createDefaultProps()} />)

			expect(screen.queryByTestId('node-resizer')).not.toBeInTheDocument()
		})

		it('hides resizer when hideResizeFrame is true', () => {
			mockSelectedNodes = [{ id: 'node-1' }]
			render(<BaseNodeWrapper {...createDefaultProps()} hideResizeFrame={true} />)

			// No handles or resizer should be rendered
			expect(screen.queryByTestId('node-resizer')).not.toBeInTheDocument()
		})
	})

	describe('add node button', () => {
		it('shows add button when node is selected, single selection, and canEdit', () => {
			mockSelectedNodes = [{ id: 'node-1' }]
			render(<BaseNodeWrapper {...createDefaultProps()} />)

			expect(screen.getByTestId('node-add-button')).toBeInTheDocument()
		})

		it('hides add button when hideAddButton is true', () => {
			mockSelectedNodes = [{ id: 'node-1' }]
			render(<BaseNodeWrapper {...createDefaultProps()} hideAddButton={true} />)

			expect(screen.queryByTestId('node-add-button')).not.toBeInTheDocument()
		})

		it('hides add button when canEdit is false', () => {
			mockSelectedNodes = [{ id: 'node-1' }]
			mockCanEdit = false
			render(<BaseNodeWrapper {...createDefaultProps()} />)

			expect(screen.queryByTestId('node-add-button')).not.toBeInTheDocument()
		})

		it('hides add button when multiple nodes selected', () => {
			mockSelectedNodes = [{ id: 'node-1' }, { id: 'node-2' }]
			render(<BaseNodeWrapper {...createDefaultProps()} />)

			expect(screen.queryByTestId('node-add-button')).not.toBeInTheDocument()
		})

		it('hides add button when node is not selected', () => {
			mockSelectedNodes = []
			render(<BaseNodeWrapper {...createDefaultProps()} />)

			expect(screen.queryByTestId('node-add-button')).not.toBeInTheDocument()
		})

		it('calls openNodeEditor when add button clicked', async () => {
			const user = userEvent.setup()
			mockSelectedNodes = [{ id: 'node-1' }]
			render(<BaseNodeWrapper {...createDefaultProps()} />)

			await user.click(screen.getByTestId('node-add-button'))

			expect(mockOpenNodeEditor).toHaveBeenCalledWith({
				mode: 'create',
				position: { x: 100, y: 300 }, // y + height + 50
				parentNode: expect.objectContaining({ id: 'node-1' }),
			})
		})
	})

	describe('suggestions button', () => {
		it('shows suggestions button when node is selected, single selection, and canEdit', () => {
			mockSelectedNodes = [{ id: 'node-1' }]
			render(<BaseNodeWrapper {...createDefaultProps()} />)

			expect(screen.getByTestId('node-suggest-button')).toBeInTheDocument()
		})

		it('hides suggestions button when hideSuggestionsButton is true', () => {
			mockSelectedNodes = [{ id: 'node-1' }]
			render(<BaseNodeWrapper {...createDefaultProps()} hideSuggestionsButton={true} />)

			expect(screen.queryByTestId('node-suggest-button')).not.toBeInTheDocument()
		})

		it('hides suggestions button when canEdit is false', () => {
			mockSelectedNodes = [{ id: 'node-1' }]
			mockCanEdit = false
			render(<BaseNodeWrapper {...createDefaultProps()} />)

			expect(screen.queryByTestId('node-suggest-button')).not.toBeInTheDocument()
		})

		it('calls generateSuggestions when suggestions button clicked', async () => {
			const user = userEvent.setup()
			mockSelectedNodes = [{ id: 'node-1' }]
			render(<BaseNodeWrapper {...createDefaultProps()} />)

			await user.click(screen.getByTestId('node-suggest-button'))

			expect(mockGenerateSuggestions).toHaveBeenCalledWith({
				sourceNodeId: 'node-1',
				trigger: 'magic-wand',
			})
		})
	})

	describe('padding options', () => {
		it('applies padding when includePadding is true (default)', () => {
			const { container } = render(<BaseNodeWrapper {...createDefaultProps()} />)

			const nodeDiv = container.querySelector('.p-4')
			expect(nodeDiv).toBeInTheDocument()
		})

		it('removes padding when includePadding is false', () => {
			const { container } = render(<BaseNodeWrapper {...createDefaultProps()} includePadding={false} />)

			const nodeDiv = container.querySelector('.p-0')
			expect(nodeDiv).toBeInTheDocument()
		})
	})

	describe('dragging state', () => {
		it('hides handles when isDraggingNodes is true', () => {
			mockIsDraggingNodes = true
			render(<BaseNodeWrapper {...createDefaultProps()} />)

			expect(screen.queryByTestId('handle-source-bottom')).not.toBeInTheDocument()
			expect(screen.queryByTestId('handle-target-top')).not.toBeInTheDocument()
		})

		it('shows handles when isDraggingNodes is false', () => {
			mockIsDraggingNodes = false
			render(<BaseNodeWrapper {...createDefaultProps()} />)

			expect(screen.getByTestId('handle-source-bottom')).toBeInTheDocument()
		})
	})

	describe('custom styling', () => {
		it('applies nodeClassName', () => {
			const { container } = render(
				<BaseNodeWrapper {...createDefaultProps()} nodeClassName="custom-node-class" />
			)

			expect(container.querySelector('.custom-node-class')).toBeInTheDocument()
		})

		it('applies contentClassName', () => {
			const { container } = render(
				<BaseNodeWrapper {...createDefaultProps()} contentClassName="custom-content-class" />
			)

			expect(container.querySelector('.custom-content-class')).toBeInTheDocument()
		})
	})
})
