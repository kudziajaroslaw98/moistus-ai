import { AppEdge } from '@/types/app-edge';
import { EdgeData } from '@/types/edge-data';
import type { EdgeDbData } from '@/types/edge-db-data';
import { MindMapData } from '@/types/mind-map-data';
import { NodeData } from '@/types/node-data';
import type { NodeDbData } from '@/types/node-db-data';
import { Node } from '@xyflow/react';

type NodesTableType = NodeDbData;
type EdgesTableType = EdgeDbData;

// Raw database response type (snake_case columns from Supabase view)
interface MindMapDbData {
	map_id: string;
	user_id: string;
	title: string;
	description: string | null;
	tags: string[] | null;
	thumbnail_url: string | null;
	team_id: string | null;
	is_template: boolean | null;
	template_category: string | null;
	created_at: string;
	map_updated_at: string;
}

// Determine edge type based on metadata (matches logic in edges-slice.ts)
const getEdgeType = (edge: EdgesTableType): string => {
	if (edge.aiData?.isSuggested) {
		return 'suggestedConnection';
	}

	if (edge.metadata?.pathType === 'waypoint') {
		return 'waypointEdge';
	}

	return 'floatingEdge';
};

// Define the expected input structure based on the Supabase query
export interface SupabaseMapData extends MindMapDbData {
	nodes: NodesTableType[];
	edges: EdgesTableType[];
}

export const transformSupabaseData = (
	supabaseData: SupabaseMapData
): {
	mindMap: MindMapData;
	reactFlowNodes: Node<NodeData>[];
	reactFlowEdges: AppEdge[];
} => {
	const {
		nodes: supabaseNodes,
		edges: supabaseEdges,
		...mindMap
	} = supabaseData;

	const reactFlowNodes: Node<NodeData>[] = (supabaseNodes || []).map(
		(node) => ({
			id: node.id,
			position: { x: node.position_x || 0, y: node.position_y || 0 },
			// Ensure data conforms to NodeData, casting might be needed if types differ
			data: {
				...node,
				position_x: node.position_x,
				position_y: node.position_y,
				node_type: node.node_type,
				width: node.width,
				height: node.height,
				metadata: {
					...node.metadata,
					showBackground: Boolean(node.metadata?.showBackground),
				},
			},
			type: node.node_type || 'defaultNode',
			width: node.width || undefined,
			height: node.height || undefined,
			parentNode: node.parent_id ? node.parent_id : undefined, // Add parentNode for grouping
		})
	);

	const reactFlowEdges: AppEdge[] = (supabaseEdges || []).map((edge) => ({
		id: edge.id,
		source: edge.source,
		target: edge.target,
		// Ensure data conforms to EdgeData, casting might be needed
		data: {
			...edge, // Spread all properties from db edge
			metadata: {
				...(edge.metadata || {}), // Spread existing metadata from db
				pathType: edge.metadata?.pathType ?? 'bezier', // Explicitly map pathType
			},
			style: {
				stroke: edge.style?.stroke || '#6c757d',
				strokeWidth: edge.style?.strokeWidth || 2,
			},
			aiData: edge.aiData,
			animated: JSON.parse(String(edge.animated)),
		} as unknown as EdgeData,
		type: getEdgeType(edge), // Determine edge type from metadata
		label: edge.label || undefined,
		// Handle potential JSON string or object for style
		animated: JSON.parse(String(edge.animated)),
		markerEnd: edge.markerEnd,
		markerStart: edge.markerStart,
		// Include user_id and map_id if needed by AppEdge type
		user_id: edge.user_id,
		map_id: edge.map_id,
	}));

	// Transform snake_case DB columns to camelCase TypeScript interface
	const transformedMindMap: MindMapData = {
		id: mindMap.map_id,
		user_id: mindMap.user_id,
		title: mindMap.title,
		description: mindMap.description,
		tags: mindMap.tags ?? undefined,
		thumbnailUrl: mindMap.thumbnail_url,
		team_id: mindMap.team_id,
		is_template: mindMap.is_template ?? undefined,
		template_category: mindMap.template_category,
		created_at: mindMap.created_at,
		updated_at: mindMap.map_updated_at,
	};

	return {
		mindMap: transformedMindMap,
		reactFlowNodes,
		reactFlowEdges,
	};
};
