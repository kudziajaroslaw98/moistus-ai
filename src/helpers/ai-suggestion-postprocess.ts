import {
	resolveAliasedNodeId,
	type AiIdAliasMap,
} from '@/helpers/ai-id-alias-map';
import type { AppNode } from '@/types/app-node';
import type {
	SuggestionContext,
	SuggestionNodePayload,
} from '@/types/ghost-node';
import { z } from 'zod';

export const FULL_MAP_SUGGESTION_TOO_LARGE_MESSAGE =
	'Literal full-map suggestions exceeded the model request limit for this map. Reduce the map size or switch back to a summarized strategy.';

const SAME_SOURCE_DUPLICATE_THRESHOLD = 0.72;
const CROSS_SOURCE_DUPLICATE_THRESHOLD = 0.82;
const aiNodeIdSchema = z.union([z.number().int().positive(), z.string().min(1)]);
const suggestionRouteNodeTypes = [
	'defaultNode',
	'textNode',
	'questionNode',
	'annotationNode',
	'codeNode',
	'taskNode',
] as const;
const suggestionQuestionTypes = ['binary', 'multiple'] as const;
const suggestionAnnotationTypes = [
	'note',
	'idea',
	'quote',
	'summary',
	'warning',
	'success',
	'info',
	'error',
] as const;
type NormalizedSuggestionNodePayload = Required<SuggestionNodePayload>;

function createEmptySuggestionNodePayload(): NormalizedSuggestionNodePayload {
	return {
		title: null,
		tasks: null,
		answer: null,
		questionType: null,
		annotationType: null,
		language: null,
		fileName: null,
	};
}

const suggestionNodePayloadSchema = z
	.object({
		title: z.string().trim().min(1).nullable(),
		tasks: z.array(z.string().trim().min(1)).nullable(),
		answer: z.string().trim().min(1).nullable(),
		questionType: z.enum(suggestionQuestionTypes).nullable(),
		annotationType: z.enum(suggestionAnnotationTypes).nullable(),
		language: z.string().trim().min(1).nullable(),
		fileName: z.string().trim().min(1).nullable(),
	})
	.nullable();

export const suggestionObjectSchema = z.object({
	id: z
		.string()
		.describe(
			'A unique identifier for the suggestion, typically in UUID format.'
		),
	content: z
		.string()
		.min(1)
		.refine(
			(value) => value.trim().length > 0,
			'Suggestion content cannot be blank.'
		)
		.describe('The main text content or label for the suggested node.'),
	nodeType: z
		.enum(suggestionRouteNodeTypes)
		.describe(
			'The type of node being suggested. Must be one of the specified values.'
		),
	nodePayload: suggestionNodePayloadSchema.describe(
		'Structured payload used to create typed suggestions safely. Use null when unused.'
	),
	confidence: z
		.number()
		.min(0)
		.max(1)
		.describe(
			"A score from 0.0 to 1.0 indicating the AI's confidence in this suggestion."
		),
	position: z
		.object({
			x: z
				.number()
				.describe(
					'The suggested horizontal (x-axis) coordinate for the new node on the canvas.'
				),
			y: z
				.number()
				.describe(
					'The suggested vertical (y-axis) coordinate for placing the node.'
				),
		})
		.describe(
			'The initial x and y coordinates for placing the suggested node on the canvas.'
		),
	context: z
		.object({
			sourceNodeId: aiNodeIdSchema
				.nullable()
				.describe("The aliased ID of the source node for the suggestion, if there is one."),
			targetNodeId: aiNodeIdSchema
				.nullable()
				.describe('The aliased ID of the target node for connection-oriented suggestions.'),
			relationshipType: z
				.string()
				.nullable()
				.describe('The relationship label between the source and new node.'),
			trigger: z
				.enum(['magic-wand', 'dangling-edge', 'auto'])
				.describe('The trigger that caused the suggestion request.'),
		})
		.describe('Suggestion context metadata.'),
	reasoning: z
		.string()
		.nullable()
		.describe('A brief, user-facing explanation for the suggestion.'),
});

export type SuggestionObject = z.infer<typeof suggestionObjectSchema>;

export type NormalizedSuggestionObject = Omit<SuggestionObject, 'context'> & {
	context: Omit<SuggestionObject['context'], 'sourceNodeId' | 'targetNodeId'> & {
		sourceNodeId: string | null;
		targetNodeId: string | null;
	};
};

export interface SuggestionComparisonEntry {
	content: string;
	sourceNodeId: string | null;
}

export interface ProcessedSuggestion {
	suggestion: NormalizedSuggestionObject;
	resolvedSourceNodeId: string | null;
	comparisonEntry: SuggestionComparisonEntry;
}

function normalizeOptionalString(value: string | null | undefined) {
	if (typeof value !== 'string') {
		return undefined;
	}

	const normalized = value.trim();
	return normalized ? normalized : undefined;
}

function normalizeTaskPayload(
	payload: SuggestionNodePayload | null | undefined
): NormalizedSuggestionNodePayload | null {
	if (!payload?.tasks || !Array.isArray(payload.tasks)) {
		return null;
	}

	const tasks = payload.tasks
		.map((task) => task.trim())
		.filter(Boolean);

	if (tasks.length === 0) {
		return null;
	}

	return {
		...createEmptySuggestionNodePayload(),
		title: normalizeOptionalString(payload.title) ?? null,
		tasks,
	};
}

function normalizeStructuredPayload(
	suggestion: SuggestionObject
): SuggestionObject {
	switch (suggestion.nodeType) {
		case 'taskNode': {
			const normalizedTaskPayload = normalizeTaskPayload(
				suggestion.nodePayload
			);

			if (!normalizedTaskPayload) {
				return {
					...suggestion,
					nodeType: 'defaultNode',
					nodePayload: null,
				};
			}

			return {
				...suggestion,
				nodePayload: normalizedTaskPayload,
			};
		}

		case 'questionNode':
			return {
				...suggestion,
				nodePayload: suggestion.nodePayload
					? {
							...createEmptySuggestionNodePayload(),
							answer:
								normalizeOptionalString(suggestion.nodePayload.answer) ?? null,
							questionType: suggestion.nodePayload.questionType ?? null,
					  }
					: null,
			};

		case 'annotationNode':
			return {
				...suggestion,
				nodePayload: suggestion.nodePayload
					? {
							...createEmptySuggestionNodePayload(),
							annotationType:
								suggestion.nodePayload.annotationType ?? null,
					  }
					: null,
			};

		case 'codeNode':
			return {
				...suggestion,
				nodePayload: suggestion.nodePayload
					? {
							...createEmptySuggestionNodePayload(),
							language:
								normalizeOptionalString(suggestion.nodePayload.language) ?? null,
							fileName:
								normalizeOptionalString(suggestion.nodePayload.fileName) ?? null,
					  }
					: null,
			};

		case 'defaultNode':
		case 'textNode':
		default:
			return {
				...suggestion,
				nodePayload: null,
			};
	}
}

function normalizeSuggestionText(value: string | null | undefined) {
	if (typeof value !== 'string') {
		return '';
	}

	return value
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s]+/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function getSuggestionTokenSet(value: string) {
	return new Set(value.split(' ').filter(Boolean));
}

export function getSuggestionSimilarityScore(left: string, right: string) {
	const leftTokens = getSuggestionTokenSet(normalizeSuggestionText(left));
	const rightTokens = getSuggestionTokenSet(normalizeSuggestionText(right));

	if (leftTokens.size === 0 || rightTokens.size === 0) {
		return 0;
	}

	let intersection = 0;
	for (const token of leftTokens) {
		if (rightTokens.has(token)) {
			intersection += 1;
		}
	}

	const union = new Set([...leftTokens, ...rightTokens]).size;
	return union === 0 ? 0 : intersection / union;
}

export function isDuplicateSuggestion(params: {
	candidate: SuggestionComparisonEntry;
	recentSuggestions: SuggestionComparisonEntry[];
	emittedSuggestions: SuggestionComparisonEntry[];
}) {
	const normalizedCandidate = normalizeSuggestionText(params.candidate.content);
	if (!normalizedCandidate) {
		return true;
	}

	for (const comparisonEntry of [
		...params.recentSuggestions,
		...params.emittedSuggestions,
	]) {
		const normalizedComparison = normalizeSuggestionText(
			comparisonEntry.content
		);

		if (!normalizedComparison) {
			continue;
		}

		if (normalizedCandidate === normalizedComparison) {
			return true;
		}

		const threshold =
			params.candidate.sourceNodeId &&
			comparisonEntry.sourceNodeId &&
			params.candidate.sourceNodeId === comparisonEntry.sourceNodeId
				? SAME_SOURCE_DUPLICATE_THRESHOLD
				: CROSS_SOURCE_DUPLICATE_THRESHOLD;

		if (
			getSuggestionSimilarityScore(normalizedCandidate, normalizedComparison) >=
			threshold
		) {
			return true;
		}
	}

	return false;
}

export function normalizeSuggestionElement(
	suggestion: SuggestionObject,
	validAnchorNodeIds: Set<string> | null,
	aliasMap?: AiIdAliasMap
): NormalizedSuggestionObject {
	const structuredSuggestion = normalizeStructuredPayload(suggestion);
	const resolvedSourceNodeId = resolveAliasedNodeId(
		structuredSuggestion.context.sourceNodeId,
		aliasMap
	);
	const resolvedTargetNodeId = resolveAliasedNodeId(
		structuredSuggestion.context.targetNodeId,
		aliasMap
	);
	const normalizedSuggestion: NormalizedSuggestionObject = {
		...structuredSuggestion,
		context: {
			...structuredSuggestion.context,
			sourceNodeId: resolvedSourceNodeId,
			targetNodeId: resolvedTargetNodeId,
		},
	};

	if (!validAnchorNodeIds || validAnchorNodeIds.size === 0) {
		return normalizedSuggestion;
	}

	const returnedAnchorId = normalizedSuggestion.context.sourceNodeId;
	if (returnedAnchorId === null || validAnchorNodeIds.has(returnedAnchorId)) {
		return normalizedSuggestion;
	}

	return {
		...normalizedSuggestion,
		context: {
			...normalizedSuggestion.context,
			sourceNodeId: null,
		},
	};
}

function getSuggestionSourceDetails(
	sourceNodeId: string | null | undefined,
	nodes: AppNode[]
) {
	if (!sourceNodeId) {
		return null;
	}

	const sourceNode = nodes.find((node) => node.id === sourceNodeId);
	if (!sourceNode) {
		return null;
	}

	const sourceNodeContent =
		sourceNode.data.content ||
		sourceNode.data.metadata?.title ||
		sourceNode.data.metadata?.label ||
		'';
	const sourceNodeName =
		sourceNodeContent.length > 50
			? `${sourceNodeContent.substring(0, 50)}...`
			: sourceNodeContent;

	return {
		sourceNodeName,
		sourceNodeContent,
	};
}

export function processSuggestionElement(params: {
	element: unknown;
	validAnchorNodeIds: Set<string> | null;
	requestContext: SuggestionContext;
	recentSuggestions: SuggestionComparisonEntry[];
	emittedSuggestions: SuggestionComparisonEntry[];
	minConfidence: number;
	maxSuggestions: number;
	emittedCount: number;
	aliasMap?: AiIdAliasMap;
}): ProcessedSuggestion | null {
	const parsedSuggestion = suggestionObjectSchema.safeParse(params.element);
	if (!parsedSuggestion.success) {
		return null;
	}

	const suggestion = normalizeSuggestionElement(
		parsedSuggestion.data,
		params.validAnchorNodeIds,
		params.aliasMap
	);
	const resolvedSourceNodeId =
		suggestion.context.sourceNodeId ??
		resolveAliasedNodeId(params.requestContext.sourceNodeId ?? null, params.aliasMap) ??
		null;
	const comparisonEntry = {
		content: suggestion.content,
		sourceNodeId: resolvedSourceNodeId,
	};

	if (suggestion.confidence < params.minConfidence) {
		return null;
	}

	if (
		isDuplicateSuggestion({
			candidate: comparisonEntry,
			recentSuggestions: params.recentSuggestions,
			emittedSuggestions: params.emittedSuggestions,
		})
	) {
		return null;
	}

	if (params.emittedCount >= params.maxSuggestions) {
		return null;
	}

	return {
		suggestion,
		resolvedSourceNodeId,
		comparisonEntry,
	};
}

export function toSuggestionChunk(params: {
	processedSuggestion: ProcessedSuggestion;
	index: number;
	nodes: AppNode[];
}) {
	const sourceDetails = getSuggestionSourceDetails(
		params.processedSuggestion.resolvedSourceNodeId,
		params.nodes
	);

	return {
		type: 'data-node-suggestion' as const,
		data: {
			...params.processedSuggestion.suggestion,
			index: params.index,
			sourceNodeName: sourceDetails?.sourceNodeName,
			sourceNodeContent: sourceDetails?.sourceNodeContent,
		},
	};
}

export function getSuggestionStreamErrorMessage(params: {
	error: unknown;
	isWholeMapSuggestion: boolean;
}) {
	if (!params.isWholeMapSuggestion) {
		return params.error instanceof Error
			? params.error.message
			: 'An unknown error occurred.';
	}

	const errorMessage =
		params.error instanceof Error ? params.error.message : String(params.error);
	const normalizedMessage = errorMessage.toLowerCase();
	const looksLikePromptOverflow =
		normalizedMessage.includes('context length') ||
		normalizedMessage.includes('maximum context') ||
		normalizedMessage.includes('too many tokens') ||
		normalizedMessage.includes('token limit') ||
		normalizedMessage.includes('prompt is too long') ||
		normalizedMessage.includes('input is too long') ||
		normalizedMessage.includes('request too large') ||
		normalizedMessage.includes('context_window_exceeded') ||
		normalizedMessage.includes('context window') ||
		normalizedMessage.includes('maximum tokens');

	return looksLikePromptOverflow
		? FULL_MAP_SUGGESTION_TOO_LARGE_MESSAGE
		: errorMessage;
}
