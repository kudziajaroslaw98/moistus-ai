import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from './use-keyboard-shortcuts';

const mockCopySelectedNodes = jest.fn();
const mockPasteNodes = jest.fn();

jest.mock('@/store/mind-map-store', () => ({
	__esModule: true,
	default: jest.fn((selector: (state: unknown) => unknown) =>
		selector({
			reactFlowInstance: null,
			copySelectedNodes: mockCopySelectedNodes,
			pasteNodes: mockPasteNodes,
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

describe('useKeyboardShortcuts command palette', () => {
	function setupPalette(onOpenPalette = jest.fn()) {
		renderHook(() =>
			useKeyboardShortcuts({
				onCopy: jest.fn(),
				onPaste: jest.fn(),
				selectedNodeId: null,
				selectedEdgeId: null,
				isBusy: false,
				onOpenPalette,
			})
		);
		return onOpenPalette;
	}

	it('opens the palette on Ctrl/Cmd+K and blocks the browser default', () => {
		const onOpenPalette = setupPalette();
		const event = new KeyboardEvent('keydown', {
			key: 'k',
			metaKey: true,
			cancelable: true,
			bubbles: true,
		});

		document.body.dispatchEvent(event);

		expect(onOpenPalette).toHaveBeenCalledTimes(1);
		expect(event.defaultPrevented).toBe(true);
	});

	it('leaves Ctrl+K alone while typing in an input', () => {
		const onOpenPalette = setupPalette();
		const input = document.createElement('input');
		document.body.appendChild(input);

		input.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
		);

		expect(onOpenPalette).not.toHaveBeenCalled();
		input.remove();
	});
});

describe('useKeyboardShortcuts edit shortcuts', () => {
	const handlers = () => ({
		onGroup: jest.fn(),
		onUngroup: jest.fn(),
		onLayout: jest.fn(),
		onOpenSearch: jest.fn(),
		onOpenPalette: jest.fn(),
	});

	function setupEdits(
		disableEdits: boolean | undefined,
		fns: ReturnType<typeof handlers>
	) {
		renderHook(() =>
			useKeyboardShortcuts({
				onCopy: jest.fn(),
				onPaste: jest.fn(),
				selectedNodeId: null,
				selectedEdgeId: null,
				isBusy: false,
				disableEdits,
				...fns,
			})
		);
	}

	function press(key: string, init: KeyboardEventInit = {}) {
		const event = new KeyboardEvent('keydown', {
			key,
			ctrlKey: true,
			cancelable: true,
			bubbles: true,
			...init,
		});
		document.body.dispatchEvent(event);
		return event;
	}

	beforeEach(() => {
		mockCopySelectedNodes.mockClear();
		mockPasteNodes.mockClear();
	});

	it('pastes, groups, ungroups and lays out by default', () => {
		const fns = handlers();
		setupEdits(undefined, fns);

		press('v');
		press('g');
		press('g', { shiftKey: true });
		press('l');

		expect(mockPasteNodes).toHaveBeenCalledTimes(1);
		expect(fns.onGroup).toHaveBeenCalledTimes(1);
		expect(fns.onUngroup).toHaveBeenCalledTimes(1);
		expect(fns.onLayout).toHaveBeenCalledTimes(1);
	});

	it('swallows paste, group, ungroup and layout when edits are disabled', () => {
		const fns = handlers();
		setupEdits(true, fns);

		const events = [
			press('v'),
			press('g'),
			press('g', { shiftKey: true }),
			press('l'),
		];

		expect(mockPasteNodes).not.toHaveBeenCalled();
		expect(fns.onGroup).not.toHaveBeenCalled();
		expect(fns.onUngroup).not.toHaveBeenCalled();
		expect(fns.onLayout).not.toHaveBeenCalled();
		// Browser defaults (find-next, address bar) stay suppressed like before.
		expect(events.every((event) => event.defaultPrevented)).toBe(true);
	});

	it('keeps copy, search and the palette when edits are disabled', () => {
		const fns = handlers();
		setupEdits(true, fns);

		press('c');
		press('f');
		press('k');

		expect(mockCopySelectedNodes).toHaveBeenCalledTimes(1);
		expect(fns.onOpenSearch).toHaveBeenCalledTimes(1);
		expect(fns.onOpenPalette).toHaveBeenCalledTimes(1);
	});
});
