export type PathType = 'smoothstep' | 'step' | 'straight' | 'bezier' | 'waypoint';

export type WaypointCurveType = 'linear' | 'bezier' | 'catmull-rom';

export interface Waypoint {
	id: string;
	x: number;
	y: number;
}
