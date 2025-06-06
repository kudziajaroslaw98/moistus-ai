import type {
	BuilderCanvas as BuilderCanvasType,
	BuilderElement,
} from '@/types/builder-node';
import { cn } from '@/utils/cn';
import { useCallback, useState } from 'react';

const GRID_OFFSET = 16; // Assuming this is constant and used by the hook

interface UseInteractiveElementProps {
	canvas: BuilderCanvasType;
	isEditing: boolean;
	selectedElementId: string | null;
	onUpdateElement: (updatedElement: BuilderElement) => void;
	canvasRef: React.RefObject<HTMLDivElement | null>;
}

export function useInteractiveElement({
	canvas,
	isEditing,
	selectedElementId,
	onUpdateElement,
	canvasRef,
}: UseInteractiveElementProps) {
	const [draggingElementId, setDraggingElementId] = useState<string | null>(
		null
	);
	const [livePosition, setLivePosition] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const [liveSize, setLiveSize] = useState<{
		width: number;
		height: number;
	} | null>(null);

	const getGridSize = useCallback(() => {
		return {
			x: canvas.columnWidth + canvas.columnGap,
			y: canvas.rowHeight + canvas.rowGap,
		};
	}, [canvas.columnWidth, canvas.columnGap, canvas.rowHeight, canvas.rowGap]);

	const snapToGrid = useCallback((value: number, gridSize: number) => {
		return Math.round(value / gridSize) * gridSize;
	}, []);

	const getCanvasRect = useCallback(() => {
		return canvasRef.current?.getBoundingClientRect();
	}, [canvasRef]);

	const handleDragStart = useCallback(() => {
		if (!isEditing || !selectedElementId) return;
		setDraggingElementId(selectedElementId);
	}, [isEditing, selectedElementId]);

	const handleDrag = useCallback(
		(element: BuilderElement, info: { point: { x: number; y: number } }) => {
			if (!isEditing || !selectedElementId || element.id !== selectedElementId)
				return;
			const canvasRect = getCanvasRect();
			if (!canvasRect) return;
			const { x: gridSizeX, y: gridSizeY } = getGridSize();
			let relX = info.point.x - canvasRect.left - GRID_OFFSET;
			let relY = info.point.y - canvasRect.top - GRID_OFFSET;
			relX = snapToGrid(relX, gridSizeX);
			relY = snapToGrid(relY, gridSizeY);

			const width =
				liveSize && element.id === selectedElementId
					? liveSize.width
					: element.position.width;
			const height =
				liveSize && element.id === selectedElementId
					? liveSize.height
					: element.position.height;

			const gridX = Math.max(
				0,
				Math.min(Math.floor(relX / gridSizeX), canvas.columns - width)
			);
			const gridY = Math.max(
				0,
				Math.min(Math.floor(relY / gridSizeY), canvas.rows - height)
			);
			setLivePosition({ x: gridX, y: gridY });
		},
		[
			isEditing,
			selectedElementId,
			getCanvasRect,
			getGridSize,
			snapToGrid,
			liveSize,
			canvas.columns,
			canvas.rows,
		]
	);

	const handleDragEnd = useCallback(
		(element: BuilderElement) => {
			if (!isEditing || !selectedElementId || element.id !== selectedElementId)
				return;

			if (livePosition) {
				onUpdateElement({
					...element,
					position: {
						...element.position,
						x: livePosition.x,
						y: livePosition.y,
					},
				});
				setLivePosition(null);
			}

			setDraggingElementId(null);
		},
		[isEditing, selectedElementId, livePosition, onUpdateElement]
	);

	const handleResizeDrag = useCallback(
		(element: BuilderElement, info: { point: { x: number; y: number } }) => {
			if (!isEditing || !selectedElementId || element.id !== selectedElementId)
				return;
			const canvasRect = getCanvasRect();
			if (!canvasRect) return;
			const { x: gridSizeX, y: gridSizeY } = getGridSize();
			const elementScreenX = element.position.x * gridSizeX + GRID_OFFSET;
			const elementScreenY = element.position.y * gridSizeY + GRID_OFFSET;

			const relX =
				info.point.x - canvasRect.left - elementScreenX + GRID_OFFSET;
			const relY = info.point.y - canvasRect.top - elementScreenY + GRID_OFFSET;

			const gridWidth = Math.max(
				1,
				Math.min(
					Math.round(relX / gridSizeX),
					canvas.columns - element.position.x
				)
			);
			const gridHeight = Math.max(
				1,
				Math.min(Math.round(relY / gridSizeY), canvas.rows - element.position.y)
			);
			setLiveSize({ width: gridWidth, height: gridHeight });
		},
		[
			isEditing,
			selectedElementId,
			getCanvasRect,
			getGridSize,
			canvas.columns,
			canvas.rows,
		]
	);

	const handleResizeEnd = useCallback(
		(element: BuilderElement) => {
			if (!isEditing || !selectedElementId || element.id !== selectedElementId)
				return;

			if (liveSize) {
				onUpdateElement({
					...element,
					position: {
						...element.position,
						width: liveSize.width,
						height: liveSize.height,
					},
				});
				setLiveSize(null);
			}
		},
		[isEditing, selectedElementId, liveSize, onUpdateElement]
	);

	const getElementStyle = useCallback(
		(element: BuilderElement) => {
			const { x, y, width, height } = element.position;
			const { x: gridSizeX, y: gridSizeY } = getGridSize();
			const isSelected = element.id === selectedElementId;

			const currentX = livePosition && isSelected ? livePosition.x : x;
			const currentY = livePosition && isSelected ? livePosition.y : y;
			const currentWidth = liveSize && isSelected ? liveSize.width : width;
			const currentHeight = liveSize && isSelected ? liveSize.height : height;

			const style = {
				left: currentX * gridSizeX + GRID_OFFSET,
				top: currentY * gridSizeY + GRID_OFFSET,
				width: currentWidth * gridSizeX - canvas.columnGap,
				height: currentHeight * gridSizeY - canvas.rowGap,
			};

			const className = cn(
				'absolute',
				(livePosition || liveSize) && isSelected
					? 'transition-none'
					: 'transition-all duration-100 ease-linear'
			);

			return { className, style };
		},
		[
			selectedElementId,
			livePosition,
			liveSize,
			getGridSize,
			canvas.columnGap,
			canvas.rowGap,
		]
	);

	return {
		draggingElementId,
		livePosition,
		liveSize,
		handleDragStart,
		handleDrag,
		handleDragEnd,
		handleResizeDrag,
		handleResizeEnd,
		getElementStyle,
	};
}
