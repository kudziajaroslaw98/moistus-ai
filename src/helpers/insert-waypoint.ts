import type { Waypoint } from '@/types/path-types';

interface Point {
	x: number;
	y: number;
}

/**
 * Finds the correct insertion index for a new waypoint based on click position.
 * Returns the index in the waypoints array where the new waypoint should be inserted.
 */
export function findWaypointInsertIndex(
	sourceX: number,
	sourceY: number,
	targetX: number,
	targetY: number,
	waypoints: Waypoint[],
	clickX: number,
	clickY: number
): number {
	const points: Point[] = [
		{ x: sourceX, y: sourceY },
		...waypoints,
		{ x: targetX, y: targetY },
	];

	// Find which segment the click is closest to
	let minDistance = Infinity;
	let insertIndex = 0;

	for (let i = 0; i < points.length - 1; i++) {
		const distance = pointToSegmentDistance(
			clickX,
			clickY,
			points[i].x,
			points[i].y,
			points[i + 1].x,
			points[i + 1].y
		);

		if (distance < minDistance) {
			minDistance = distance;
			// Insert at position i in the waypoints array
			// (since points[0] is source, waypoint index 0 corresponds to points[1])
			insertIndex = i;
		}
	}

	return insertIndex;
}

/**
 * Calculates the perpendicular distance from a point to a line segment.
 */
function pointToSegmentDistance(
	px: number,
	py: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number
): number {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const lengthSquared = dx * dx + dy * dy;

	if (lengthSquared === 0) {
		// Segment is a point
		return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
	}

	// Calculate projection of point onto the line segment
	const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));

	// Find the closest point on the segment
	const projX = x1 + t * dx;
	const projY = y1 + t * dy;

	// Return distance from point to projection
	return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

/**
 * Checks if a point is close enough to a path segment to be considered a click on it.
 * Useful for determining if a double-click should add a waypoint.
 */
export function isPointNearSegment(
	px: number,
	py: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	threshold: number = 10
): boolean {
	return pointToSegmentDistance(px, py, x1, y1, x2, y2) <= threshold;
}
