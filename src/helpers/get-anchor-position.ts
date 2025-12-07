import type { EdgeAnchor } from '@/types/path-types';

// Minimal interface for node with position and measurements
interface NodeWithMeasurements {
	internals: { positionAbsolute: { x: number; y: number } };
	measured: { width?: number; height?: number };
}

/**
 * Calculates the absolute position of an anchor point on a node's border.
 */
export function getAnchorPosition(
	node: NodeWithMeasurements,
	anchor: EdgeAnchor
): { x: number; y: number } {
	const { x: nodeX, y: nodeY } = node.internals.positionAbsolute;
	const width = node.measured.width ?? 0;
	const height = node.measured.height ?? 0;

	switch (anchor.side) {
		case 'top':
			return {
				x: nodeX + width * anchor.offset,
				y: nodeY,
			};
		case 'bottom':
			return {
				x: nodeX + width * anchor.offset,
				y: nodeY + height,
			};
		case 'left':
			return {
				x: nodeX,
				y: nodeY + height * anchor.offset,
			};
		case 'right':
			return {
				x: nodeX + width,
				y: nodeY + height * anchor.offset,
			};
		default:
			// Default to center of bottom edge
			return {
				x: nodeX + width / 2,
				y: nodeY + height,
			};
	}
}

/**
 * Projects a point to the nearest position on a node's rectangular border.
 * Returns an EdgeAnchor representing the side and offset.
 */
export function projectToNodePerimeter(
	node: NodeWithMeasurements,
	point: { x: number; y: number }
): EdgeAnchor {
	const { x: nodeX, y: nodeY } = node.internals.positionAbsolute;
	const width = node.measured.width ?? 0;
	const height = node.measured.height ?? 0;

	// Calculate node center
	const centerX = nodeX + width / 2;
	const centerY = nodeY + height / 2;

	// Vector from center to point
	const dx = point.x - centerX;
	const dy = point.y - centerY;

	// If point is at center, default to bottom
	if (dx === 0 && dy === 0) {
		return { side: 'bottom', offset: 0.5 };
	}

	// Determine which edge the point is closest to using angle
	// We'll find intersection with the rectangle boundary
	const halfWidth = width / 2;
	const halfHeight = height / 2;

	// Calculate the scaling factor to reach each edge
	// For horizontal edges (top/bottom)
	const tVertical = dy !== 0 ? halfHeight / Math.abs(dy) : Infinity;
	// For vertical edges (left/right)
	const tHorizontal = dx !== 0 ? halfWidth / Math.abs(dx) : Infinity;

	// Use the smaller scaling factor (closer edge)
	if (tHorizontal < tVertical) {
		// Intersects left or right edge
		const side = dx > 0 ? 'right' : 'left';
		// Calculate y position at intersection
		const intersectY = centerY + dy * tHorizontal;
		// Convert to offset (0-1 along the edge, top-to-bottom)
		const offset = Math.max(0, Math.min(1, (intersectY - nodeY) / height));
		return { side, offset };
	} else {
		// Intersects top or bottom edge
		const side = dy > 0 ? 'bottom' : 'top';
		// Calculate x position at intersection
		const intersectX = centerX + dx * tVertical;
		// Convert to offset (0-1 along the edge, left-to-right)
		const offset = Math.max(0, Math.min(1, (intersectX - nodeX) / width));
		return { side, offset };
	}
}

/**
 * Gets the React Flow Position enum value from an EdgeAnchor side.
 */
export function getPositionFromAnchorSide(
	side: EdgeAnchor['side']
): 'top' | 'bottom' | 'left' | 'right' {
	return side;
}

/**
 * Creates a default anchor at the center of the specified side.
 */
export function createDefaultAnchor(
	side: 'top' | 'bottom' | 'left' | 'right'
): EdgeAnchor {
	return { side, offset: 0.5 };
}

/**
 * Validates and clamps an EdgeAnchor's offset to valid range [0, 1].
 */
export function normalizeAnchor(anchor: EdgeAnchor): EdgeAnchor {
	return {
		side: anchor.side,
		offset: Math.max(0, Math.min(1, anchor.offset)),
	};
}
