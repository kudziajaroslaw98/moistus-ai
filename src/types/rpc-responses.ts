import type { EdgeData } from './edge-data';
import type { NodeData } from './node-data';

/**
 * Response from the create_node_with_parent_edge RPC function.
 * Creates a node and optionally its parent-child edge atomically.
 */
export interface CreateNodeWithEdgeResponse {
	node: NodeData;
	edge: EdgeData | null;
}
