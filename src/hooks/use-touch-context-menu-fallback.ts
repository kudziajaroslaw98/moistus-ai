import { type RefObject, useEffect, useRef } from 'react';
import type { OpenContextMenuAtParams } from './use-context-menu';

export const TOUCH_CONTEXT_MENU_LONG_PRESS_MS = 500;
export const TOUCH_CONTEXT_MENU_MOVE_TOLERANCE_PX = 12;
export const TOUCH_CONTEXT_MENU_CLICK_SUPPRESSION_MS = 750;

interface UseTouchContextMenuFallbackParams {
	containerRef: RefObject<HTMLElement | null>;
	openContextMenuAt: (params: OpenContextMenuAtParams) => void;
	isContextMenuOpen: boolean;
}

interface TargetContext {
	nodeId: string | null;
	edgeId: string | null;
}

interface PendingTouchContextMenu {
	pointerId: number;
	startX: number;
	startY: number;
	context: TargetContext;
}

function resolveTargetContext(target: EventTarget | null): TargetContext | null {
	if (!(target instanceof Element)) {
		return null;
	}

	const nodeElement = target.closest<HTMLElement>('.react-flow__node[data-id]');
	const nodeId = nodeElement?.getAttribute('data-id');
	if (nodeId) {
		return { nodeId, edgeId: null };
	}

	const edgeElement = target.closest<HTMLElement>('.react-flow__edge[data-id]');
	const edgeId = edgeElement?.getAttribute('data-id');
	if (edgeId) {
		return { nodeId: null, edgeId };
	}

	if (target.closest('.react-flow__pane')) {
		return { nodeId: null, edgeId: null };
	}

	return null;
}

/**
 * Adds a touch long-press fallback for opening the custom context menu inside
 * the provided React Flow container.
 *
 * Targets:
 * - `.react-flow__node[data-id]` -> opens node context menu.
 * - `.react-flow__edge[data-id]` -> opens edge context menu.
 * - `.react-flow__pane` -> opens pane context menu.
 *
 * Detection:
 * - Requires primary touch pointer and left button (`pointerdown`).
 * - Opens after `TOUCH_CONTEXT_MENU_LONG_PRESS_MS`.
 * - Cancels when pointer moves more than `TOUCH_CONTEXT_MENU_MOVE_TOLERANCE_PX`,
 *   or on `pointerup`/`pointercancel`/`pointerleave`, or window scroll.
 *
 * Suppression:
 * - No new press starts while `isContextMenuOpen` is true.
 * - After a successful long-press open, suppresses immediate trailing
 *   `click/contextmenu` events for
 *   `TOUCH_CONTEXT_MENU_CLICK_SUPPRESSION_MS` to prevent accidental
 *   close/select side effects.
 *
 * Internal refs:
 * - `pendingPressRef`: active touch candidate (pointer id/start coords/target).
 * - `timerIdRef`: pending long-press timer id.
 * - `isContextMenuOpenRef`: latest menu-open state for race-safe checks.
 * - `suppressClickUntilRef`: timestamp gate for trailing event suppression.
 */
export function useTouchContextMenuFallback({
	containerRef,
	openContextMenuAt,
	isContextMenuOpen,
}: UseTouchContextMenuFallbackParams) {
	const openContextMenuAtRef = useRef(openContextMenuAt);
	const isContextMenuOpenRef = useRef(isContextMenuOpen);
	const timerIdRef = useRef<number | null>(null);
	const pendingPressRef = useRef<PendingTouchContextMenu | null>(null);
	const suppressClickUntilRef = useRef(0);

	useEffect(() => {
		openContextMenuAtRef.current = openContextMenuAt;
	}, [openContextMenuAt]);

	useEffect(() => {
		isContextMenuOpenRef.current = isContextMenuOpen;
	}, [isContextMenuOpen]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const clearPendingPress = () => {
			if (timerIdRef.current !== null) {
				window.clearTimeout(timerIdRef.current);
				timerIdRef.current = null;
			}
			pendingPressRef.current = null;
		};

		const onPointerDown = (event: PointerEvent) => {
			if (event.pointerType !== 'touch' || event.button !== 0) {
				return;
			}

			if (event.isPrimary === false || isContextMenuOpenRef.current) {
				return;
			}

			const context = resolveTargetContext(event.target);
			if (!context) {
				return;
			}

			clearPendingPress();

			const pointerId = event.pointerId;
			pendingPressRef.current = {
				pointerId,
				startX: event.clientX,
				startY: event.clientY,
				context,
			};

			timerIdRef.current = window.setTimeout(() => {
				const pendingPress = pendingPressRef.current;
				if (!pendingPress || pendingPress.pointerId !== pointerId) {
					return;
				}
				if (isContextMenuOpenRef.current) {
					clearPendingPress();
					return;
				}

				openContextMenuAtRef.current({
					x: pendingPress.startX,
					y: pendingPress.startY,
					nodeId: pendingPress.context.nodeId,
					edgeId: pendingPress.context.edgeId,
				});

				suppressClickUntilRef.current =
					Date.now() + TOUCH_CONTEXT_MENU_CLICK_SUPPRESSION_MS;
				clearPendingPress();
			}, TOUCH_CONTEXT_MENU_LONG_PRESS_MS);
		};

		const onPointerMove = (event: PointerEvent) => {
			const pendingPress = pendingPressRef.current;
			if (!pendingPress || pendingPress.pointerId !== event.pointerId) {
				return;
			}

			const movement = Math.hypot(
				event.clientX - pendingPress.startX,
				event.clientY - pendingPress.startY
			);

			if (movement > TOUCH_CONTEXT_MENU_MOVE_TOLERANCE_PX) {
				clearPendingPress();
			}
		};

		const onPointerUp = (event: PointerEvent) => {
			const pendingPress = pendingPressRef.current;
			if (pendingPress && pendingPress.pointerId === event.pointerId) {
				clearPendingPress();
			}
		};

		const suppressTrailingClick = (event: MouseEvent) => {
			if (Date.now() > suppressClickUntilRef.current) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			event.stopImmediatePropagation();
			suppressClickUntilRef.current = 0;
		};

		const suppressTrailingContextMenu = (event: MouseEvent) => {
			if (Date.now() > suppressClickUntilRef.current) {
				return;
			}

			clearPendingPress();
			event.preventDefault();
			event.stopPropagation();
			event.stopImmediatePropagation();
		};

		container.addEventListener('pointerdown', onPointerDown);
		container.addEventListener('pointermove', onPointerMove);
		container.addEventListener('pointerup', onPointerUp);
		container.addEventListener('pointercancel', onPointerUp);
		container.addEventListener('pointerleave', onPointerUp);
		container.addEventListener('click', suppressTrailingClick, true);
		container.addEventListener('contextmenu', suppressTrailingContextMenu, true);
		window.addEventListener('scroll', clearPendingPress, true);

		return () => {
			clearPendingPress();
			container.removeEventListener('pointerdown', onPointerDown);
			container.removeEventListener('pointermove', onPointerMove);
			container.removeEventListener('pointerup', onPointerUp);
			container.removeEventListener('pointercancel', onPointerUp);
			container.removeEventListener('pointerleave', onPointerUp);
			container.removeEventListener('click', suppressTrailingClick, true);
			container.removeEventListener(
				'contextmenu',
				suppressTrailingContextMenu,
				true
			);
			window.removeEventListener('scroll', clearPendingPress, true);
		};
	}, [containerRef]);
}
