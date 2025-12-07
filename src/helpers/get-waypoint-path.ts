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
