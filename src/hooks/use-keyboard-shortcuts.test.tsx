import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './use-keyboard-shortcuts';

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: jest.fn((selector: (state: unknown) => unknown) =>
		selector({
			reactFlowInstance: null,
			copySelectedNodes: jest.fn(),
			pasteNodes: jest.fn(),
		})
	),
}));

function setup(onOpenSearch = jest.fn(), isBusy = false) {
	renderHook(() =>
		useKeyboardShortcuts({
			onCopy: jest.fn(),
			onPaste: jest.fn(),
			selectedNodeId: null,
			selectedEdgeId: null,
			isBusy,
			onOpenSearch,
		})
	);
	return onOpenSearch;
}

describe('useKeyboardShortcuts canvas search', () => {
	it('opens canvas search on Ctrl/Cmd+F and blocks browser find', () => {
		const onOpenSearch = setup();
		const event = new KeyboardEvent('keydown', {
			key: 'f',
			metaKey: true,
			cancelable: true,
			bubbles: true,
		});

		document.body.dispatchEvent(event);

		expect(onOpenSearch).toHaveBeenCalledTimes(1);
		expect(event.defaultPrevented).toBe(true);
	});

	it('leaves Ctrl+F alone while typing in an input', () => {
		const onOpenSearch = setup();
		const input = document.createElement('input');
		document.body.appendChild(input);

		input.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true })
		);

		expect(onOpenSearch).not.toHaveBeenCalled();
		input.remove();
	});

	it('does nothing while the canvas is busy', () => {
		const onOpenSearch = setup(jest.fn(), true);
		document.body.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true })
		);
		expect(onOpenSearch).not.toHaveBeenCalled();
	});
});
