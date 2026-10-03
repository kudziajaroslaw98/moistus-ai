import {
	createAiIdAliasMap,
	type AiIdAliasMap,
} from '@/helpers/ai-id-alias-map';
import { foldAnchoredAnnotationNodes } from '@/helpers/ai-anchored-annotations';
import { extractNodesContext } from '@/helpers/extract-node-context';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type { SuggestionContext } from '@/types/ghost-node';

export interface CounterpointPromptContext {
	aliasMap: AiIdAliasMap;
	contextRows: string[];
}

export function selectCounterpointRelevantNodes(
	nodes: AppNode[],
	edges: AppEdge[],
	context: SuggestionContext
): AppNode[] {
	if (context.sourceNodeId) {
		const sourceNode = nodes.find((node) => node.id === context.sourceNodeId);
		if (sourceNode) {
			return [
				sourceNode,
				...getConnectedNodes(nodes, edges, context.sourceNodeId),
			].slice(0, 6);
		}
	}

	return nodes.slice(-6);
}

function getConnectedNodes(
	nodes: AppNode[],
	edges: AppEdge[],
	nodeId: string
): AppNode[] {
	if (!nodeId) {
		return [];
	}

	const connectedEdges = edges.filter(
		(edge) => edge.source === nodeId || edge.target === nodeId
	);
	const connectedNodeIds = new Set(
		connectedEdges.map((edge) =>
			edge.source === nodeId ? edge.target : edge.source
		)
	);

	return nodes.filter((node) => connectedNodeIds.has(node.id));
}

export function buildCounterpointPromptContext(input: {
	nodes: AppNode[];
	edges: AppEdge[];
	context: SuggestionContext;
}): CounterpointPromptContext {
	// Fold anchored annotations into their host first so a host's notes travel
	// with it; an annotation source resolves to its host.
	const { nodes, hostByAnnotationId } = foldAnchoredAnnotationNodes(input.nodes);
	const sourceNodeId = input.context.sourceNodeId
		? (hostByAnnotationId.get(input.context.sourceNodeId) ??
			input.context.sourceNodeId)
		: input.context.sourceNodeId;
	const relevantNodes = selectCounterpointRelevantNodes(nodes, input.edges, {
		...input.context,
		sourceNodeId,
	});
	const aliasMap = createAiIdAliasMap(relevantNodes);

	return {
		aliasMap,
		contextRows: extractNodesContext(
			relevantNodes.map((node) => node.data),
			{ aliasMap }
		),
	};
}
