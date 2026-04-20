import {
	createAiIdAliasMap,
	type AiIdAliasMap,
} from '@/helpers/ai-id-alias-map';
import { extractNodesContext } from '@/helpers/extract-node-context';
import type { NodeData } from '@/types/node-data';

export interface MergePromptContext {
	aliasMap: AiIdAliasMap;
	nodeRows: string[];
	validNodeIds: Set<string>;
	nodes: NodeData[];
}

export function buildMergePromptContext(nodes: NodeData[]): MergePromptContext {
	const aliasMap = createAiIdAliasMap(nodes);

	return {
		aliasMap,
		nodeRows: extractNodesContext(nodes, { aliasMap }),
		validNodeIds: new Set(nodes.map((node) => node.id)),
		nodes,
	};
}
