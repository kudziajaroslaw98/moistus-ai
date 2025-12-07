import type { Waypoint, WaypointCurveType } from '@/types/path-types';

export interface WaypointPathResult {
	path: string;
	labelX: number;
	labelY: number;
}

interface Point {
	x: number;
	y: number;
}

/**
 * Builds an SVG path through a series of waypoints with the specified curve type.
 * Returns the path string and label position at the midpoint.
 */
export function getWaypointPath(
	sourceX: number,
	sourceY: number,
	targetX: number,
	targetY: number,
	waypoints: Waypoint[] = [],
	curveType: WaypointCurveType = 'linear'
): WaypointPathResult {
	const points: Point[] = [
		{ x: sourceX, y: sourceY },
		...waypoints,
		{ x: targetX, y: targetY },
	];

	let path: string;

	switch (curveType) {
		case 'linear':
			path = getLinearPath(points);
			break;
		case 'bezier':
			path = getSmoothBezierPath(points);
			break;
		case 'catmull-rom':
			path = getCatmullRomPath(points);
			break;
		case 'smoothstep':
			path = getSmoothStepPath(points);
			break;
		default:
			path = getLinearPath(points);
	}

	const { labelX, labelY } = calculateLabelPosition(points);

	return { path, labelX, labelY };
}

/**
 * Creates a path with straight line segments between all points.
 */
function getLinearPath(points: Point[]): string {
	if (points.length === 0) return '';
	if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

	return points.reduce((path, point, i) => {
		return path + (i === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`);
	}, '');
}

/**
 * Creates smooth cubic bezier curves through all points.
 * Uses control point calculation for smooth transitions at each waypoint.
 */
function getSmoothBezierPath(points: Point[]): string {
	if (points.length < 2) return getLinearPath(points);
	if (points.length === 2) {
		return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
	}

	let path = `M ${points[0].x} ${points[0].y}`;

	for (let i = 0; i < points.length - 1; i++) {
		const p0 = points[Math.max(0, i - 1)];
		const p1 = points[i];
		const p2 = points[i + 1];
		const p3 = points[Math.min(points.length - 1, i + 2)];

		// Calculate control points using Catmull-Rom to Bezier conversion
		const tension = 0.3;

		const cp1x = p1.x + (p2.x - p0.x) * tension;
		const cp1y = p1.y + (p2.y - p0.y) * tension;
		const cp2x = p2.x - (p3.x - p1.x) * tension;
		const cp2y = p2.y - (p3.y - p1.y) * tension;

		path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
	}

	return path;
}

/**
 * Creates a Catmull-Rom spline through all points.
 * This produces natural-looking curves that pass through every control point.
 */
function getCatmullRomPath(points: Point[]): string {
	if (points.length < 2) return getLinearPath(points);
	if (points.length === 2) {
		return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
	}

	let path = `M ${points[0].x} ${points[0].y}`;

	// Catmull-Rom to Bezier conversion with alpha = 0.5 (centripetal)
	const alpha = 0.5;

	for (let i = 0; i < points.length - 1; i++) {
		const p0 = points[Math.max(0, i - 1)];
		const p1 = points[i];
		const p2 = points[i + 1];
		const p3 = points[Math.min(points.length - 1, i + 2)];

		// Calculate segment lengths
		const d1 = Math.sqrt(Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2));
		const d2 = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
		const d3 = Math.sqrt(Math.pow(p3.x - p2.x, 2) + Math.pow(p3.y - p2.y, 2));

		// Avoid division by zero
		const d1a = Math.pow(d1, alpha) || 1;
		const d2a = Math.pow(d2, alpha) || 1;
		const d3a = Math.pow(d3, alpha) || 1;

		// Calculate control points
		const cp1x = (d1a * d1a * p2.x - d2a * d2a * p0.x + (2 * d1a * d1a + 3 * d1a * d2a + d2a * d2a) * p1.x) / (3 * d1a * (d1a + d2a));
		const cp1y = (d1a * d1a * p2.y - d2a * d2a * p0.y + (2 * d1a * d1a + 3 * d1a * d2a + d2a * d2a) * p1.y) / (3 * d1a * (d1a + d2a));

		const cp2x = (d3a * d3a * p1.x - d2a * d2a * p3.x + (2 * d3a * d3a + 3 * d3a * d2a + d2a * d2a) * p2.x) / (3 * d3a * (d3a + d2a));
		const cp2y = (d3a * d3a * p1.y - d2a * d2a * p3.y + (2 * d3a * d3a + 3 * d3a * d2a + d2a * d2a) * p2.y) / (3 * d3a * (d3a + d2a));

		// Handle edge cases where control points might be NaN
		const safeCp1x = isFinite(cp1x) ? cp1x : p1.x + (p2.x - p1.x) * 0.33;
		const safeCp1y = isFinite(cp1y) ? cp1y : p1.y + (p2.y - p1.y) * 0.33;
		const safeCp2x = isFinite(cp2x) ? cp2x : p1.x + (p2.x - p1.x) * 0.66;
		const safeCp2y = isFinite(cp2y) ? cp2y : p1.y + (p2.y - p1.y) * 0.66;

		path += ` C ${safeCp1x} ${safeCp1y}, ${safeCp2x} ${safeCp2y}, ${p2.x} ${p2.y}`;
	}

	return path;
}

/**
 * Creates orthogonal (smoothstep) path where waypoints act as bend points.
 * Path consists of horizontal and vertical segments only, with rounded corners.
 * Each waypoint is a corner where the path changes direction by 90°.
 */
function getSmoothStepPath(points: Point[], borderRadius = 8): string {
	if (points.length < 2) return getLinearPath(points);
	if (points.length === 2) {
		// No waypoints - create standard smoothstep between two points
		return getSmoothStepBetweenTwoPoints(points[0], points[1], borderRadius);
	}

	// With waypoints, each waypoint is a corner (bend point)
	// Route: source -> wp1 -> wp2 -> ... -> target
	// At each waypoint, we make an orthogonal turn
	let path = `M ${points[0].x} ${points[0].y}`;

	for (let i = 0; i < points.length - 1; i++) {
		const current = points[i];
		const next = points[i + 1];
		const isLastSegment = i === points.length - 2;

		if (i === 0 && !isLastSegment) {
			// First segment: go from source toward first waypoint
			// Route orthogonally to the waypoint (which is a corner)
			path += createOrthogonalSegmentToCorner(current, next, borderRadius, 'start');
		} else if (isLastSegment && i > 0) {
			// Last segment: complete the path from last waypoint to target
			path += createOrthogonalSegmentFromCorner(current, next, borderRadius);
		} else if (i === 0 && isLastSegment) {
			// Only two points and this is the only segment
			path = getSmoothStepBetweenTwoPoints(current, next, borderRadius);
		} else {
			// Middle segment: waypoint to waypoint (corner to corner)
			path += createCornerToCornerSegment(current, next, borderRadius);
		}
	}

	return path;
}

/**
 * Creates a smoothstep path between two points with no waypoints.
 * Uses midpoint for the orthogonal turn.
 */
function getSmoothStepBetweenTwoPoints(p1: Point, p2: Point, borderRadius: number): string {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;

	// Determine routing direction based on which distance is greater
	const horizontal = Math.abs(dx) >= Math.abs(dy);

	if (horizontal) {
		// Horizontal first, then vertical
		const midX = p1.x + dx / 2;
		const r = Math.min(borderRadius, Math.abs(dx) / 2, Math.abs(dy) / 2);

		if (Math.abs(dy) < r * 2 || Math.abs(dx) < r * 2) {
			// Too short for rounded corners, use straight line
			return `M ${p1.x} ${p1.y} L ${midX} ${p1.y} L ${midX} ${p2.y} L ${p2.x} ${p2.y}`;
		}

		const yDir = dy > 0 ? 1 : -1;

		return `M ${p1.x} ${p1.y} ` +
			`L ${midX - r} ${p1.y} ` +
			`Q ${midX} ${p1.y} ${midX} ${p1.y + r * yDir} ` +
			`L ${midX} ${p2.y - r * yDir} ` +
			`Q ${midX} ${p2.y} ${midX + r * (dx > 0 ? 1 : -1)} ${p2.y} ` +
			`L ${p2.x} ${p2.y}`;
	} else {
		// Vertical first, then horizontal
		const midY = p1.y + dy / 2;
		const r = Math.min(borderRadius, Math.abs(dx) / 2, Math.abs(dy) / 2);

		if (Math.abs(dx) < r * 2 || Math.abs(dy) < r * 2) {
			return `M ${p1.x} ${p1.y} L ${p1.x} ${midY} L ${p2.x} ${midY} L ${p2.x} ${p2.y}`;
		}

		const xDir = dx > 0 ? 1 : -1;

		return `M ${p1.x} ${p1.y} ` +
			`L ${p1.x} ${midY - r * (dy > 0 ? 1 : -1)} ` +
			`Q ${p1.x} ${midY} ${p1.x + r * xDir} ${midY} ` +
			`L ${p2.x - r * xDir} ${midY} ` +
			`Q ${p2.x} ${midY} ${p2.x} ${midY + r * (dy > 0 ? 1 : -1)} ` +
			`L ${p2.x} ${p2.y}`;
	}
}

/**
 * Creates an orthogonal segment from start point to a corner (waypoint).
 * The waypoint is the actual corner location.
 */
function createOrthogonalSegmentToCorner(
	start: Point,
	corner: Point,
	borderRadius: number,
	_type: 'start'
): string {
	const dx = corner.x - start.x;
	const dy = corner.y - start.y;
	const r = Math.min(borderRadius, Math.abs(dx) / 2, Math.abs(dy) / 2);

	// Go to the corner with a rounded turn
	// We go horizontal first, then vertical (or vice versa based on position)
	const horizontal = Math.abs(dx) >= Math.abs(dy);

	if (horizontal) {
		if (Math.abs(dy) < 1) {
			// Nearly horizontal - just go straight
			return ` L ${corner.x} ${corner.y}`;
		}
		const yDir = dy > 0 ? 1 : -1;
		const xDir = dx > 0 ? 1 : -1;

		if (r < 1) {
			return ` L ${corner.x} ${start.y} L ${corner.x} ${corner.y}`;
		}

		return ` L ${corner.x - r * xDir} ${start.y} ` +
			`Q ${corner.x} ${start.y} ${corner.x} ${start.y + r * yDir} ` +
			`L ${corner.x} ${corner.y}`;
	} else {
		if (Math.abs(dx) < 1) {
			// Nearly vertical - just go straight
			return ` L ${corner.x} ${corner.y}`;
		}
		const xDir = dx > 0 ? 1 : -1;
		const yDir = dy > 0 ? 1 : -1;

		if (r < 1) {
			return ` L ${start.x} ${corner.y} L ${corner.x} ${corner.y}`;
		}

		return ` L ${start.x} ${corner.y - r * yDir} ` +
			`Q ${start.x} ${corner.y} ${start.x + r * xDir} ${corner.y} ` +
			`L ${corner.x} ${corner.y}`;
	}
}

/**
 * Creates an orthogonal segment from a corner (waypoint) to the end point.
 */
function createOrthogonalSegmentFromCorner(
	corner: Point,
	end: Point,
	borderRadius: number
): string {
	const dx = end.x - corner.x;
	const dy = end.y - corner.y;
	const r = Math.min(borderRadius, Math.abs(dx) / 2, Math.abs(dy) / 2);

	const horizontal = Math.abs(dx) >= Math.abs(dy);

	if (horizontal) {
		if (Math.abs(dy) < 1) {
			return ` L ${end.x} ${end.y}`;
		}
		const yDir = dy > 0 ? 1 : -1;
		const xDir = dx > 0 ? 1 : -1;

		if (r < 1) {
			return ` L ${corner.x} ${end.y} L ${end.x} ${end.y}`;
		}

		// From corner, go vertical first then horizontal
		return ` L ${corner.x} ${end.y - r * yDir} ` +
			`Q ${corner.x} ${end.y} ${corner.x + r * xDir} ${end.y} ` +
			`L ${end.x} ${end.y}`;
	} else {
		if (Math.abs(dx) < 1) {
			return ` L ${end.x} ${end.y}`;
		}
		const xDir = dx > 0 ? 1 : -1;
		const yDir = dy > 0 ? 1 : -1;

		if (r < 1) {
			return ` L ${end.x} ${corner.y} L ${end.x} ${end.y}`;
		}

		// From corner, go horizontal first then vertical
		return ` L ${end.x - r * xDir} ${corner.y} ` +
			`Q ${end.x} ${corner.y} ${end.x} ${corner.y + r * yDir} ` +
			`L ${end.x} ${end.y}`;
	}
}

/**
 * Creates an orthogonal segment from one corner to another.
 * Both points are waypoints (bend points).
 */
function createCornerToCornerSegment(
	corner1: Point,
	corner2: Point,
	borderRadius: number
): string {
	const dx = corner2.x - corner1.x;
	const dy = corner2.y - corner1.y;

	// For corner-to-corner, we need to route orthogonally
	// Use the midpoint as an intermediate turn
	const horizontal = Math.abs(dx) >= Math.abs(dy);
	const r = Math.min(borderRadius, Math.abs(dx) / 4, Math.abs(dy) / 4);

	if (horizontal) {
		if (Math.abs(dy) < 1) {
			return ` L ${corner2.x} ${corner2.y}`;
		}
		const midX = corner1.x + dx / 2;
		const yDir = dy > 0 ? 1 : -1;
		const xDir = dx > 0 ? 1 : -1;

		if (r < 1) {
			return ` L ${midX} ${corner1.y} L ${midX} ${corner2.y} L ${corner2.x} ${corner2.y}`;
		}

		return ` L ${midX - r * xDir} ${corner1.y} ` +
			`Q ${midX} ${corner1.y} ${midX} ${corner1.y + r * yDir} ` +
			`L ${midX} ${corner2.y - r * yDir} ` +
			`Q ${midX} ${corner2.y} ${midX + r * xDir} ${corner2.y} ` +
			`L ${corner2.x} ${corner2.y}`;
	} else {
		if (Math.abs(dx) < 1) {
			return ` L ${corner2.x} ${corner2.y}`;
		}
		const midY = corner1.y + dy / 2;
		const xDir = dx > 0 ? 1 : -1;
		const yDir = dy > 0 ? 1 : -1;

		if (r < 1) {
			return ` L ${corner1.x} ${midY} L ${corner2.x} ${midY} L ${corner2.x} ${corner2.y}`;
		}

		return ` L ${corner1.x} ${midY - r * yDir} ` +
			`Q ${corner1.x} ${midY} ${corner1.x + r * xDir} ${midY} ` +
			`L ${corner2.x - r * xDir} ${midY} ` +
			`Q ${corner2.x} ${midY} ${corner2.x} ${midY + r * yDir} ` +
			`L ${corner2.x} ${corner2.y}`;
	}
}

/**
 * Calculates the label position at approximately the middle of the path.
 */
function calculateLabelPosition(points: Point[]): { labelX: number; labelY: number } {
	if (points.length === 0) return { labelX: 0, labelY: 0 };
	if (points.length === 1) return { labelX: points[0].x, labelY: points[0].y };

	// Calculate total path length
	let totalLength = 0;
	const segmentLengths: number[] = [];

	for (let i = 0; i < points.length - 1; i++) {
		const length = Math.sqrt(
			Math.pow(points[i + 1].x - points[i].x, 2) + Math.pow(points[i + 1].y - points[i].y, 2)
		);
		segmentLengths.push(length);
		totalLength += length;
	}

	// Find the point at half the total length
	const targetLength = totalLength / 2;
	let accumulatedLength = 0;

	for (let i = 0; i < segmentLengths.length; i++) {
		if (accumulatedLength + segmentLengths[i] >= targetLength) {
			// Interpolate within this segment
			const remainingLength = targetLength - accumulatedLength;
			const t = segmentLengths[i] > 0 ? remainingLength / segmentLengths[i] : 0;

			return {
				labelX: points[i].x + (points[i + 1].x - points[i].x) * t,
				labelY: points[i].y + (points[i + 1].y - points[i].y) * t,
			};
		}
		accumulatedLength += segmentLengths[i];
	}

	// Fallback to midpoint of last segment
	const lastIndex = points.length - 1;
	return {
		labelX: (points[lastIndex - 1].x + points[lastIndex].x) / 2,
		labelY: (points[lastIndex - 1].y + points[lastIndex].y) / 2,
	};
}
