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
		debounceMs = 500, // Increased from 100ms to reduce update frequency
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

	// Constraint enforcement helper (snap up to GRID_SIZE, then clamp to max)
	const enforceConstraints = useCallback(
		(width: number, height: number) => {
			// Snap input dimensions up to grid step first
			const snappedWidth = ceilToGrid(Math.max(width, minWidth), GRID_SIZE);
			const snappedHeight = ceilToGrid(Math.max(height, minHeight), GRID_SIZE);

			return {
				width: Math.min(snappedWidth, maxWidth),
				height:
					maxHeight !== undefined
						? Math.min(snappedHeight, maxHeight)
						: snappedHeight,
			};
		},
		[minWidth, minHeight, maxWidth, maxHeight]
	);

	// Update dimensions in store with debouncing
	const updateStoreDimensions = useCallback(
		(width: number, height: number, immediate = false) => {
			const constrained = enforceConstraints(width, height);

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
		[nodeId, enforceConstraints, updateNodeDimensions, debounceMs]
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

		// Use clientHeight (content + padding) instead of scrollHeight to prevent growth
		const actualWidth = nodeRef.current.offsetWidth;
		const actualHeight = nodeRef.current.scrollHeight;

		// Compare against measured dimensions (what React Flow rendered), not stored data
		const currentWidth = node.measured?.width || node.data?.width || minWidth;
		const currentHeight =
			node.measured?.height || node.data?.height || minHeight;

		// Only update if difference is significant (>10px to avoid tiny cumulative changes)
		const widthDiff = Math.abs(actualWidth - currentWidth);
		const heightDiff = Math.abs(actualHeight - currentHeight);

		if (widthDiff > 10 || heightDiff > 10) {
			// Update local state only, don't save to database yet
			setDimensions(enforceConstraints(actualWidth, actualHeight));
		}
	}, [nodeId]); // Only run once on mount

	// Setup ResizeObserver for auto-height
	useEffect(() => {
		if (!autoHeight || !nodeRef.current) return;

		// Cleanup existing observer
		if (resizeObserverRef.current) {
			resizeObserverRef.current.disconnect();
		}

		// Reset first-tick skip marker whenever observer is recreated
		hasObservedOnceRef.current = false;

		// Create new observer
		resizeObserverRef.current = new ResizeObserver((entries) => {
			if (isResizing) return; // Don't interfere during manual resize

			// Skip the very first observer tick after mount to avoid hydration-triggered writes
			if (!hasObservedOnceRef.current) {
				hasObservedOnceRef.current = true;
				return;
			}

			for (const entry of entries) {
				const element = entry.target as HTMLElement;

				// Use clientHeight (content + padding) to prevent cumulative growth
				// scrollHeight includes margins and can cause growth loops
				const actualHeight = element.scrollHeight;
				const actualWidth = element.offsetWidth;

				// Only update if dimensions changed significantly (>10px to avoid micro-changes)
				const heightChanged = Math.abs(actualHeight - dimensions.height) > 10;
				const widthChanged = Math.abs(actualWidth - dimensions.width) > 10;

				if (heightChanged || widthChanged) {
					updateStoreDimensions(actualWidth, actualHeight, false);
				}
			}
		});

		// Start observing
		resizeObserverRef.current.observe(nodeRef.current);

		// Cleanup
		return () => {
			if (resizeObserverRef.current) {
				resizeObserverRef.current.disconnect();
				resizeObserverRef.current = null;
			}

			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, [
		autoHeight,
		isResizing,
		dimensions.width,
		dimensions.height,
		updateStoreDimensions,
		nodeId,
	]);

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
				enforceConstraints(newDimensions.width, newDimensions.height)
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
