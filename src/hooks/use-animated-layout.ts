'use client';

/**
 * useAnimatedLayout Hook
 * Provides smooth position animations for nodes during layout transitions
 * Follows project animation guidelines:
 * - ease-out-quart timing (starts fast, slows down)
 * - 300ms duration
 * - Respects prefers-reduced-motion
 */

import type { AppNode } from '@/types/app-node';
import { useCallback, useEffect, useState } from 'react';

// ease-out-quart: Starts fast, slows down - best for elements entering/settling
const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

// Animation duration following project guidelines (fast, never > 1s)
const ANIMATION_DURATION_MS = 300;

// Check if user prefers reduced motion
function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined') return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface AnimationState {
	isAnimating: boolean;
	progress: number;
}

/**
 * Easing function: ease-out-quart
 * t^4 with inverse for deceleration
 */
function easeOutQuart(t: number): number {
	return 1 - Math.pow(1 - t, 4);
}

/**
 * Interpolate between two positions
 */
function interpolatePosition(
	start: { x: number; y: number },
	end: { x: number; y: number },
	progress: number
): { x: number; y: number } {
	const easedProgress = easeOutQuart(progress);
	return {
		x: start.x + (end.x - start.x) * easedProgress,
		y: start.y + (end.y - start.y) * easedProgress,
	};
}

export function useAnimatedLayout() {
	const [animationState, setAnimationState] = useState<AnimationState>({
		isAnimating: false,
		progress: 0,
	});

	/**
	 * Animate nodes from current positions to target positions
	 * Returns animated nodes on each frame update
	 */
	const animateNodesToPositions = useCallback(
		async (
			currentNodes: AppNode[],
			targetNodes: AppNode[],
			onFrame?: (nodes: AppNode[]) => void
		): Promise<AppNode[]> => {
			// Skip animation if user prefers reduced motion
			if (prefersReducedMotion()) {
				return targetNodes;
			}

			// Build maps for quick lookup
			const currentPositions = new Map(
				currentNodes.map((n) => [n.id, { ...n.position }])
			);
			const targetPositions = new Map(
				targetNodes.map((n) => [n.id, { ...n.position }])
			);

			// Check if there are any position changes to animate
			let hasChanges = false;
			for (const [id, targetPos] of targetPositions) {
				const currentPos = currentPositions.get(id);
				if (
					currentPos &&
					(Math.abs(currentPos.x - targetPos.x) > 1 ||
						Math.abs(currentPos.y - targetPos.y) > 1)
				) {
					hasChanges = true;
					break;
				}
			}

			// No animation needed
			if (!hasChanges) {
				return targetNodes;
			}

			setAnimationState({ isAnimating: true, progress: 0 });

			return new Promise((resolve) => {
				const startTime = performance.now();

				function animate(currentTime: number) {
					const elapsed = currentTime - startTime;
					const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);

					// Calculate interpolated positions
					const animatedNodes = targetNodes.map((targetNode) => {
						const currentPos = currentPositions.get(targetNode.id);
						if (!currentPos) return targetNode;

						const newPosition = interpolatePosition(
							currentPos,
							targetNode.position,
							progress
						);

						return {
							...targetNode,
							position: newPosition,
							data: {
								...targetNode.data,
								position_x: newPosition.x,
								position_y: newPosition.y,
							},
						};
					});

					// Update progress
					setAnimationState({ isAnimating: true, progress });

					// Call frame callback if provided
					if (onFrame) {
						onFrame(animatedNodes);
					}

					if (progress < 1) {
						requestAnimationFrame(animate);
					} else {
						setAnimationState({ isAnimating: false, progress: 1 });
						resolve(targetNodes);
					}
				}

				requestAnimationFrame(animate);
			});
		},
		[]
	);

	/**
	 * Cancel any ongoing animation
	 */
	const cancelAnimation = useCallback(() => {
		setAnimationState({ isAnimating: false, progress: 0 });
	}, []);

	return {
		animateNodesToPositions,
		cancelAnimation,
		isAnimating: animationState.isAnimating,
		animationProgress: animationState.progress,
	};
}

/**
 * CSS transition style for nodes
 * Use this when you want to animate via CSS instead of JavaScript
 * Apply to node components for hardware-accelerated transitions
 */
export const nodeTransitionStyle = {
	transition: `transform ${ANIMATION_DURATION_MS}ms cubic-bezier(${EASE_OUT_QUART.join(',')})`,
};

/**
 * Get CSS custom properties for animation timing
 * Useful for coordinating with CSS-based animations
 */
export const animationTimingVars = {
	'--layout-animation-duration': `${ANIMATION_DURATION_MS}ms`,
	'--layout-animation-easing': `cubic-bezier(${EASE_OUT_QUART.join(',')})`,
} as const;
