import { fireEvent, render, screen } from '@testing-library/react';
import { NodeEditor } from './node-editor';

const mockCloseNodeEditor = jest.fn();
const mockHandleOnboardingNodeEditorOpened = jest.fn();
const mockResetQuickInput = jest.fn();

let mockState: Record<string, unknown>;

jest.mock('@/hooks/collaboration/use-permissions', () => ({
	usePermissions: () => ({
		canEdit: true,
		isLoading: false,
	}),
}));

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: jest.fn((selector) => selector(mockState)),
}));

jest.mock('./components/inputs/quick-input', () => ({
	QuickInput: () => <div data-testid='quick-input'>Quick Input</div>,
}));

describe('NodeEditor dismissal guards', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockState = {
			nodeEditor: {
				isOpen: true,
				mode: 'create',
				position: { x: 0, y: 0 },
				screenPosition: { x: 0, y: 0 },
				parentNode: null,
				existingNodeId: null,
				suggestedType: null,
				initialValue: null,
				onboardingSource: null,
			},
			closeNodeEditor: mockCloseNodeEditor,
			nodes: [],
			resetQuickInput: mockResetQuickInput,
			getDefaultNodeType: () => 'defaultNode',
			handleOnboardingNodeEditorOpened: mockHandleOnboardingNodeEditorOpened,
		};
	});

	it('does not close when a body-portaled autocomplete tooltip is pressed', () => {
		render(<NodeEditor />);

		const tooltip = document.createElement('div');
		const tooltipButton = document.createElement('button');

		tooltip.className = 'cm-tooltip cm-tooltip-autocomplete';
		tooltipButton.textContent = 'Suggestion';
		tooltip.appendChild(tooltipButton);
		document.body.appendChild(tooltip);

		fireEvent.mouseDown(tooltipButton);

		expect(mockCloseNodeEditor).not.toHaveBeenCalled();

		tooltip.remove();
	});

	it('still closes when the backdrop is pressed', () => {
		render(<NodeEditor />);

		const editor = screen.getByTestId('node-editor');
		const backdrop = editor.parentElement;

		if (!backdrop) {
			throw new Error('Expected node editor backdrop to exist');
		}

		fireEvent.mouseDown(backdrop);

		expect(mockCloseNodeEditor).toHaveBeenCalledTimes(1);
	});
});
