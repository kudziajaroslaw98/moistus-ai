import { aliasNodeId, type AiIdAliasMap } from '@/helpers/ai-id-alias-map';
import { compactPromptText, encodeHybridRow } from '@/helpers/ai-hybrid-rows';
import type { SuggestionGraphContextMode } from '@/helpers/ai-suggestion-graph';
import type {
	SuggestionContext,
	SuggestionHistoryEntry,
	SuggestionLens,
} from '@/types/ghost-node';

const WHOLE_MAP_LENS_GUIDANCE: Record<SuggestionLens, string> = {
	'next-step':
		'Favor immediate, concrete next actions that move the work forward.',
	risk: 'Surface fragile assumptions, blockers, failure modes, or missing safeguards.',
	constraint:
		'Highlight dependencies, limits, prerequisites, or bottlenecks that shape the plan.',
	counterpoint:
		'Add a materially different perspective, objection, or challenge to the current direction.',
	dependency:
		'Expose upstream requirements, prerequisites, sequencing, or missing supporting work.',
	measurement:
		'Suggest ways to measure success, validate assumptions, or observe outcomes.',
	'user-impact':
		'Focus on user-facing consequences, adoption, confusion, trust, or experience.',
	implementation:
		'Prefer executable tasks, technical approaches, resources, or code-oriented follow-through.',
	'adjacent-opportunity':
		'Explore nearby opportunities, sibling ideas, and adjacent branches rather than restating the same concept.',
	example:
		'Ground the idea with concrete examples, scenarios, references, or demonstrations.',
};

const FOCUSED_NODE_LENS_GUIDANCE: Partial<Record<SuggestionLens, string>> = {
	dependency:
		'When anchored to a node, use ancestry and topology rows to surface prerequisites or upstream dependencies.',
	constraint:
		'When anchored to a node, use ancestry and topology rows to identify blockers, limits, and constraints.',
	'adjacent-opportunity':
		'When anchored to a node, use sibling rows to branch into nearby but distinct directions.',
	example:
		'When anchored to a node, use sibling and nearby rows to find concrete examples or analogous cases.',
	implementation:
		'When anchored to a node, prioritize task, resource, code, or execution-oriented follow-through.',
	'next-step':
		'When anchored to a node, prefer immediate actions and practical sequencing near the focus node.',
	risk: 'When anchored to a node, look for missing assumptions, unresolved gaps, and weak spots around that node.',
	counterpoint:
		'When anchored to a node, challenge the local branch with a substantively different angle rather than a paraphrase.',
};

function buildLensRows(
	selectedLenses: SuggestionLens[],
	mode: SuggestionGraphContextMode
) {
	return selectedLenses.map((lens) =>
		encodeHybridRow('LENS', [
			lens,
			mode === 'full-map'
				? WHOLE_MAP_LENS_GUIDANCE[lens]
				: (FOCUSED_NODE_LENS_GUIDANCE[lens] ?? WHOLE_MAP_LENS_GUIDANCE[lens]),
		])
	);
}

function buildRecentRows(
	recentSuggestions: SuggestionHistoryEntry[],
	options?: { aliasMap?: AiIdAliasMap }
) {
	return recentSuggestions.map((entry) =>
		encodeHybridRow('RECENT', [
			compactPromptText(entry.content) ?? entry.content,
			aliasNodeId(entry.sourceNodeId, options?.aliasMap),
			entry.trigger,
		])
	);
}

export function buildSuggestionUserPrompt(params: {
	graphRows: string[];
	mode: SuggestionGraphContextMode;
	context: SuggestionContext;
	selectedLenses: SuggestionLens[];
	recentSuggestions: SuggestionHistoryEntry[];
	clickIndex: number;
	requestNonce: string;
	aliasMap?: AiIdAliasMap;
}) {
	const requestedSourceNodeId = aliasNodeId(
		params.context.sourceNodeId,
		params.aliasMap
	);
	const requestedTargetNodeId = aliasNodeId(
		params.context.targetNodeId,
		params.aliasMap
	);

	return [
		'Current mind map context rows:',
		...params.graphRows,
		...buildLensRows(params.selectedLenses, params.mode),
		...buildRecentRows(params.recentSuggestions, {
			aliasMap: params.aliasMap,
		}),
		encodeHybridRow('REQUEST', [params.clickIndex, params.requestNonce]),
		`Trigger type: ${params.context.trigger}`,
		requestedSourceNodeId !== null
			? `Requested source node: ${requestedSourceNodeId}`
			: null,
		requestedTargetNodeId !== null
			? `Requested target node: ${requestedTargetNodeId}`
			: null,
		params.context.relationshipType
			? `Requested relationship: ${params.context.relationshipType}`
			: null,
		params.mode === 'full-map'
			? 'For whole-map suggestions, use only listed ANCHOR ids when attaching to an existing branch. Otherwise set context.sourceNodeId to null.'
			: 'For focused-node suggestions, use the active LENS rows to add new angles around the local branch instead of paraphrasing it.',
	]
		.filter((line): line is string => Boolean(line))
		.join('\n');
}
