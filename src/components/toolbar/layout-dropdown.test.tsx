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
	DropdownMenuRadioGroup: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuRadioItem: ({
		children,
		...props
	}: {
		children: ReactNode;
	}) => <button {...props}>{children}</button>,
	DropdownMenuItem: ({
		children,
		...props
	}: {
		children: ReactNode;
	}) => <button {...props}>{children}</button>,
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

	it('renders experimental layout presets', () => {
		render(<LayoutMenuContent />);

		expect(screen.getByText('Experiments')).toBeInTheDocument();
		expect(screen.getByText('Roomy Branches')).toBeInTheDocument();
		expect(screen.getByText('Tree Right')).toBeInTheDocument();
		expect(screen.getByText('Tree Down')).toBeInTheDocument();
		expect(screen.getByText('Radial Tree')).toBeInTheDocument();
		expect(screen.getByText('Organic Spread')).toBeInTheDocument();
	});

	it('applies an experimental preset from the menu', () => {
		const applyLayoutPreset = jest.fn();
		mockStoreState = createStoreState({ applyLayoutPreset });

		render(<LayoutMenuContent />);

		fireEvent.click(screen.getByText('Roomy Branches'));

		expect(applyLayoutPreset).toHaveBeenCalledWith('roomy-branches');
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
