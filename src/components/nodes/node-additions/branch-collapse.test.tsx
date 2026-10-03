import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { NodeData } from '@/types/node-data';
import { fireEvent, render, screen } from '@testing-library/react';
import { BranchPeek } from './branch-peek';
import BranchSummary from './branch-summary';
import CollapsedIndicator from './collapsed-indicator';

const mockExpandBranch = jest.fn();
const mockExpandPathTo = jest.fn();
const mockCenterOnNode = jest.fn();
let mockNodes: AppNode[] = [];
let mockEdges: AppEdge[] = [];
let mockCoarsePointer = false;

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: jest.fn((selector: (state: unknown) => unknown) =>
		selector({
			nodes: mockNodes,
			edges: mockEdges,
			expandBranch: mockExpandBranch,
			expandPathTo: mockExpandPathTo,
			centerOnNode: mockCenterOnNode,
			canvasSearch: { isOpen: false, query: '', activeIndex: 0 },
		})
	),
}));

jest.mock('@/hooks/use-coarse-pointer', () => ({
	useCoarsePointer: () => mockCoarsePointer,
}));

// Render overlays inline so tests can assert on them without portals/timers.
jest.mock('@/components/ui/hover-card', () => ({
	HoverCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	HoverCardTrigger: ({
		children,
		onClick,
		render: _render,
		delay: _delay,
		closeDelay: _closeDelay,
		...props
	}: React.ComponentProps<'button'> & {
		render?: unknown;
		delay?: number;
		closeDelay?: number;
	}) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
	),
	HoverCardContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid='hover-content'>{children}</div>
	),
}));

jest.mock('@/components/ui/popover', () => ({
	Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	PopoverTrigger: ({ children, ...props }: React.ComponentProps<'button'>) => (
		<button {...props}>{children}</button>
	),
	PopoverContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid='popover-content'>{children}</div>
	),
}));

function node(id: string, metadata: NodeData['metadata'] = {}): AppNode {
	return {
		id,
		type: 'defaultNode',
		position: { x: 0, y: 0 },
		data: {
			id,
			map_id: 'map-1',
			parent_id: null,
			content: `${id} text`,
			position_x: 0,
			position_y: 0,
			node_type: 'defaultNode',
			created_at: '2026-10-03T00:00:00.000Z',
			updated_at: '2026-10-03T00:00:00.000Z',
			metadata,
		},
	};
}

function edge(source: string, target: string, label?: string): AppEdge {
	return {
		id: `${source}-${target}`,
		source,
		target,
		data: { id: `${source}-${target}`, source, target, label } as AppEdge['data'],
	};
}

beforeEach(() => {
	jest.clearAllMocks();
	mockCoarsePointer = false;
	mockNodes = [
		node('root', { isCollapsed: true }),
		node('child', {
			status: 'in-progress',
			tasks: [
				{ id: 't1', text: 'one', isComplete: true },
				{ id: 't2', text: 'two', isComplete: false },
			],
		}),
		node('grand', { priority: 'high' }),
		node('open'),
		node('leaf'),
	];
	mockEdges = [
		edge('root', 'child', 'mitigates risk'),
		edge('child', 'grand'),
		edge('open', 'leaf'),
	];
});

describe('CollapsedIndicator', () => {
	it('shows the hidden count and expands one level on click', () => {
		render(<CollapsedIndicator nodeId='root' />);

		const pill = screen.getByTestId('collapsed-branch-pill');
		expect(pill).toHaveTextContent('2 nodes hidden');

		fireEvent.click(pill);
		expect(mockExpandBranch).toHaveBeenCalledWith('root', { all: false });
	});

	it('expands everything on Shift+click', () => {
		render(<CollapsedIndicator nodeId='root' />);

		fireEvent.click(screen.getByTestId('collapsed-branch-pill'), { shiftKey: true });

		expect(mockExpandBranch).toHaveBeenCalledWith('root', { all: true });
	});

	it('peeks with explicit expand actions on touch devices', () => {
		mockCoarsePointer = true;
		render(<CollapsedIndicator nodeId='root' />);

		fireEvent.click(screen.getByRole('button', { name: 'Expand all' }));

		expect(mockExpandBranch).toHaveBeenCalledWith('root', { all: true });
	});

	it('renders nothing for expanded nodes', () => {
		render(<CollapsedIndicator nodeId='open' />);
		expect(screen.queryByTestId('collapsed-branch-pill')).not.toBeInTheDocument();
	});
});

describe('BranchSummary', () => {
	it('rolls up branch tasks, pending statuses and severity', () => {
		render(<BranchSummary nodeId='root' />);

		expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
		expect(screen.getByText('1 / 2')).toBeInTheDocument();
		expect(screen.getByText('1 pending')).toBeInTheDocument();
		expect(screen.getByTestId('branch-severity-dot')).toHaveAttribute(
			'title',
			'Something critical inside'
		);
	});

	it('renders nothing while expanded', () => {
		const { container } = render(<BranchSummary nodeId='open' />);
		expect(container).toBeEmptyDOMElement();
	});
});

describe('BranchPeek', () => {
	it('lists hidden nodes with edge labels and expands a path on row click', () => {
		const onExpandPath = jest.fn();
		render(
			<BranchPeek
				onExpandPath={onExpandPath}
				summary={{
					hiddenIds: ['child', 'grand'],
					tasks: { done: 1, total: 2 },
					pendingStatusCount: 1,
					severity: null,
					outline: [
						{
							id: 'child',
							depth: 0,
							text: 'Child',
							nodeType: 'taskNode',
							edgeLabel: 'mitigates risk',
							tasks: { done: 1, total: 2 },
							status: 'in-progress',
							isCollapsed: false,
						},
						{
							id: 'grand',
							depth: 1,
							text: 'Grandchild',
							nodeType: 'defaultNode',
							edgeLabel: null,
							tasks: null,
							status: null,
							isCollapsed: false,
						},
					],
				}}
			/>
		);

		expect(screen.getByText('mitigates risk')).toBeInTheDocument();
		fireEvent.click(screen.getByText('Grandchild'));
		expect(onExpandPath).toHaveBeenCalledWith('grand');
	});
});
