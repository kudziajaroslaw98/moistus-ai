export type PathType = 'smoothstep' | 'step' | 'straight' | 'bezier' | 'waypoint';

export type WaypointCurveType = 'linear' | 'bezier' | 'catmull-rom' | 'smoothstep';

export interface Waypoint {
	id: string;
	x: number;
	y: number;
}

/**
 * Represents a connection anchor point on a node's border.
 * Allows free positioning anywhere along the node perimeter.
 */
export interface EdgeAnchor {
	/** Which side of the node the anchor is on */
	side: 'top' | 'bottom' | 'left' | 'right';
	/** Position along that side (0.0 to 1.0, left-to-right or top-to-bottom) */
	offset: number;
}
