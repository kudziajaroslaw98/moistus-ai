'use client';

import { getFloatingEdgePath } from '@/helpers/get-floating-edge-path';
import useAppStore from '@/store/mind-map-store';
import type { EdgeData } from '@/types/edge-data';
import type { NodeData } from '@/types/node-data';
import type { PathType } from '@/types/path-types';
import { cn } from '@/utils/cn';
import {
	BaseEdge,
	type Edge,
	type EdgeProps,
	getBezierPath,
	getSmoothStepPath,
	getStraightPath,
	type Node,
	Position,
	useInternalNode,
} from '@xyflow/react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';

// Helper function to get the appropriate path calculation function
const getPathFunction = (pathType?: PathType) => {
	switch (pathType) {
		case 'bezier':
			return getBezierPath;
		case 'straight':
			return getStraightPath;
		case 'step':
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return (params: any) => getSmoothStepPath({ ...params, borderRadius: 0 });
		case 'smoothstep':
		default:
			return getSmoothStepPath;
	}
};

interface AnimatedGhostEdgeProps extends EdgeProps<Edge<EdgeData>> {
	/**
	 * Callback fired when the edge animation completes
	 * Use this to trigger the ghost node reveal
	 */
	onAnimationComplete?: () => void;

	/**
	 * Whether to auto-start the animation
	 * @default true
	 */
	autoPlay?: boolean;

	/**
	 * Custom animation duration in milliseconds
	 * @default 300
	 */
	duration?: number;
}

function AnimatedGhostEdgeComponent({
	id,
	source,
	target,
	style = {},
	data,
	selected,
	onAnimationComplete,
	autoPlay = true,
	duration: customDuration,
}: AnimatedGhostEdgeProps) {
	const pathRef = useRef<SVGPathElement>(null);
	const [pathLength, setPathLength] = useState(0);
	const [hasAnimated, setHasAnimated] = useState(false);
	const animationControls = useRef<any>(null);

	const { suggestionConfig } = useAppStore(
		useShallow((state) => ({
			suggestionConfig: state.suggestionConfig,
		}))
	);

	const pathFunction = useMemo(
		() => getPathFunction(data?.metadata?.pathType),
		[data?.metadata?.pathType]
	);

	const sourceNode = useInternalNode<Node<NodeData>>(source);
	const targetNode = useInternalNode<Node<NodeData>>(target);

	const strokeWidth =
		parseInt(data?.style?.strokeWidth?.toString() ?? '2') ?? 2;

	// Get floating edge path coordinates
	const { sourceX, sourceY, targetX, targetY, sourcePos, targetPos } =
		useMemo(() => {
			if (!sourceNode || !targetNode) {
				return {
					sourceX: 0,
					sourceY: 0,
					targetX: 0,
					targetY: 0,
					sourcePos: Position.Top,
					targetPos: Position.Top,
				};
			}

			return getFloatingEdgePath(sourceNode, targetNode, strokeWidth * 2);
		}, [sourceNode, targetNode, strokeWidth]);

	// Calculate edge path
	const [edgePath] = useMemo(
		() =>
			pathFunction({
				sourceX,
				sourceY,
				sourcePosition: sourcePos,
				targetX,
				targetY,
				targetPosition: targetPos,
			}),
		[pathFunction, sourceX, sourceY, sourcePos, targetX, targetY, targetPos]
	);

	// Check for reduced motion preference
	const prefersReducedMotion =
		typeof window !== 'undefined'
			? window.matchMedia('(prefers-reduced-motion: reduce)').matches
			: false;

	// Get animation config
	const animationDuration =
		customDuration ??
		(prefersReducedMotion && suggestionConfig.animation.respectReducedMotion
			? 10
			: suggestionConfig.animation.edgeDuration);

	const easing = suggestionConfig.animation.easing.edge;

	// Motion value for animation progress
	const progress = useMotionValue(0);
	const dashOffset = useTransform(
		progress,
		[0, 1],
		[pathLength, 0] // Animate from full length to 0
	);

	// Measure path length on mount and when path changes
	useEffect(() => {
		if (pathRef.current) {
			const length = pathRef.current.getTotalLength();
			setPathLength(length);
		}
	}, [edgePath]);

	// Start animation when path length is known
	useEffect(() => {
		if (pathLength > 0 && autoPlay && !hasAnimated) {
			setHasAnimated(true);

			// Start animation
			animationControls.current = animate(progress, 1, {
				duration: animationDuration / 1000, // Convert to seconds
				ease: easing as any,
				onComplete: () => {
					if (onAnimationComplete) {
						onAnimationComplete();
					}
				},
			});
		}

		return () => {
			// Cleanup animation on unmount
			if (animationControls.current) {
				animationControls.current.stop();
			}
		};
	}, [
		pathLength,
		autoPlay,
		hasAnimated,
		animationDuration,
		easing,
		onAnimationComplete,
		progress,
	]);

	// Ghost edge styling with gradient
	const gradientId = `ghost-gradient-${id}`;
	const glowId = `ghost-glow-${id}`;

	const ghostColor = 'rgba(96, 165, 250, 0.6)'; // Blue-400 with transparency
	const ghostColorBright = 'rgba(96, 165, 250, 0.9)';

	if (!sourceNode || !targetNode || pathLength === 0) {
		return null;
	}

	return (
		<>
			{/* Define gradient and glow effects */}
			<defs>
				{/* Gradient stroke */}
				<linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
					<stop offset="0%" stopColor={ghostColor} stopOpacity="0.2" />
					<stop offset="50%" stopColor={ghostColorBright} stopOpacity="0.8" />
					<stop offset="100%" stopColor={ghostColor} stopOpacity="0.2" />
				</linearGradient>

				{/* Glow effect */}
				<filter id={glowId}>
					<feGaussianBlur stdDeviation="2" result="coloredBlur" />
					<feMerge>
						<feMergeNode in="coloredBlur" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>

			{/* Animated path */}
			<motion.path
				ref={pathRef}
				id={id}
				d={edgePath}
				fill="none"
				stroke={`url(#${gradientId})`}
				strokeWidth={strokeWidth}
				strokeDasharray={pathLength}
				strokeDashoffset={dashOffset}
				strokeLinecap="round"
				filter={`url(#${glowId})`}
				className={cn(
					'react-flow__edge-path',
					'pointer-events-none',
					selected && 'stroke-blue-400'
				)}
				style={{
					...style,
					...data?.style,
				}}
			/>
		</>
	);
}

export const AnimatedGhostEdge = memo(AnimatedGhostEdgeComponent);
AnimatedGhostEdge.displayName = 'AnimatedGhostEdge';
export default AnimatedGhostEdge;
