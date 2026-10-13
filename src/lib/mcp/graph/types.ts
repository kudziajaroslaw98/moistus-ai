import type { EdgeData } from '@/types/edge-data';
import type { NodeData } from '@/types/node-data';
import type { LayoutDirection } from '@/types/layout-types';

export type McpMapRole = 'owner' | 'editor' | 'commentator' | 'viewer';

export interface McpMapInfo {
	id: string;
	ownerId: string;
	title: string;
	description: string | null;
	tags: string[];
	isTemplate: boolean;
	layoutDirection: LayoutDirection | null;
	updatedAt: string;
}

export interface McpMapGraph {
	map: McpMapInfo;
	nodes: NodeData[];
	edges: EdgeData[];
}

/** Node types agents never see: transient AI ghosts and canvas comment threads. */
export const HIDDEN_NODE_TYPES = new Set(['ghostNode', 'commentNode']);

export function isVisibleNode(node: NodeData): boolean {
	return !HIDDEN_NODE_TYPES.has(node.node_type ?? 'defaultNode');
}

/** Edges that describe the map, as opposed to pending AI suggestions or ghosts. */
export function isStructuralEdge(edge: EdgeData): boolean {
	return !edge.aiData?.isSuggested && !edge.metadata?.isGhostEdge;
}
