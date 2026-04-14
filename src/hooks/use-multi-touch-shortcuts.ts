import { useEffect, useRef } from 'react';

interface MultiTouchGestureStart {
	fingerCount: 2 | 3;
	startTime: number;
	startX: number;
	startY: number;
	lastX: number;
	lastY: number;
	canceled: boolean;
}

interface UseMultiTouchShortcutsInput {
	containerRef: React.RefObject<HTMLElement | null>;
	enabled: boolean;
	onTwoFingerTap?: () => void;
	onThreeFingerTap?: () => void;
	onTwoFingerDoubleTap?: () => void;
	onThreeFingerSwipe?: (direction: 'left' | 'right') => void;
}

const TAP_MAX_DURATION_MS = 280;
const TAP_MAX_MOVE_PX = 24;
const DOUBLE_TAP_WINDOW_MS = 420;
const SWIPE_MIN_DISTANCE_PX = 80;
const SWIPE_MAX_Y_DRIFT_PX = 48;

const centroid = (touches: TouchList) => {
	let sumX = 0;
	let sumY = 0;
	for (let i = 0; i < touches.length; i += 1) {
		sumX += touches[i].clientX;
		sumY += touches[i].clientY;
	}
	return {
		x: sumX / touches.length,
		y: sumY / touches.length,
	};
};

export function useMultiTouchShortcuts({
	containerRef,
	enabled,
	onTwoFingerTap,
	onThreeFingerTap,
	onTwoFingerDoubleTap,
	onThreeFingerSwipe,
}: UseMultiTouchShortcutsInput) {
	const gestureRef = useRef<MultiTouchGestureStart | null>(null);
	const lastTwoFingerTapAtRef = useRef<number>(0);

	useEffect(() => {
		const container = containerRef.current;
		if (!container || !enabled) {
			return;
		}

		const onTouchStart = (event: TouchEvent) => {
			const touchCount = event.touches.length;
			if (touchCount !== 2 && touchCount !== 3) {
				gestureRef.current = null;
				return;
			}

			const center = centroid(event.touches);
			gestureRef.current = {
				fingerCount: touchCount,
				startTime: Date.now(),
				startX: center.x,
				startY: center.y,
				lastX: center.x,
				lastY: center.y,
				canceled: false,
			};
		};

		const onTouchMove = (event: TouchEvent) => {
			const active = gestureRef.current;
			if (!active || active.canceled) {
				return;
			}

			if (event.touches.length !== active.fingerCount) {
				active.canceled = true;
				return;
			}

			const center = centroid(event.touches);
			active.lastX = center.x;
			active.lastY = center.y;

			const distance = Math.hypot(center.x - active.startX, center.y - active.startY);
			if (distance > TAP_MAX_MOVE_PX && active.fingerCount === 2) {
				active.canceled = true;
			}
		};

		const onTouchEnd = () => {
			const active = gestureRef.current;
			gestureRef.current = null;
			if (!active || active.canceled) {
				return;
			}

			const duration = Date.now() - active.startTime;
			const deltaX = active.lastX - active.startX;
			const deltaY = active.lastY - active.startY;
			const distance = Math.hypot(deltaX, deltaY);

			if (active.fingerCount === 3) {
				const horizontalSwipe =
					Math.abs(deltaX) >= SWIPE_MIN_DISTANCE_PX &&
					Math.abs(deltaY) <= SWIPE_MAX_Y_DRIFT_PX;
				if (horizontalSwipe && onThreeFingerSwipe) {
					onThreeFingerSwipe(deltaX < 0 ? 'left' : 'right');
					return;
				}
			}

			if (duration > TAP_MAX_DURATION_MS || distance > TAP_MAX_MOVE_PX) {
				return;
			}

			if (active.fingerCount === 2) {
				const now = Date.now();
				const withinDoubleTapWindow =
					now - lastTwoFingerTapAtRef.current <= DOUBLE_TAP_WINDOW_MS;
				lastTwoFingerTapAtRef.current = now;

				if (withinDoubleTapWindow && onTwoFingerDoubleTap) {
					onTwoFingerDoubleTap();
					lastTwoFingerTapAtRef.current = 0;
					return;
				}

				onTwoFingerTap?.();
				return;
			}

			onThreeFingerTap?.();
		};

		container.addEventListener('touchstart', onTouchStart, { passive: true });
		container.addEventListener('touchmove', onTouchMove, { passive: true });
		container.addEventListener('touchend', onTouchEnd, { passive: true });
		container.addEventListener('touchcancel', onTouchEnd, { passive: true });

		return () => {
			container.removeEventListener('touchstart', onTouchStart);
			container.removeEventListener('touchmove', onTouchMove);
			container.removeEventListener('touchend', onTouchEnd);
			container.removeEventListener('touchcancel', onTouchEnd);
		};
	}, [
		containerRef,
		enabled,
		onThreeFingerSwipe,
		onThreeFingerTap,
		onTwoFingerDoubleTap,
		onTwoFingerTap,
	]);
}

