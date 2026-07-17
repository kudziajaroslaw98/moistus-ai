import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LayoutMenuContent } from './layout-dropdown';

let mockStoreState: Record<string, unknown>;

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: Record<string, unknown>) => unknown) =>
		selector(mockStoreState),
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, ...props }: { children?: ReactNode }) => (
		<button {...props}>{children}</button>
	),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
	DropdownMenuGroup: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuItem: ({ children, ...props }: { children: ReactNode }) => (
		<button {...props}>{children}</button>
	),
	DropdownMenuLabel: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuSeparator: () => <div />,
}));

function createStoreState(overrides: Record<string, unknown> = {}) {
	return {
		layoutConfig: { direction: 'LEFT_RIGHT' },
		applyLayout: jest.fn(),
		applyLayoutPreset: jest.fn(),
		applyLayoutToSelected: jest.fn(),
		isLayouting: false,
		selectedNodes: [],
		...overrides,
	};
}

describe('LayoutMenuContent', () => {
	beforeEach(() => {
		mockStoreState = createStoreState();
	});

	it('groups layout choices by their layout family', () => {
		render(<LayoutMenuContent />);

		expect(screen.getByText('Linear')).toBeInTheDocument();
		expect(screen.getByText('Layered')).toBeInTheDocument();
		expect(screen.getByText('Tree')).toBeInTheDocument();
		expect(screen.getByText('Radial')).toBeInTheDocument();
		expect(screen.getByText('Roomy Right')).toBeInTheDocument();
		expect(screen.getByText('Roomy Down')).toBeInTheDocument();
		expect(screen.getByText('Tree Right')).toBeInTheDocument();
		expect(screen.getByText('Tree Down')).toBeInTheDocument();
		expect(screen.getByText('Radial Tree')).toBeInTheDocument();
		expect(screen.queryAllByRole('radio')).toHaveLength(0);
		expect(screen.queryByText('Organic Spread')).not.toBeInTheDocument();
		expect(screen.queryByText('Experiments')).not.toBeInTheDocument();
		expect(screen.queryByText('Layouts')).not.toBeInTheDocument();
	});

	it('applies ordinary linear layout actions without a selected-state marker', () => {
		const applyLayout = jest.fn();
		mockStoreState = createStoreState({ applyLayout });

		render(<LayoutMenuContent />);

		fireEvent.click(screen.getByText('Left to Right'));
		fireEvent.click(screen.getByText('Top to Bottom'));

		expect(applyLayout).toHaveBeenNthCalledWith(1, 'LEFT_RIGHT');
		expect(applyLayout).toHaveBeenNthCalledWith(2, 'TOP_BOTTOM');
		expect(screen.queryAllByRole('radio')).toHaveLength(0);
	});

	it('applies a directional roomy preset from the menu', () => {
		const applyLayoutPreset = jest.fn();
		mockStoreState = createStoreState({ applyLayoutPreset });

		render(<LayoutMenuContent />);

		fireEvent.click(screen.getByText('Roomy Down'));

		expect(applyLayoutPreset).toHaveBeenCalledWith('roomy-down');
	});

	it('keeps selected-only layout available when multiple nodes are selected', () => {
		const applyLayoutToSelected = jest.fn();
		mockStoreState = createStoreState({
			applyLayoutToSelected,
			selectedNodes: [{ id: 'a' }, { id: 'b' }],
		});

		render(<LayoutMenuContent />);

		fireEvent.click(screen.getByText('Layout Selected (2)'));

		expect(applyLayoutToSelected).toHaveBeenCalledTimes(1);
	});
});
