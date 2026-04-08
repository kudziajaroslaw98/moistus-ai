import { act, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import type { OpenContextMenuAtParams } from './use-context-menu';
import {
	TOUCH_CONTEXT_MENU_CLICK_SUPPRESSION_MS,
	TOUCH_CONTEXT_MENU_LONG_PRESS_MS,
	useTouchContextMenuFallback,
} from './use-touch-context-menu-fallback';

type PointerEventInitWithTouch = PointerEventInit & {
	pointerType?: string;
	isPrimary?: boolean;
};

class MockPointerEvent extends MouseEvent {
	pointerId: number;
	pointerType: string;
	isPrimary: boolean;

	constructor(type: string, init: PointerEventInitWithTouch = {}) {
		super(type, init);
		this.pointerId = init.pointerId ?? 1;
		this.pointerType = init.pointerType ?? 'touch';
		this.isPrimary = init.isPrimary ?? true;
	}
}

function dispatchPointerEvent(
	target: Element,
	type: string,
	init: PointerEventInitWithTouch = {}
) {
	const PointerEventConstructor =
		(window.PointerEvent as typeof PointerEvent | undefined) ?? MockPointerEvent;

	const event = new PointerEventConstructor(type, {
		bubbles: true,
		cancelable: true,
		button: 0,
		clientX: 100,
		clientY: 100,
		pointerId: 1,
		pointerType: 'touch',
		isPrimary: true,
		...init,
	});

	target.dispatchEvent(event);
	return event;
}

function TouchContextMenuHarness({
	openContextMenuAt,
	isContextMenuOpen = false,
}: {
	openContextMenuAt: (params: OpenContextMenuAtParams) => void;
	isContextMenuOpen?: boolean;
}) {
	const containerRef = useRef<HTMLDivElement | null>(null);

	useTouchContextMenuFallback({
		containerRef,
		openContextMenuAt,
		isContextMenuOpen,
	});

	return (
		<div data-testid='container' ref={containerRef}>
			<div className='react-flow__pane' data-testid='pane'>
				<div className='react-flow__node' data-id='node-1' data-testid='node'>
					<span data-testid='node-child'>Node</span>
				</div>
				<svg>
					<g className='react-flow__edge' data-id='edge-1' data-testid='edge'>
						<path data-testid='edge-path' />
					</g>
				</svg>
			</div>
		</div>
	);
}

describe('useTouchContextMenuFallback', () => {
	const originalPointerEvent = window.PointerEvent;

	beforeAll(() => {
		if (!window.PointerEvent) {
			Object.defineProperty(window, 'PointerEvent', {
				configurable: true,
				writable: true,
				value: MockPointerEvent,
			});
		}
	});

	afterAll(() => {
		Object.defineProperty(window, 'PointerEvent', {
			configurable: true,
			writable: true,
			value: originalPointerEvent,
		});
	});

	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.clearAllMocks();
	});

	it('opens the menu after long-press on a node', () => {
		const openContextMenuAt = jest.fn();
		render(<TouchContextMenuHarness openContextMenuAt={openContextMenuAt} />);

		const nodeChild = screen.getByTestId('node-child');
		act(() => {
			dispatchPointerEvent(nodeChild, 'pointerdown', {
				clientX: 120,
				clientY: 80,
			});
			jest.advanceTimersByTime(TOUCH_CONTEXT_MENU_LONG_PRESS_MS);
		});

		expect(openContextMenuAt).toHaveBeenCalledTimes(1);
		expect(openContextMenuAt).toHaveBeenCalledWith({
			x: 120,
			y: 80,
			nodeId: 'node-1',
			edgeId: null,
		});
	});

	it('opens the menu after long-press on an edge', () => {
		const openContextMenuAt = jest.fn();
		render(<TouchContextMenuHarness openContextMenuAt={openContextMenuAt} />);

		const edgePath = screen.getByTestId('edge-path');
		act(() => {
			dispatchPointerEvent(edgePath, 'pointerdown', {
				clientX: 64,
				clientY: 48,
			});
			jest.advanceTimersByTime(TOUCH_CONTEXT_MENU_LONG_PRESS_MS);
		});

		expect(openContextMenuAt).toHaveBeenCalledTimes(1);
		expect(openContextMenuAt).toHaveBeenCalledWith({
			x: 64,
			y: 48,
			nodeId: null,
			edgeId: 'edge-1',
		});
	});

	it('opens the menu after long-press on pane', () => {
		const openContextMenuAt = jest.fn();
		render(<TouchContextMenuHarness openContextMenuAt={openContextMenuAt} />);

		const pane = screen.getByTestId('pane');
		act(() => {
			dispatchPointerEvent(pane, 'pointerdown', {
				clientX: 300,
				clientY: 220,
			});
			jest.advanceTimersByTime(TOUCH_CONTEXT_MENU_LONG_PRESS_MS);
		});

		expect(openContextMenuAt).toHaveBeenCalledTimes(1);
		expect(openContextMenuAt).toHaveBeenCalledWith({
			x: 300,
			y: 220,
			nodeId: null,
			edgeId: null,
		});
	});

	it('does not open the menu on quick tap', () => {
		const openContextMenuAt = jest.fn();
		render(<TouchContextMenuHarness openContextMenuAt={openContextMenuAt} />);

		const node = screen.getByTestId('node');
		act(() => {
			dispatchPointerEvent(node, 'pointerdown');
			jest.advanceTimersByTime(200);
			dispatchPointerEvent(node, 'pointerup');
			jest.advanceTimersByTime(TOUCH_CONTEXT_MENU_LONG_PRESS_MS);
		});

		expect(openContextMenuAt).not.toHaveBeenCalled();
	});

	it('does not open the menu when movement exceeds threshold', () => {
		const openContextMenuAt = jest.fn();
		render(<TouchContextMenuHarness openContextMenuAt={openContextMenuAt} />);

		const node = screen.getByTestId('node');
		act(() => {
			dispatchPointerEvent(node, 'pointerdown', { clientX: 100, clientY: 100 });
			dispatchPointerEvent(node, 'pointermove', { clientX: 113, clientY: 100 });
			jest.advanceTimersByTime(TOUCH_CONTEXT_MENU_LONG_PRESS_MS);
		});

		expect(openContextMenuAt).not.toHaveBeenCalled();
	});

	it('suppresses the immediate trailing click after long-press', () => {
		const openContextMenuAt = jest.fn();
		render(<TouchContextMenuHarness openContextMenuAt={openContextMenuAt} />);

		const node = screen.getByTestId('node');
		act(() => {
			dispatchPointerEvent(node, 'pointerdown');
			jest.advanceTimersByTime(TOUCH_CONTEXT_MENU_LONG_PRESS_MS);
		});

		const firstClick = new MouseEvent('click', {
			bubbles: true,
			cancelable: true,
		});
		node.dispatchEvent(firstClick);
		expect(firstClick.defaultPrevented).toBe(true);

		act(() => {
			jest.advanceTimersByTime(TOUCH_CONTEXT_MENU_CLICK_SUPPRESSION_MS + 1);
		});

		const secondClick = new MouseEvent('click', {
			bubbles: true,
			cancelable: true,
		});
		node.dispatchEvent(secondClick);
		expect(secondClick.defaultPrevented).toBe(false);
	});
});
