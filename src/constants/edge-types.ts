import FloatingEdge from '@/components/edges/floating-edge';
import WaypointEdge from '@/components/edges/waypoint-edge';

export const edgeTypes = {
	suggestedConnection:
		/* SuggestedConnectionEdge TODO: Implement */ FloatingEdge,
	editableEdge: FloatingEdge,
	defaultEdge: FloatingEdge,
	floatingEdge: FloatingEdge,
	waypointEdge: WaypointEdge,
};
