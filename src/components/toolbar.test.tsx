import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Toolbar } from './toolbar';

let mockStoreState: Record<string, unknown>;
let mockPermissions: {
	canEdit: boolean;
	canComment: boolean;
	isLoading: boolean;
};

jest.mock('@/hooks/collaboration/use-permissions', () => ({
	usePermissions: () => mockPermissions,
}));

jest.mock('@/hooks/use-mobile', () => ({
	useIsMobile: () => false,
}));

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: (selector: (state: Record<string, unknown>) => unknown) =>
		selector(mockStoreState),
}));

jest.mock('motion/react', () => ({
	motion: {
		div: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	},
}));

jest.mock('./ai/ai-actions-popover', () => ({
	AIActionsPopover: () => null,
}));

jest.mock('./toolbar/layout-dropdown', () => ({
	LayoutDropdown: ({ disabled }: { disabled?: boolean }) => (
		<button data-testid='layout-dropdown' disabled={Boolean(disabled)}>
			layout
		</button>
	),
	LayoutMenuContent: () => null,
}));

jest.mock('./toolbar/export-dropdown', () => ({
	ExportDropdown: ({ disabled }: { disabled?: boolean }) => (
		<button data-testid='export-dropdown' disabled={Boolean(disabled)}>
			export
		</button>
	),
	ExportMenuContent: () => null,
}));

jest.mock('./ui/button', () => ({
	Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

function renderTrigger(render: unknown) {
	if (typeof render === 'function') {
		return (render as (props: Record<string, unknown>) => ReactNode)({
			className: '',
		});
	}
	return render as ReactNode;
}

jest.mock('./ui/dropdown-menu', () => ({
	DropdownMenu: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuTrigger: ({
		render,
		children,
	}: {
		render?: unknown;
		children?: ReactNode;
	}) => <>{render ? renderTrigger(render) : children}</>,
	DropdownMenuContent: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuCheckboxItem: ({
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
	DropdownMenuRadioGroup: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuRadioItem: ({
		children,
		...props
	}: {
		children: ReactNode;
	}) => <button {...props}>{children}</button>,
	DropdownMenuSeparator: () => <div />,
	DropdownMenuSub: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuSubContent: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuSubTrigger: ({
		children,
		...props
	}: {
		children: ReactNode;
	}) => <button {...props}>{children}</button>,
}));

jest.mock('./ui/popover', () => ({
	Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
	PopoverTrigger: ({
		render,
		children,
	}: {
		render?: unknown;
		children?: ReactNode;
	}) => <>{render ? renderTrigger(render) : children}</>,
	PopoverContent: ({ children }: { children: ReactNode }) => (
		<div>{children}</div>
	),
}));

jest.mock('./ui/separator', () => ({
	Separator: () => <div />,
}));

function createStoreState(overrides: Record<string, unknown> = {}) {
	return {
		activeTool: 'default',
		setActiveTool: jest.fn(),
		reactFlowInstance: { zoomTo: jest.fn() },
		isCommentMode: false,
		setCommentMode: jest.fn(),
		startTour: jest.fn(),
		enterPathEditMode: jest.fn(),
		savedPaths: [],
		nodes: [{ id: 'node-1' }],
		isStreaming: false,
		...overrides,
	};
}

describe('Toolbar', () => {
	beforeEach(() => {
		mockStoreState = createStoreState();
		mockPermissions = { canEdit: true, canComment: true, isLoading: false };
	});

	it('keeps map actions unavailable while map data is not ready', () => {
		render(
			<Toolbar
				isMapReady={false}
				mobileTapMultiSelectEnabled={false}
				onMobileTapMultiSelectChange={jest.fn()}
			/>
		);

		expect(screen.getByTitle('Select')).not.toBeDisabled();
		expect(screen.getByTitle('Add Node')).toBeDisabled();
		expect(screen.getByTestId('layout-dropdown')).toBeDisabled();
		expect(screen.getByTestId('export-dropdown')).toBeDisabled();
	});

	it('enables map actions when map data is ready', () => {
		render(
			<Toolbar
				isMapReady={true}
				mobileTapMultiSelectEnabled={false}
				onMobileTapMultiSelectChange={jest.fn()}
			/>
		);

		expect(screen.getByTitle('Add Node')).not.toBeDisabled();
		expect(screen.getByTestId('layout-dropdown')).not.toBeDisabled();
		expect(screen.getByTestId('export-dropdown')).not.toBeDisabled();
	});
	describe('for people who cannot edit', () => {
		const renderToolbar = () =>
			render(
				<Toolbar
					isMapReady={true}
					mobileTapMultiSelectEnabled={false}
					onMobileTapMultiSelectChange={jest.fn()}
				/>
			);

		beforeEach(() => {
			mockPermissions = { canEdit: false, canComment: true, isLoading: false };
		});

		it('offers Select and Pan, but not Connect', () => {
			renderToolbar();

			expect(screen.getAllByText('Select').length).toBeGreaterThan(0);
			expect(screen.getAllByText('Pan').length).toBeGreaterThan(0);
			expect(screen.queryByText('Connect')).not.toBeInTheDocument();
		});

		it('moves someone left on an editing tool back to Select', () => {
			mockStoreState = createStoreState({ activeTool: 'connector' });
			renderToolbar();

			expect(mockStoreState.setActiveTool).toHaveBeenCalledWith('default');
		});

		it('keeps Pan when they chose it', () => {
			mockStoreState = createStoreState({ activeTool: 'pan' });
			renderToolbar();

			expect(mockStoreState.setActiveTool).not.toHaveBeenCalled();
		});

		it('waits for permissions before resetting the tool', () => {
			mockPermissions = { canEdit: false, canComment: false, isLoading: true };
			mockStoreState = createStoreState({ activeTool: 'node' });
			renderToolbar();

			expect(mockStoreState.setActiveTool).not.toHaveBeenCalled();
		});
	});

	it('leaves an editor on their editing tool', () => {
		mockStoreState = createStoreState({ activeTool: 'connector' });
		render(
			<Toolbar
				isMapReady={true}
				mobileTapMultiSelectEnabled={false}
				onMobileTapMultiSelectChange={jest.fn()}
			/>
		);

		expect(mockStoreState.setActiveTool).not.toHaveBeenCalled();
	});

	it('switches to Select when comment mode turns on', () => {
		mockStoreState = createStoreState({ activeTool: 'pan' });
		render(
			<Toolbar
				isMapReady={true}
				mobileTapMultiSelectEnabled={false}
				onMobileTapMultiSelectChange={jest.fn()}
			/>
		);

		fireEvent.click(screen.getByTitle('Comments (C)'));

		expect(mockStoreState.setActiveTool).toHaveBeenCalledWith('default');
		expect(mockStoreState.setCommentMode).toHaveBeenCalledWith(true);
	});
});
