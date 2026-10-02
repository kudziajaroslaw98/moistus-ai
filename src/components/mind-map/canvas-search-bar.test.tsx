import type { AppNode } from '@/types/app-node';
import type { NodeData } from '@/types/node-data';
import { fireEvent, render, screen } from '@testing-library/react';
import { CanvasSearchBar } from './canvas-search-bar';

const mockClose = jest.fn();
const mockSetQuery = jest.fn();
const mockSetActiveIndex = jest.fn();
const mockExpandPathTo = jest.fn();
const mockCenterOnNode = jest.fn();
let mockState: {
	isOpen: boolean;
	query: string;
	activeIndex: number;
	nodes: AppNode[];
	visibleIds: string[];
};

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: jest.fn((selector: (state: unknown) => unknown) =>
		selector({
			canvasSearch: {
				isOpen: mockState.isOpen,
				query: mockState.query,
				activeIndex: mockState.activeIndex,
			},
			nodes: mockState.nodes,
			closeCanvasSearch: mockClose,
			setCanvasSearchQuery: mockSetQuery,
			setCanvasSearchActiveIndex: mockSetActiveIndex,
			expandPathTo: mockExpandPathTo,
			centerOnNode: mockCenterOnNode,
			getVisibleNodes: () =>
				mockState.nodes.filter((node) => mockState.visibleIds.includes(node.id)),
		})
	),
}));

function node(id: string, content: string, y: number): AppNode {
	return {
		id,
		type: 'defaultNode',
		position: { x: 0, y },
		data: {
			id,
			map_id: 'map-1',
			parent_id: null,
			content,
			position_x: 0,
			position_y: y,
			node_type: 'defaultNode',
			created_at: '2026-10-03T00:00:00.000Z',
			updated_at: '2026-10-03T00:00:00.000Z',
			metadata: {},
		} as NodeData,
	};
}

beforeEach(() => {
	jest.clearAllMocks();
	jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
		callback(0);
		return 0;
	});
	mockState = {
		isOpen: true,
		query: 'debounce',
		activeIndex: 0,
		nodes: [node('visible', 'debounce visible', 0), node('hidden', 'debounce hidden', 100)],
		visibleIds: ['visible'],
	};
});

describe('CanvasSearchBar', () => {
	it('renders nothing while closed', () => {
		mockState.isOpen = false;
		render(<CanvasSearchBar />);
		expect(screen.queryByTestId('canvas-search-bar')).not.toBeInTheDocument();
	});

	it('shows the match position and updates the query', () => {
		render(<CanvasSearchBar />);

		expect(screen.getByText('1 of 2')).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText('Search nodes'), {
			target: { value: 'save' },
		});
		expect(mockSetQuery).toHaveBeenCalledWith('save');
	});

	it('first Enter jumps to the current match without expanding visible nodes', () => {
		render(<CanvasSearchBar />);

		fireEvent.keyDown(screen.getByLabelText('Search nodes'), { key: 'Enter' });

		expect(mockSetActiveIndex).toHaveBeenCalledWith(0);
		expect(mockExpandPathTo).not.toHaveBeenCalled();
		expect(mockCenterOnNode).toHaveBeenCalledWith('visible');
	});

	it('expands only the path to a hidden match before centering it', () => {
		render(<CanvasSearchBar />);

		fireEvent.click(screen.getByLabelText('Next match'));

		expect(mockSetActiveIndex).toHaveBeenCalledWith(1);
		expect(mockExpandPathTo).toHaveBeenCalledWith('hidden');
		expect(mockCenterOnNode).toHaveBeenCalledWith('hidden');
	});

	it('wraps around with Shift+Enter and closes on Escape', () => {
		render(<CanvasSearchBar />);
		const input = screen.getByLabelText('Search nodes');

		fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
		expect(mockSetActiveIndex).toHaveBeenCalledWith(1);

		fireEvent.keyDown(input, { key: 'Escape' });
		expect(mockClose).toHaveBeenCalled();
	});

	it('reports no matches', () => {
		mockState.query = 'nothing-here';
		render(<CanvasSearchBar />);
		expect(screen.getByText('No matches')).toBeInTheDocument();
		expect(screen.getByLabelText('Next match')).toBeDisabled();
	});
});
