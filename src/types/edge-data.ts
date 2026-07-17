import type {
	EdgeAnchor,
	PathType,
	Waypoint,
	WaypointCurveType,
} from './path-types';

export interface ElkLabelLayout {
	x: number;
	y: number;
	width: number;
	height: number;
	centerX: number;
	centerY: number;
}

export interface EdgeData extends Record<string, unknown> {
	id: string;
	map_id: string;
	user_id: string;
	source: string;
	target: string;
	type?: string; // This will now be more static, e.g., 'floatingEdge'
	label?: string | null;
	created_at?: string;
	updated_at?: string;
	animated?: boolean;
	markerEnd?: string;
	markerStart?: string;
	style?: {
		stroke?: string;
		strokeWidth?: string | number;
		strokeDasharray?: string | number; // Added for ghost edges - allows both string and number to match CSSProperties
	} | null;
	metadata?: {
		pathType?: PathType; // Added pathType
		isGhostEdge?: boolean; // Mark edges as ghost edges for cleanup
		waypoints?: Waypoint[]; // Derived bend points for auto-routed waypoint edges
		curveType?: WaypointCurveType; // Curve interpolation type for waypoint edges
		sourceAnchor?: EdgeAnchor; // Routed anchor position on source node border
		targetAnchor?: EdgeAnchor; // Routed anchor position on target node border
		routingStyle?:
			| 'orthogonal'
			| 'elk'
			| 'custom-layout';
		elkLabel?: ElkLabelLayout; // ELK-computed label bounds for full-layout edge labels
	} | null;
	aiData?: {
		isSuggested?: boolean | null;
		reason?: string | null;
		connectionProxy?: {
			originalSourceNodeId: string;
			originalTargetNodeId: string;
			displaySourceNodeId: string;
			displayTargetNodeId: string;
			sourceHiddenChildLabel?: string;
			targetHiddenChildLabel?: string;
		} | null;
		suggestion?: {
			node1Id?: string;
			node2Id?: string;
			reason?: string;
			extendedReason?: string;
			similarityScore?: number;
			confidence?: number;
			contextualRelevance?: number;
		};
	} | null;
}
