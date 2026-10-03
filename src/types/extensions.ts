import type { AvailableNodeTypes } from '@/registry/node-registry';
import type { EdgeData } from './edge-data';
import type { NodeData } from './node-data';

/** Who initiated a graph change. Recorded on history events for attribution and revert. */
export type GraphActor =
	| { kind: 'user'; id: string }
	| { kind: 'plugin'; id: string }
	| { kind: 'recipe'; id: string };

/**
 * Data owned by an extension node (`extensionNode`), stored at `metadata.extension`.
 * `snapshot` is the last declarative render, shown when the plugin is unavailable.
 */
export interface NodeExtensionData {
	pluginId: string;
	kind: string;
	version: string;
	data: Record<string, unknown>;
	snapshot?: unknown;
}

export type GraphOp =
	| {
			type: 'createNode';
			nodeType?: AvailableNodeTypes;
			content?: string;
			data?: Partial<NodeData>;
			position?: { x: number; y: number };
			parentNodeId?: string | null;
			nodeId?: string;
	  }
	| { type: 'updateNode'; nodeId: string; data: Partial<NodeData> }
	| { type: 'deleteNodes'; nodeIds: string[] }
	| {
			type: 'createEdge';
			source: string;
			target: string;
			data?: Partial<EdgeData>;
	  }
	| { type: 'updateEdge'; edgeId: string; data: Partial<EdgeData> }
	| { type: 'deleteEdges'; edgeIds: string[] };

export type GraphOpsResult =
	| { ok: true; applied: number }
	| { ok: false; applied: number; error: string };
