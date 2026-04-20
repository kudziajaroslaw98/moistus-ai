import {
	createAiIdAliasMap,
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

export function buildSuggestionPromptContext(
	input: SuggestionPromptInput
): SuggestionPromptContext {
	const aliasMap = createAiIdAliasMap(input.nodes);
	const graph = input.context.sourceNodeId
		? buildFocusedNodeSuggestionGraph(input)
		: buildFullMapSuggestionGraph(input);
	const graphRows = serializeSuggestionGraphContext(graph, { aliasMap });

	return {
		graph,
		graphRows,
		prompt: buildSuggestionUserPrompt({
			graphRows,
			mode: graph.mode,
			context: input.context,
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
