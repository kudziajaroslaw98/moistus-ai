import { foldAnchoredAnnotationNodes } from '@/helpers/ai-anchored-annotations';
import { createAiIdAliasMap, type AiIdAliasMap } from '@/helpers/ai-id-alias-map';
import { isPromptAliasCandidate } from '@/helpers/ai-suggestion-context';
import {
	buildBranchSuggestionGraph,
	buildFocusedNodeSuggestionGraph,
	buildFullMapSuggestionGraph,
	type SuggestionGraphContextModel,
	type SuggestionGraphInput,
} from '@/helpers/ai-suggestion-graph';
import { serializeSuggestionGraphContext } from '@/helpers/ai-suggestion-rows';
import { BRANCH_OUTLINE_LIMIT } from '@/helpers/collapse/branch-index';
import type { RecipeRunRequest } from '@/helpers/ai-recipe-request';

export interface RecipePromptContext {
	graph: SuggestionGraphContextModel;
	graphRows: string[];
	aliasMap: AiIdAliasMap;
	/** Real node ids results may attach to. */
	validAnchorNodeIds: Set<string>;
	/** The node the recipe runs on (anchored annotations resolve to their host). */
	focusNodeId: string | null;
}

/**
 * Builds the model-visible rows for a recipe run. Scope decides how much of the map
 * the model sees: `node` = focus with parent, siblings and children; `branch` = focus
 * and its subtree; `map` = every eligible node.
 */
export function buildRecipePromptContext(
	request: Pick<RecipeRunRequest, 'nodes' | 'edges' | 'mapMeta' | 'recipe' | 'sourceNodeId'>
): RecipePromptContext {
	const { nodes, hostByAnnotationId } = foldAnchoredAnnotationNodes(request.nodes);
	const aliasableNodes = nodes.filter(isPromptAliasCandidate);
	const aliasMap = createAiIdAliasMap(aliasableNodes);
	const aliasableIds = new Set(aliasableNodes.map((node) => node.id));

	const requestedFocusId = request.sourceNodeId
		? (hostByAnnotationId.get(request.sourceNodeId) ?? request.sourceNodeId)
		: null;
	const focusNodeId =
		requestedFocusId && aliasableIds.has(requestedFocusId) ? requestedFocusId : null;

	const scope = request.recipe.definition.scope;
	if (scope !== 'map' && !focusNodeId) {
		throw new Error('The selected node is no longer on the map.');
	}

	const graphInput: SuggestionGraphInput = {
		nodes: aliasableNodes,
		edges: request.edges,
		mapMeta: request.mapMeta,
		context: { sourceNodeId: focusNodeId, trigger: 'magic-wand' },
	};

	let graph: SuggestionGraphContextModel;
	if (scope === 'node') {
		graph = buildFocusedNodeSuggestionGraph(graphInput, { includeChildren: true });
	} else if (scope === 'branch') {
		graph = buildBranchSuggestionGraph(graphInput, { limit: BRANCH_OUTLINE_LIMIT });
	} else {
		// NODE rows already carry every id; ANCHOR rows would repeat the whole map.
		graph = { ...buildFullMapSuggestionGraph(graphInput), anchors: [] };
	}

	return {
		graph,
		graphRows: serializeSuggestionGraphContext(graph, { aliasMap }),
		aliasMap,
		validAnchorNodeIds: new Set(graph.validAnchorNodeIds),
		focusNodeId,
	};
}
