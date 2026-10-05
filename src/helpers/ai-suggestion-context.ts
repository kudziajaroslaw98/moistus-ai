import { foldAnchoredAnnotationNodes } from '@/helpers/ai-anchored-annotations';
import {
	createAiIdAliasMap,
	resolveAliasedNodeId,
	type AiIdAliasMap,
} from '@/helpers/ai-id-alias-map';
import {
	buildFocusedNodeSuggestionGraph,
	buildFullMapSuggestionGraph,
	type SuggestionGraphContextModel,
	type SuggestionGraphContextMode,
	type SuggestionGraphNode,
	type SuggestionGraphRelation,
	type SuggestionGraphAnchor,
	type SuggestionPromptInput,
} from '@/helpers/ai-suggestion-graph';
import { serializeSuggestionGraphContext } from '@/helpers/ai-suggestion-rows';
import { buildSuggestionUserPrompt } from '@/helpers/ai-suggestion-user-prompt';

export type {
	SuggestionGraphAnchor,
	SuggestionGraphContextMode,
	SuggestionGraphContextModel,
	SuggestionGraphNode,
	SuggestionGraphRelation,
	SuggestionPromptInput,
};

export interface SuggestionPromptContext {
	graph: SuggestionGraphContextModel;
	graphRows: string[];
	prompt: string;
	validAnchorNodeIds: string[];
	isWholeMapSuggestion: boolean;
	aliasMap: AiIdAliasMap;
}

const EXCLUDED_PROMPT_ALIAS_NODE_TYPES = new Set([
	'ghostNode',
	'commentNode',
	'groupNode',
	'ghost',
	'comment',
	'group',
]);

function isPromptAliasCandidate(node: SuggestionPromptInput['nodes'][number]) {
	const nodeType = node.data.node_type || node.type || 'defaultNode';
	const userCreatable = (node as { userCreatable?: boolean }).userCreatable;
	return (
		!EXCLUDED_PROMPT_ALIAS_NODE_TYPES.has(nodeType) &&
		userCreatable !== false
	);
}

function resolveValidSourceNodeId(
	sourceNodeId: string | null | undefined,
	nodeIds: Set<string>,
	aliasMap: AiIdAliasMap
): string | null {
	if (typeof sourceNodeId !== 'string') {
		return null;
	}

	const trimmedSourceId = sourceNodeId.trim();
	if (!trimmedSourceId) {
		return null;
	}

	if (nodeIds.has(trimmedSourceId)) {
		return trimmedSourceId;
	}

	const resolvedAliasSourceId = resolveAliasedNodeId(trimmedSourceId, aliasMap);
	return resolvedAliasSourceId && nodeIds.has(resolvedAliasSourceId)
		? resolvedAliasSourceId
		: null;
}

export function buildSuggestionPromptContext(
	rawInput: SuggestionPromptInput
): SuggestionPromptContext {
	// Anchored annotations become notes on their host; a suggestion requested
	// from an anchored annotation is treated as a request on its host.
	const { nodes: foldedNodes, hostByAnnotationId } = foldAnchoredAnnotationNodes(
		rawInput.nodes
	);
	const rawSourceNodeId = rawInput.context.sourceNodeId;
	const input: SuggestionPromptInput = {
		...rawInput,
		nodes: foldedNodes,
		context: {
			...rawInput.context,
			sourceNodeId: rawSourceNodeId
				? (hostByAnnotationId.get(rawSourceNodeId) ?? rawSourceNodeId)
				: rawSourceNodeId,
		},
	};
	const aliasableNodes = input.nodes.filter(isPromptAliasCandidate);
	const aliasMap = createAiIdAliasMap(aliasableNodes);
	const nodeIds = new Set(aliasableNodes.map((node) => node.id));
	const validSourceId = resolveValidSourceNodeId(
		input.context.sourceNodeId,
		nodeIds,
		aliasMap
	);
	const context = {
		...input.context,
		sourceNodeId: validSourceId,
	};
	const graphInput = {
		...input,
		context,
	};
	const graph = validSourceId
		? buildFocusedNodeSuggestionGraph(graphInput)
		: buildFullMapSuggestionGraph(graphInput);
	const graphRows = serializeSuggestionGraphContext(graph, { aliasMap });

	return {
		graph,
		graphRows,
		prompt: buildSuggestionUserPrompt({
			graphRows,
			mode: graph.mode,
			context,
			selectedLenses: input.selectedLenses,
			recentSuggestions: input.recentSuggestions,
			clickIndex: input.clickIndex,
			requestNonce: input.requestNonce,
			aliasMap,
		}),
		validAnchorNodeIds: graph.validAnchorNodeIds,
		isWholeMapSuggestion: graph.mode === 'full-map',
		aliasMap,
	};
}
