import { render, screen } from '@testing-library/react'
import DefaultNode from './default-node'

// Mock BaseNodeWrapper to isolate DefaultNode logic
jest.mock('./base-node-wrapper', () => ({
	BaseNodeWrapper: ({
		children,
		nodeType,
		hideNodeType,
	}: {
		children: React.ReactNode
		nodeType?: string
		hideNodeType?: boolean
	}) => (
		<div data-testid='base-node-wrapper' data-node-type={nodeType} data-hide-node-type={hideNodeType}>
			{children}
		</div>
	),
}))

// Mock MarkdownContent to verify props are passed correctly
jest.mock('./content/markdown-content', () => ({
	MarkdownContent: ({ content, placeholder }: { content: string; placeholder?: string }) => (
		<div data-testid='markdown-content' data-placeholder={placeholder}>
			{content || <span className='placeholder'>{placeholder}</span>}
		</div>
	),
}))

describe('DefaultNode', () => {
	// Create base props that match TypedNodeProps<'defaultNode'>
	const createBaseProps = (contentOverrides: Partial<{ content: string | null }> = {}) => ({
		id: 'test-node-1',
		type: 'defaultNode' as const,
		data: {
			id: 'test-node-1',
			map_id: 'test-map',
			parent_id: null,
			content: '# Test Content',
			position_x: 0,
			position_y: 0,
			node_type: 'defaultNode' as const,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			...contentOverrides,
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

	it('renders BaseNodeWrapper with correct props', () => {
		const props = createBaseProps()
		render(<DefaultNode {...props} />)

		const wrapper = screen.getByTestId('base-node-wrapper')
		expect(wrapper).toBeInTheDocument()
		expect(wrapper).toHaveAttribute('data-node-type', 'Note')
		expect(wrapper).toHaveAttribute('data-hide-node-type', 'true')
	})

	it('passes content to MarkdownContent', () => {
		const props = createBaseProps({ content: '# Hello World' })
		render(<DefaultNode {...props} />)

		const markdownContent = screen.getByTestId('markdown-content')
		expect(markdownContent).toHaveTextContent('# Hello World')
	})

	it('passes correct placeholder to MarkdownContent', () => {
		const props = createBaseProps({ content: null })
		render(<DefaultNode {...props} />)

		const markdownContent = screen.getByTestId('markdown-content')
		expect(markdownContent).toHaveAttribute('data-placeholder', 'Click to add content...')
	})

	it('shows placeholder when content is empty string', () => {
		const props = createBaseProps({ content: '' })
		render(<DefaultNode {...props} />)

		expect(screen.getByText('Click to add content...')).toBeInTheDocument()
	})

	it('shows placeholder when content is null', () => {
		const props = createBaseProps({ content: null })
		render(<DefaultNode {...props} />)

		expect(screen.getByText('Click to add content...')).toBeInTheDocument()
	})

	it('renders markdown content when provided', () => {
		const props = createBaseProps({ content: '## Section Title' })
		render(<DefaultNode {...props} />)

		expect(screen.getByText('## Section Title')).toBeInTheDocument()
	})

	it('has correct display name', () => {
		expect(DefaultNode.displayName).toBe('DefaultNode')
	})
})
