import { GRID_SIZE, ceilToGrid } from '@/constants/grid';
import useAppStore from '@/store/mind-map-store';
import type { AppNode } from '@/types/app-node';
import type { ResizeParams } from '@xyflow/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';

interface NodeDimensionConfig {
	minWidth?: number;
	minHeight?: number;
	maxWidth?: number;
	maxHeight?: number;
	autoHeight?: boolean;
	debounceMs?: number;
	contentWidth?: number;
	contentHeight?: number;
}

interface UseDimensionsReturn {
	dimensions: {
		width: number;
		height: number;
	};
	isResizing: boolean;
	handleResizeStart: () => void;
	handleResize: (event: unknown, params: ResizeParams) => void;
	handleResizeEnd: (event: unknown, params: ResizeParams) => void;
	shouldResize: (event: unknown, params: ResizeParams) => boolean;
	nodeRef: React.RefObject<HTMLDivElement | null>;
}

const DEFAULT_MIN_WIDTH = 288;
const DEFAULT_MIN_HEIGHT = 64;
const DEFAULT_MAX_WIDTH = 800;

export function useNodeDimensions(
	nodeId: string,
	config: NodeDimensionConfig = {}
): UseDimensionsReturn {
	const {
		minWidth = DEFAULT_MIN_WIDTH,
		minHeight = DEFAULT_MIN_HEIGHT,
		maxWidth = DEFAULT_MAX_WIDTH,
		maxHeight, // undefined = unlimited height
		autoHeight = true,
		debounceMs = 500,
		contentWidth = 0,
		contentHeight = 0,
	} = config;

	const { getNode, updateNodeDimensions } = useAppStore(
		useShallow((state) => ({
			getNode: state.getNode,
			updateNodeDimensions: state.updateNodeDimensions,
		}))
	);

	const node = getNode(nodeId) as AppNode | undefined;
	const nodeRef = useRef<HTMLDivElement>(null);
	const resizeObserverRef = useRef<ResizeObserver | null>(null);
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
	const hasObservedOnceRef = useRef(false);

	// Track resizing state
	const [isResizing, setIsResizing] = useState(false);

	// Get current dimensions with fallbacks
	const [dimensions, setDimensions] = useState(() => {
		const measured = node?.measured;
		const data = node?.data;
		return {
			width: measured?.width || data?.width || minWidth,
			height: measured?.height || data?.height || minHeight,
		};
	});

	// Ref to track latest dimensions for stable closures
	const dimensionsRef = useRef(dimensions);

	// Update ref when dimensions change
	useEffect(() => {
		dimensionsRef.current = dimensions;
	}, [dimensions]);

	/**
	 * Calculates dimensions that align with the grid and respect min/max constraints.
	 * This is the "business logic" for how big a node should be.
	 */
	const calculateSnappedDimensions = useCallback(
		(width: number, height: number, currentContentWidth = contentWidth, currentContentHeight = contentHeight) => {
			// Determine the effective minimums:
			// 1. Configured minWidth/minHeight
			// 2. Actual content size (so we don't cut off content)
			const effectiveMinWidth = Math.max(minWidth, currentContentWidth);
			const effectiveMinHeight = Math.max(minHeight, currentContentHeight);

			// Snap input dimensions up to grid step first
			// This ensures we always have enough space for the content
			const snappedWidth = ceilToGrid(Math.max(width, effectiveMinWidth), GRID_SIZE);
			const snappedHeight = ceilToGrid(Math.max(height, effectiveMinHeight), GRID_SIZE);

			return {
				width: Math.min(snappedWidth, maxWidth),
				height:
					maxHeight !== undefined
						? Math.min(snappedHeight, maxHeight)
						: snappedHeight,
			};
		},
		[minWidth, minHeight, maxWidth, maxHeight, contentWidth, contentHeight]
	);

	/**
	 * Updates dimensions in both local state and the global store.
	 * Handles debouncing to prevent excessive database writes.
	 */
	const updateStoreDimensions = useCallback(
		(width: number, height: number, immediate = false) => {
			const constrained = calculateSnappedDimensions(
				width,
				height,
				contentWidth,
				contentHeight
			);

			// Optimization: Don't trigger updates if dimensions haven't effectively changed
			// This is crucial for preventing loops where content size < grid size
			if (
				constrained.width === dimensionsRef.current.width &&
				constrained.height === dimensionsRef.current.height
			) {
				return;
			}

			// Update local state immediately for responsiveness
			setDimensions(constrained);

			// Clear existing timer
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}

			// Update store with debounce (unless immediate)
			const updateFn = () => {
				updateNodeDimensions(nodeId, constrained.width, constrained.height);
			};

			if (immediate) {
				updateFn();
			} else {
				debounceTimerRef.current = setTimeout(updateFn, debounceMs);
			}
		},
		[
			nodeId,
			calculateSnappedDimensions,
			updateNodeDimensions,
			debounceMs,
			contentWidth,
			contentHeight,
		]
	);

	// Resize handlers for NodeResizer
	const handleResizeStart = useCallback(() => {
		setIsResizing(true);
	}, []);

	const handleResize = useCallback(
		(event: unknown, params: ResizeParams) => {
			// Update dimensions during resize (debounced)
			updateStoreDimensions(params.width, params.height, false);
		},
		[updateStoreDimensions]
	);

	const handleResizeEnd = useCallback(
		(event: unknown, params: ResizeParams) => {
			setIsResizing(false);
			// Final update without debounce
			updateStoreDimensions(params.width, params.height, true);
		},
		[updateStoreDimensions]
	);

	// Constraint check for NodeResizer
	const shouldResize = useCallback(
		(event: unknown, params: ResizeParams) => {
			// Check if new dimensions are within constraints
			const widthValid = params.width >= minWidth && params.width <= maxWidth;
			const heightValid =
				params.height >= minHeight &&
				(maxHeight === undefined || params.height <= maxHeight);

			return widthValid && heightValid;
		},
		[minWidth, minHeight, maxWidth, maxHeight]
	);

	// Initial measurement on mount
	useEffect(() => {
		if (!nodeRef.current || !node) return;

		const element = nodeRef.current;
		const actualWidth = element.offsetWidth;
		const scrollHeight = element.scrollHeight;
		const clientHeight = element.clientHeight;

		const currentWidth = node.measured?.width || node.data?.width || minWidth;
		const currentHeight =
			node.measured?.height || node.data?.height || minHeight;

		// Check for overflow or significant width change
		const isOverflowing = scrollHeight > clientHeight;
		const widthDiff = Math.abs(actualWidth - currentWidth);

		if (isOverflowing || widthDiff > 10) {
			// If overflowing, add a buffer for borders (4px) to ensure we snap to the next step
			// If not overflowing, use the current height (don't shrink)
			const targetHeight = isOverflowing ? scrollHeight + 4 : currentHeight;
			
			const snapped = calculateSnappedDimensions(
				actualWidth, 
				targetHeight,
				element.scrollWidth,
				element.scrollHeight
			);

			if (
				snapped.width !== currentWidth ||
				snapped.height !== currentHeight
			) {
				setDimensions(snapped);
			}
		}
	}, [nodeId]); // Only run once on mount

	/**
	 * Handles ResizeObserver logic.
	 * Decides when to trigger a dimension update based on content changes.
	 */
	const handleResizeObservation = useCallback(
		(entries: ResizeObserverEntry[]) => {
			if (isResizing) return; // Don't interfere during manual resize

			// Skip the very first observer tick after mount
			if (!hasObservedOnceRef.current) {
				hasObservedOnceRef.current = true;
				return;
			}

			for (const entry of entries) {
				const element = entry.target as HTMLElement;

				const actualWidth = element.offsetWidth;
				const scrollHeight = element.scrollHeight;
				const clientHeight = element.clientHeight;

				// Check if content is overflowing the visible area
				// We use a small threshold (1px) to handle sub-pixel rendering differences
				const isOverflowing = scrollHeight > clientHeight + 1;

				// If overflowing, we need to expand.
				// We add a buffer (4px) to account for borders and ensure we clear the grid step.
				// If not overflowing, we keep the current height (stability).
				const currentDims = dimensionsRef.current;
				const targetHeight = isOverflowing
					? scrollHeight + 4
					: currentDims.height;

				// Calculate what the dimensions *should* be
				const targetDimensions = calculateSnappedDimensions(
					actualWidth,
					targetHeight,
					element.scrollWidth,
					element.scrollHeight
				);

				// Only update if the target dimensions are different from current
				if (
					targetDimensions.height !== currentDims.height ||
					targetDimensions.width !== currentDims.width
				) {
					updateStoreDimensions(actualWidth, targetHeight, false);
				}
			}
		},
		[
			isResizing,
			calculateSnappedDimensions,
			updateStoreDimensions,
		]
	);

	// Setup ResizeObserver for auto-height
	useEffect(() => {
		if (!autoHeight || !nodeRef.current) return;

		if (resizeObserverRef.current) {
			resizeObserverRef.current.disconnect();
		}

		hasObservedOnceRef.current = false;

		resizeObserverRef.current = new ResizeObserver(handleResizeObservation);
		resizeObserverRef.current.observe(nodeRef.current);

		return () => {
			if (resizeObserverRef.current) {
				resizeObserverRef.current.disconnect();
				resizeObserverRef.current = null;
			}
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, [autoHeight, handleResizeObservation, nodeId]);

	// Sync with node changes from store
	useEffect(() => {
		if (!node) return;

		const measured = node.measured;
		const data = node.data;
		const newDimensions = {
			width: measured?.width || data?.width || minWidth,
			height: measured?.height || data?.height || minHeight,
		};

		// Only update if dimensions actually changed
		if (
			newDimensions.width !== dimensions.width ||
			newDimensions.height !== dimensions.height
		) {
			setDimensions(
				calculateSnappedDimensions(newDimensions.width, newDimensions.height)
			);
		}
	}, [
		node?.measured?.width,
		node?.measured?.height,
		node?.data?.width,
		node?.data?.height,
	]);

	return {
		dimensions,
		isResizing,
		handleResizeStart,
		handleResize,
		handleResizeEnd,
		shouldResize,
		nodeRef,
	};
}
