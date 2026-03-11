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
import type { AppEdge } from '@/types/app-edge';
import type { EdgeAnchor, Waypoint } from '@/types/path-types';
import { useCallback, useEffect, useRef, useState } from 'react';

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

interface AnimatedGraphState {
	nodes: AppNode[];
	edges: AppEdge[];
}

interface AnimateGraphToStateParams {
	currentNodes: AppNode[];
	targetNodes: AppNode[];
	currentEdges: AppEdge[];
	targetEdges: AppEdge[];
	animatedNodeIds?: Iterable<string>;
	animatedEdgeIds?: Iterable<string>;
	onFrame?: (graph: AnimatedGraphState) => void;
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

function interpolateCoordinate(start: number, end: number, progress: number): number {
	const easedProgress = easeOutQuart(progress);
	return start + (end - start) * easedProgress;
}

function getWaypointSignature(edge: AppEdge | undefined): string | null {
	const metadata = edge?.data?.metadata;
	const waypoints = metadata?.waypoints;
	const sourceAnchor = metadata?.sourceAnchor;
	const targetAnchor = metadata?.targetAnchor;
	return JSON.stringify({
		type: edge?.type,
		pathType: metadata?.pathType,
		sourceSide: sourceAnchor?.side ?? null,
		targetSide: targetAnchor?.side ?? null,
		waypointCount: waypoints?.length ?? 0,
	});
}

function interpolateAnchor(
	startAnchor: EdgeAnchor | undefined,
	endAnchor: EdgeAnchor | undefined,
	progress: number
): EdgeAnchor | undefined {
	if (!startAnchor || !endAnchor || startAnchor.side !== endAnchor.side) {
		return endAnchor;
	}

	return {
		...endAnchor,
		offset: interpolateCoordinate(startAnchor.offset, endAnchor.offset, progress),
	};
}

function interpolateWaypoints(
	startWaypoints: Waypoint[] | undefined,
	endWaypoints: Waypoint[] | undefined,
	progress: number
): Waypoint[] | undefined {
	if (!startWaypoints || !endWaypoints) {
		return endWaypoints;
	}

	if (startWaypoints.length !== endWaypoints.length) {
		return endWaypoints;
	}

	return endWaypoints.map((waypoint, index) => ({
		...waypoint,
		x: interpolateCoordinate(startWaypoints[index].x, waypoint.x, progress),
		y: interpolateCoordinate(startWaypoints[index].y, waypoint.y, progress),
	}));
}

function interpolateEdge(
	currentEdge: AppEdge | undefined,
	targetEdge: AppEdge,
	progress: number
): AppEdge {
	if (!currentEdge) {
		return targetEdge;
	}

	if (getWaypointSignature(currentEdge) !== getWaypointSignature(targetEdge)) {
		return targetEdge;
	}

	const currentMetadata = currentEdge.data?.metadata;
	const targetMetadata = targetEdge.data?.metadata;

	if (!currentMetadata || !targetMetadata) {
		return targetEdge;
	}

	return {
		...targetEdge,
		data: targetEdge.data
			? {
					...targetEdge.data,
					metadata: {
						...targetMetadata,
						sourceAnchor: interpolateAnchor(
							currentMetadata.sourceAnchor,
							targetMetadata.sourceAnchor,
							progress
						),
						targetAnchor: interpolateAnchor(
							currentMetadata.targetAnchor,
							targetMetadata.targetAnchor,
							progress
						),
						waypoints: interpolateWaypoints(
							currentMetadata.waypoints,
							targetMetadata.waypoints,
							progress
						),
					},
				}
			: targetEdge.data,
	};
}

export function useAnimatedLayout() {
	const [animationState, setAnimationState] = useState<AnimationState>({
		isAnimating: false,
		progress: 0,
	});

	// Track the active requestAnimationFrame ID for cancellation
	const rafIdRef = useRef<number | null>(null);
	// Track whether the animation has been cancelled (or component unmounted)
	const cancelledRef = useRef(false);

	/**
	 * Cancel any ongoing animation
	 * Cancels the rAF loop and prevents further state updates
	 */
	const cancelAnimation = useCallback(() => {
		cancelledRef.current = true;
		if (rafIdRef.current !== null) {
			cancelAnimationFrame(rafIdRef.current);
			rafIdRef.current = null;
		}
		setAnimationState({ isAnimating: false, progress: 0 });
	}, []);

	// Cleanup on unmount: cancel any running animation
	useEffect(() => {
		return () => {
			cancelledRef.current = true;
			if (rafIdRef.current !== null) {
				cancelAnimationFrame(rafIdRef.current);
				rafIdRef.current = null;
			}
		};
	}, []);

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

			// Cancel any existing animation before starting a new one
			if (rafIdRef.current !== null) {
				cancelAnimationFrame(rafIdRef.current);
				rafIdRef.current = null;
			}
			// Reset cancelled flag for this new animation
			cancelledRef.current = false;

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
					// Check if animation was cancelled or component unmounted
					if (cancelledRef.current) {
						rafIdRef.current = null;
						resolve(targetNodes);
						return;
					}

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

					// Check again before state updates (rAF callback could be delayed)
					if (cancelledRef.current) {
						rafIdRef.current = null;
						resolve(targetNodes);
						return;
					}

					// Update progress
					setAnimationState({ isAnimating: true, progress });

					// Call frame callback if provided
					if (onFrame) {
						onFrame(animatedNodes);
					}

					if (progress < 1) {
						rafIdRef.current = requestAnimationFrame(animate);
					} else {
						rafIdRef.current = null;
						setAnimationState({ isAnimating: false, progress: 1 });
						resolve(targetNodes);
					}
				}

				rafIdRef.current = requestAnimationFrame(animate);
			});
		},
		[]
	);

	const animateGraphToState = useCallback(
		async ({
			currentNodes,
			targetNodes,
			currentEdges,
			targetEdges,
			animatedNodeIds,
			animatedEdgeIds,
			onFrame,
		}: AnimateGraphToStateParams): Promise<AnimatedGraphState> => {
			if (prefersReducedMotion()) {
				return { nodes: targetNodes, edges: targetEdges };
			}

			if (rafIdRef.current !== null) {
				cancelAnimationFrame(rafIdRef.current);
				rafIdRef.current = null;
			}
			cancelledRef.current = false;

			const animatedNodeIdSet = animatedNodeIds
				? new Set(animatedNodeIds)
				: null;
			const animatedEdgeIdSet = animatedEdgeIds
				? new Set(animatedEdgeIds)
				: null;
			const currentPositions = new Map(
				currentNodes.map((node) => [node.id, { ...node.position }])
			);
			const currentEdgesById = new Map(
				currentEdges.map((edge) => [edge.id, edge])
			);

			let hasChanges = false;
			for (const targetNode of targetNodes) {
				if (animatedNodeIdSet && !animatedNodeIdSet.has(targetNode.id)) {
					continue;
				}

				const currentPosition = currentPositions.get(targetNode.id);
				if (
					currentPosition &&
					(Math.abs(currentPosition.x - targetNode.position.x) > 1 ||
						Math.abs(currentPosition.y - targetNode.position.y) > 1)
				) {
					hasChanges = true;
					break;
				}
			}

			if (!hasChanges) {
				for (const targetEdge of targetEdges) {
					if (animatedEdgeIdSet && !animatedEdgeIdSet.has(targetEdge.id)) {
						continue;
					}

					const currentEdge = currentEdgesById.get(targetEdge.id);
					if (!currentEdge) {
						continue;
					}

					if (getWaypointSignature(currentEdge) === getWaypointSignature(targetEdge)) {
						const currentWaypoints = currentEdge.data?.metadata?.waypoints ?? [];
						const targetWaypoints = targetEdge.data?.metadata?.waypoints ?? [];
						const hasWaypointChanges = currentWaypoints.some(
							(waypoint, index) =>
								Math.abs(waypoint.x - (targetWaypoints[index]?.x ?? waypoint.x)) > 1 ||
								Math.abs(waypoint.y - (targetWaypoints[index]?.y ?? waypoint.y)) > 1
						);

						if (hasWaypointChanges) {
							hasChanges = true;
							break;
						}
					}
				}
			}

			if (!hasChanges) {
				return { nodes: targetNodes, edges: targetEdges };
			}

			setAnimationState({ isAnimating: true, progress: 0 });

			return new Promise((resolve) => {
				const startTime = performance.now();

				function animate(currentTime: number) {
					if (cancelledRef.current) {
						rafIdRef.current = null;
						resolve({ nodes: targetNodes, edges: targetEdges });
						return;
					}

					const elapsed = currentTime - startTime;
					const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);

					const nodes = targetNodes.map((targetNode) => {
						if (animatedNodeIdSet && !animatedNodeIdSet.has(targetNode.id)) {
							return targetNode;
						}

						const currentPosition = currentPositions.get(targetNode.id);
						if (!currentPosition) {
							return targetNode;
						}

						const newPosition = interpolatePosition(
							currentPosition,
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

					const edges = targetEdges.map((targetEdge) => {
						if (animatedEdgeIdSet && !animatedEdgeIdSet.has(targetEdge.id)) {
							return targetEdge;
						}

						return interpolateEdge(
							currentEdgesById.get(targetEdge.id),
							targetEdge,
							progress
						);
					});

					setAnimationState({ isAnimating: true, progress });
					onFrame?.({ nodes, edges });

					if (progress < 1) {
						rafIdRef.current = requestAnimationFrame(animate);
						return;
					}

					rafIdRef.current = null;
					setAnimationState({ isAnimating: false, progress: 1 });
					resolve({ nodes: targetNodes, edges: targetEdges });
				}

				rafIdRef.current = requestAnimationFrame(animate);
			});
		},
		[]
	);

	return {
		animateNodesToPositions,
		animateGraphToState,
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
