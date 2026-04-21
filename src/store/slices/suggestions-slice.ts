import generateUuid from '@/helpers/generate-uuid';
import type { AvailableNodeTypes } from '@/registry/node-registry';
import type { AiConnectionSuggestion } from '@/types/ai-connection-suggestion';
import type { AiMergeSuggestion } from '@/types/ai-merge-suggestion';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type {
	NodeSuggestion,
	SuggestionContext,
	SuggestionHistoryEntry,
	SuggestionLens,
	SuggestionNodePayload,
	SuggestionNoveltyState,
	SuggestionTrigger,
} from '@/types/ghost-node';
import { SUGGESTION_EXPLORATION_LENSES } from '@/types/ghost-node';
import type { NodeData } from '@/types/node-data';
import {
	DEFAULT_SUGGESTION_CONFIG,
	type PartialSuggestionConfig,
	type SuggestionConfig,
} from '@/types/suggestion-config';
import type { StateCreator } from 'zustand';
import type { AppState } from '../app-state';

interface StreamTrigger {
	id: string | null; // Unique ID for this request
	body: Record<string, unknown>;
	api: string; // The API endpoint to hit
	onStreamChunk: (chunk: unknown) => void;
}

const VIEWPORT_SUGGESTION_BUCKET = '__viewport__';
const ANCHORED_SUGGESTION_X_OFFSET = 325;
const ANCHORED_SUGGESTION_Y_OFFSET = 50;
const UNANCHORED_SUGGESTION_X_OFFSET = 340;
const UNANCHORED_SUGGESTION_Y_OFFSET = 220;
const SUGGESTION_NOVELTY_STORAGE_KEY_PREFIX = 'mind-map-suggestion-novelty';
const MAX_STORED_RECENT_SUGGESTIONS = 12;
const MAX_SENT_RECENT_SUGGESTIONS = 8;
const SUGGESTION_LENSES_PER_REQUEST = 2;
const AI_CONNECTION_EDGE_TYPE = 'suggestedConnection';
const AI_MERGE_EDGE_TYPE = 'suggestedMerge';
const AI_SUGGESTION_EDGE_Z_INDEX = 50_000;
const AI_GHOST_NODE_Z_INDEX = 60_000;

interface ConnectionSuggestionPlacement {
	originalSourceNodeId: string;
	originalTargetNodeId: string;
	displaySourceNodeId: string;
	displayTargetNodeId: string;
	sourceHiddenChildLabel?: string;
	targetHiddenChildLabel?: string;
}

function getNodeDisplayLabel(node: AppNode | undefined, fallbackId: string) {
	const content =
		typeof node?.data.content === 'string' ? node.data.content.trim() : '';
	if (content.length > 0) {
		return content;
	}

	const title =
		typeof node?.data.metadata?.title === 'string'
			? node.data.metadata.title.trim()
			: '';
	return title.length > 0 ? title : fallbackId;
}

function findNearestVisibleCollapsedAncestor(params: {
	nodeId: string;
	reverseAdjacency: Map<string, string[]>;
	visibleNodeIds: Set<string>;
	collapsedNodeIds: Set<string>;
}) {
	const { nodeId, reverseAdjacency, visibleNodeIds, collapsedNodeIds } = params;
	const visited = new Set<string>([nodeId]);
	let frontier: string[] = [nodeId];

	while (frontier.length > 0) {
		const nextFrontier: string[] = [];
		const collapsedCandidates: string[] = [];

		for (const currentId of frontier) {
			const parents = reverseAdjacency.get(currentId) ?? [];
			for (const parentId of parents) {
				if (visited.has(parentId)) {
					continue;
				}
				visited.add(parentId);
				nextFrontier.push(parentId);

				if (visibleNodeIds.has(parentId) && collapsedNodeIds.has(parentId)) {
					collapsedCandidates.push(parentId);
				}
			}
		}

		if (collapsedCandidates.length > 0) {
			return collapsedCandidates[0];
		}

		frontier = nextFrontier;
	}

	return null;
}

function resolveConnectionSuggestionPlacement(params: {
	suggestion: AiConnectionSuggestion;
	nodes: AppNode[];
	edges: AppEdge[];
	visibleNodes: AppNode[];
}): ConnectionSuggestionPlacement | null {
	const { suggestion, nodes, edges, visibleNodes } = params;
	const nodeById = new Map(nodes.map((node) => [node.id, node]));
	const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
	const collapsedNodeIds = new Set(
		nodes
			.filter((node) => node.data.metadata?.isCollapsed)
			.map((node) => node.id)
	);
	const reverseAdjacency = new Map<string, string[]>();
	for (const edge of edges) {
		if (edge.data?.aiData?.isSuggested === true) {
			continue;
		}
		const parents = reverseAdjacency.get(edge.target);
		if (parents) {
			parents.push(edge.source);
		} else {
			reverseAdjacency.set(edge.target, [edge.source]);
		}
	}

	const resolveDisplayNode = (nodeId: string) => {
		if (visibleNodeIds.has(nodeId)) {
			return {
				displayNodeId: nodeId,
				hiddenChildLabel: undefined as string | undefined,
			};
		}

		const collapsedAncestorId = findNearestVisibleCollapsedAncestor({
			nodeId,
			reverseAdjacency,
			visibleNodeIds,
			collapsedNodeIds,
		});
		if (!collapsedAncestorId) {
			return null;
		}

		return {
			displayNodeId: collapsedAncestorId,
			hiddenChildLabel: getNodeDisplayLabel(nodeById.get(nodeId), nodeId),
		};
	};

	const sourcePlacement = resolveDisplayNode(suggestion.sourceNodeId);
	const targetPlacement = resolveDisplayNode(suggestion.targetNodeId);
	if (!sourcePlacement || !targetPlacement) {
		return null;
	}

	return {
		originalSourceNodeId: suggestion.sourceNodeId,
		originalTargetNodeId: suggestion.targetNodeId,
		displaySourceNodeId: sourcePlacement.displayNodeId,
		displayTargetNodeId: targetPlacement.displayNodeId,
		sourceHiddenChildLabel: sourcePlacement.hiddenChildLabel,
		targetHiddenChildLabel: targetPlacement.hiddenChildLabel,
	};
}

function getOriginalConnectionPair(edge: AppEdge) {
	const proxy = edge.data?.aiData?.connectionProxy;
	return {
		sourceNodeId: proxy?.originalSourceNodeId ?? edge.source,
		targetNodeId: proxy?.originalTargetNodeId ?? edge.target,
	};
}

function isActiveSuggestedEdge(
	edge: AppEdge,
	edgeType: typeof AI_CONNECTION_EDGE_TYPE | typeof AI_MERGE_EDGE_TYPE
) {
	return (
		(edge.type === edgeType || edge.data?.type === edgeType) &&
		edge.data?.aiData?.isSuggested === true
	);
}

function removeSuggestedEdges(
	edges: AppEdge[],
	edgeType: typeof AI_CONNECTION_EDGE_TYPE | typeof AI_MERGE_EDGE_TYPE
) {
	return edges.filter((edge) => !isActiveSuggestedEdge(edge, edgeType));
}

function normalizeOptionalString(value: string | null | undefined) {
	if (typeof value !== 'string') {
		return undefined;
	}

	const normalized = value.trim();
	return normalized ? normalized : undefined;
}

function buildApprovedNodeInput(params: {
	suggestedContent: string;
	suggestedType: AvailableNodeTypes;
	nodePayload?: SuggestionNodePayload | null;
}): {
	content: string;
	nodeType: AvailableNodeTypes;
	data: Partial<NodeData>;
} {
		switch (params.suggestedType) {
			case 'taskNode':
				if (params.nodePayload?.taskTexts?.length) {
					return {
						content: '',
						nodeType: 'taskNode',
						data: {
							metadata: {
								title: normalizeOptionalString(params.nodePayload.title),
								status: 'pending',
								tasks: params.nodePayload.taskTexts.map((task) => ({
									id: generateUuid(),
									text: task,
									isComplete: false,
								})),
						},
					},
				};
			}
			break;

		case 'questionNode':
			return {
				content: params.suggestedContent,
				nodeType: 'questionNode',
				data: {
					metadata: {
						answer: normalizeOptionalString(params.nodePayload?.answer),
						questionType: params.nodePayload?.questionType ?? undefined,
					},
				},
			};

		case 'annotationNode':
			return {
				content: params.suggestedContent,
				nodeType: 'annotationNode',
				data: {
					metadata: {
						annotationType: params.nodePayload?.annotationType ?? 'note',
					},
				},
			};

		case 'codeNode':
			return {
				content: params.suggestedContent,
				nodeType: 'codeNode',
				data: {
					metadata: {
						language:
							normalizeOptionalString(params.nodePayload?.language) ??
							'plaintext',
						fileName: normalizeOptionalString(params.nodePayload?.fileName),
					},
				},
			};

		case 'textNode':
			return {
				content: params.suggestedContent,
				nodeType: 'textNode',
				data: {},
			};

		case 'defaultNode':
		default:
			return {
				content: params.suggestedContent,
				nodeType: params.suggestedType,
				data: {},
			};
	}

	return {
		content: params.suggestedContent,
		nodeType: params.suggestedType,
		data: {},
	};
}

function hasWindow() {
	return (
		typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
	);
}

function getSuggestionNoveltyStorageKey(mapId: string | null | undefined) {
	if (!mapId) {
		return null;
	}

	return `${SUGGESTION_NOVELTY_STORAGE_KEY_PREFIX}:${mapId}`;
}

function isSuggestionLens(value: unknown): value is SuggestionLens {
	return (
		typeof value === 'string' &&
		SUGGESTION_EXPLORATION_LENSES.includes(value as SuggestionLens)
	);
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

function shuffleSuggestionLenses(
	lenses: readonly SuggestionLens[]
): SuggestionLens[] {
	const next = [...lenses];

	for (let index = next.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(Math.random() * (index + 1));
		[next[index], next[swapIndex]] = [next[swapIndex], next[index]];
	}

	return next;
}

function trimSuggestionHistory(
	recentSuggestions: SuggestionHistoryEntry[]
): SuggestionHistoryEntry[] {
	return recentSuggestions.slice(-MAX_STORED_RECENT_SUGGESTIONS);
}

function normalizeSuggestionHistoryEntry(
	entry: SuggestionHistoryEntry
): SuggestionHistoryEntry | null {
	const content = entry.content.trim();
	if (!content) {
		return null;
	}

	return {
		content,
		sourceNodeId:
			typeof entry.sourceNodeId === 'string' && entry.sourceNodeId.length > 0
				? entry.sourceNodeId
				: null,
		trigger: entry.trigger,
		timestamp:
			typeof entry.timestamp === 'string' && entry.timestamp.length > 0
				? entry.timestamp
				: new Date().toISOString(),
	};
}

function mergeSuggestionHistory(
	recentSuggestions: SuggestionHistoryEntry[],
	incomingEntries: SuggestionHistoryEntry[]
): SuggestionHistoryEntry[] {
	const merged = [...recentSuggestions];

	for (const incomingEntry of incomingEntries) {
		const normalizedEntry = normalizeSuggestionHistoryEntry(incomingEntry);
		if (!normalizedEntry) {
			continue;
		}

		const normalizedContent = normalizeSuggestionText(normalizedEntry.content);
		const existingIndex = merged.findIndex((entry) => {
			return (
				entry.sourceNodeId === normalizedEntry.sourceNodeId &&
				normalizeSuggestionText(entry.content) === normalizedContent
			);
		});

		if (existingIndex !== -1) {
			merged.splice(existingIndex, 1);
		}

		merged.push(normalizedEntry);
	}

	return trimSuggestionHistory(merged);
}

function getDefaultSuggestionNoveltyState(): SuggestionNoveltyState {
	return {
		recentSuggestions: [],
		lensOrder: shuffleSuggestionLenses(SUGGESTION_EXPLORATION_LENSES),
		lensIndex: 0,
		clickCount: 0,
	};
}

function readSuggestionNoveltyState(
	mapId: string | null | undefined
): SuggestionNoveltyState {
	if (!hasWindow()) {
		return getDefaultSuggestionNoveltyState();
	}

	const storageKey = getSuggestionNoveltyStorageKey(mapId);
	if (!storageKey) {
		return getDefaultSuggestionNoveltyState();
	}

	try {
		const storedValue = window.localStorage.getItem(storageKey);
		if (!storedValue) {
			return getDefaultSuggestionNoveltyState();
		}

		const parsed = JSON.parse(storedValue) as Partial<SuggestionNoveltyState>;
		const lensOrder = Array.isArray(parsed.lensOrder)
			? parsed.lensOrder.filter(isSuggestionLens)
			: [];

		return {
			recentSuggestions: trimSuggestionHistory(
				Array.isArray(parsed.recentSuggestions)
					? parsed.recentSuggestions.flatMap((entry) => {
							if (
								!entry ||
								typeof entry !== 'object' ||
								typeof (entry as SuggestionHistoryEntry).content !== 'string'
							) {
								return [];
							}

							const trigger = (entry as SuggestionHistoryEntry).trigger;
							if (
								trigger !== 'magic-wand' &&
								trigger !== 'dangling-edge' &&
								trigger !== 'auto'
							) {
								return [];
							}

							const normalized = normalizeSuggestionHistoryEntry({
								content: (entry as SuggestionHistoryEntry).content,
								sourceNodeId:
									(entry as SuggestionHistoryEntry).sourceNodeId ?? null,
								trigger,
								timestamp:
									(entry as SuggestionHistoryEntry).timestamp ??
									new Date().toISOString(),
							});

							return normalized ? [normalized] : [];
						})
					: []
			),
			lensOrder:
				lensOrder.length === SUGGESTION_EXPLORATION_LENSES.length
					? lensOrder
					: shuffleSuggestionLenses(SUGGESTION_EXPLORATION_LENSES),
			lensIndex:
				typeof parsed.lensIndex === 'number' && parsed.lensIndex >= 0
					? Math.floor(parsed.lensIndex)
					: 0,
			clickCount:
				typeof parsed.clickCount === 'number' && parsed.clickCount >= 0
					? Math.floor(parsed.clickCount)
					: 0,
		};
	} catch (error) {
		console.warn(
			'[suggestions-slice] failed to read suggestion novelty state',
			{
				mapId,
				error,
			}
		);
		return getDefaultSuggestionNoveltyState();
	}
}

function writeSuggestionNoveltyState(
	mapId: string | null | undefined,
	state: SuggestionNoveltyState
) {
	if (!hasWindow()) {
		return;
	}

	const storageKey = getSuggestionNoveltyStorageKey(mapId);
	if (!storageKey) {
		return;
	}

	try {
		window.localStorage.setItem(
			storageKey,
			JSON.stringify({
				recentSuggestions: trimSuggestionHistory(state.recentSuggestions),
				lensOrder: state.lensOrder,
				lensIndex: state.lensIndex,
				clickCount: state.clickCount,
			})
		);
	} catch (error) {
		console.warn(
			'[suggestions-slice] failed to persist suggestion novelty state',
			{
				mapId,
				error,
			}
		);
	}
}

function mergeGhostNodesIntoNoveltyState(
	state: SuggestionNoveltyState,
	ghostNodes: AppNode[]
): SuggestionNoveltyState {
	const ghostHistoryEntries = ghostNodes.flatMap((ghostNode) => {
		const metadata = ghostNode.data.metadata;
		const context = metadata?.context;
		const content =
			typeof metadata?.suggestedContent === 'string'
				? metadata.suggestedContent
				: ghostNode.data.content;

		if (typeof content !== 'string' || content.trim().length === 0) {
			return [];
		}

		const trigger = context?.trigger;
		const normalizedTrigger: SuggestionTrigger =
			trigger === 'magic-wand' ||
			trigger === 'dangling-edge' ||
			trigger === 'auto'
				? trigger
				: 'magic-wand';

		return [
			{
				content,
				sourceNodeId:
					typeof context?.sourceNodeId === 'string'
						? context.sourceNodeId
						: null,
				trigger: normalizedTrigger,
				timestamp: ghostNode.data.updated_at ?? new Date().toISOString(),
			},
		];
	});

	if (ghostHistoryEntries.length === 0) {
		return state;
	}

	return {
		...state,
		recentSuggestions: mergeSuggestionHistory(
			state.recentSuggestions,
			ghostHistoryEntries
		),
	};
}

function advanceSuggestionLenses(state: SuggestionNoveltyState) {
	let lensOrder =
		state.lensOrder.length === SUGGESTION_EXPLORATION_LENSES.length
			? [...state.lensOrder]
			: shuffleSuggestionLenses(SUGGESTION_EXPLORATION_LENSES);
	let lensIndex = Math.max(0, Math.floor(state.lensIndex));
	const selectedLenses: SuggestionLens[] = [];

	while (selectedLenses.length < SUGGESTION_LENSES_PER_REQUEST) {
		if (lensIndex >= lensOrder.length) {
			lensOrder = shuffleSuggestionLenses(SUGGESTION_EXPLORATION_LENSES);
			lensIndex = 0;
		}

		selectedLenses.push(lensOrder[lensIndex]);
		lensIndex += 1;
	}

	return {
		selectedLenses,
		lensOrder,
		lensIndex,
	};
}

function createSuggestionRequestNonce() {
	if (
		typeof crypto !== 'undefined' &&
		typeof crypto.randomUUID === 'function'
	) {
		return crypto.randomUUID();
	}

	return `req_${Date.now()}_${Math.round(Math.random() * 1_000_000)}`;
}

function getNodeRenderedHeight(node: AppNode): number {
	return node.height ?? node.measured?.height ?? node.data.height ?? 0;
}

function getViewportSuggestionCenter(
	reactFlowInstance: AppState['reactFlowInstance']
) {
	if (!reactFlowInstance || typeof window === 'undefined') {
		return { x: 0, y: 0 };
	}

	return reactFlowInstance.screenToFlowPosition({
		x: window.innerWidth / 2,
		y: window.innerHeight / 2,
	});
}

function getUnanchoredSuggestionPosition(
	center: { x: number; y: number },
	index: number
) {
	if (index === 0) {
		return center;
	}

	const pairIndex = index - 1;
	const row = Math.floor(pairIndex / 2);
	const direction = pairIndex % 2 === 0 ? 1 : -1;

	return {
		x: center.x + direction * (row + 1) * UNANCHORED_SUGGESTION_X_OFFSET,
		y: center.y + row * UNANCHORED_SUGGESTION_Y_OFFSET,
	};
}

export function getStreamedSuggestionPlacement(params: {
	nodes: AppNode[];
	requestContext: SuggestionContext;
	suggestionContext: SuggestionContext;
	reactFlowInstance: AppState['reactFlowInstance'];
	anchorSuggestionCounts: Map<string, number>;
}) {
	const {
		nodes,
		requestContext,
		suggestionContext,
		reactFlowInstance,
		anchorSuggestionCounts,
	} = params;

	const nodesById = new Map(nodes.map((node) => [node.id, node]));
	const returnedAnchorNodeId =
		typeof suggestionContext.sourceNodeId === 'string'
			? suggestionContext.sourceNodeId
			: null;
	const requestedAnchorNodeId =
		typeof requestContext.sourceNodeId === 'string'
			? requestContext.sourceNodeId
			: null;
	const resolvedAnchorNodeId = returnedAnchorNodeId
		? (nodesById.get(returnedAnchorNodeId)?.id ?? null)
		: requestedAnchorNodeId
			? (nodesById.get(requestedAnchorNodeId)?.id ?? null)
			: null;

	const bucketKey = resolvedAnchorNodeId ?? VIEWPORT_SUGGESTION_BUCKET;
	const bucketIndex = anchorSuggestionCounts.get(bucketKey) ?? 0;
	anchorSuggestionCounts.set(bucketKey, bucketIndex + 1);

	if (resolvedAnchorNodeId) {
		const anchorNode = nodesById.get(resolvedAnchorNodeId);

		if (anchorNode) {
			return {
				resolvedAnchorNodeId,
				position: {
					x: anchorNode.position.x + bucketIndex * ANCHORED_SUGGESTION_X_OFFSET,
					y:
						anchorNode.position.y +
						getNodeRenderedHeight(anchorNode) +
						ANCHORED_SUGGESTION_Y_OFFSET,
				},
			};
		}
	}

	return {
		resolvedAnchorNodeId: null,
		position: getUnanchoredSuggestionPosition(
			getViewportSuggestionCenter(reactFlowInstance),
			bucketIndex
		),
	};
}

export interface SuggestionsSlice {
	// State
	aiFeature: 'suggest-nodes' | 'suggest-connections' | 'suggest-merges';
	ghostNodes: AppNode[];
	isGeneratingSuggestions: boolean;
	suggestionError: string | null;
	mergeSuggestions: AiMergeSuggestion[];
	isStreaming: boolean;
	streamingError: string | null;

	activeStreamId: string | null;
	streamTrigger: StreamTrigger | null;
	chunks: unknown[];
	streamingAPI: string | null;
	stopStreamCallback: (() => void) | null;

	// Configuration and timing (new)
	suggestionConfig: SuggestionConfig;
	lastTriggerTime: number;
	pendingAnimations: Map<string, boolean>;

	// Actions
	setAiFeature: (
		feature: 'suggest-nodes' | 'suggest-connections' | 'suggest-merges'
	) => void;
	removeGhostNode: (nodeId: string) => void;
	addGhostNode: (suggestion: NodeSuggestion) => void;
	clearGhostNodes: () => void;

	generateSuggestions: (context: SuggestionContext) => Promise<void>;
	acceptSuggestion: (nodeId: string) => Promise<void>;
	rejectSuggestion: (nodeId: string) => void;

	generateConnectionSuggestions: (sourceNodeId?: string) => void;
	acceptConnectionSuggestion: (edgeId: string) => Promise<void>;
	rejectConnectionSuggestion: (edgeId: string) => void;
	addConnectionSuggestion: (suggestion: AiConnectionSuggestion) => void;

	generateMergeSuggestions: (sourceNodeId?: string) => void;
	setMergeSuggestions: (suggestions: AiMergeSuggestion[]) => void;
	acceptMerge: (suggestion: AiMergeSuggestion) => Promise<void>;
	rejectMerge: (suggestion: AiMergeSuggestion) => void;

	// Counterpoints
	generateCounterpointsForNode: (nodeId: string) => void;

	triggerStream: (
		api: string,
		body: Record<string, unknown>,
		onStreamChunk: (chunk: any) => void
	) => boolean;
	finishStream: (streamId: string) => void;
	abortStream: (reason: string) => void;
	stopStream: () => void;
	setStopStreamCallback: (callback: () => void) => void;

	// Configuration and animation management (new)
	updateSuggestionConfig: (config: PartialSuggestionConfig) => void;
	canTriggerSuggestion: () => boolean;
	startEdgeAnimation: (edgeId: string) => void;
	completeEdgeAnimation: (edgeId: string) => void;
	isAnimationPending: (edgeId: string) => boolean;

	// Helper methods
	getGhostNodeById: (nodeId: string) => AppNode | undefined;
	hasGhostNodes: () => boolean;
}

export const createSuggestionsSlice: StateCreator<
	AppState,
	[],
	[],
	SuggestionsSlice
> = (set, get) => ({
	// Initial state
	aiFeature: 'suggest-nodes',
	ghostNodes: [],
	isGeneratingSuggestions: false,
	suggestionError: null,
	mergeSuggestions: [],
	isStreaming: false,
	streamingError: null,

	activeStreamId: null,
	streamTrigger: null,
	chunks: [],
	streamingAPI: null,
	stopStreamCallback: null,

	// Configuration and timing (new)
	suggestionConfig: DEFAULT_SUGGESTION_CONFIG,
	lastTriggerTime: 0,
	pendingAnimations: new Map(),

	// Actions
	setAiFeature: (
		feature: 'suggest-nodes' | 'suggest-connections' | 'suggest-merges'
	) => {
		set({ aiFeature: feature });
	},

	addGhostNode: (suggestion: NodeSuggestion) => {
		const { mapId, edges } = get();
		const ghostId = generateUuid();
		const ghostNode: AppNode = {
			id: ghostId,
			type: 'ghostNode',
			position: suggestion.position,
			zIndex: AI_GHOST_NODE_Z_INDEX,
			data: {
				id: ghostId,
				map_id: mapId || '',
				parent_id: null,
				content: suggestion.content,
				position_x: suggestion.position.x,
				position_y: suggestion.position.y,
				node_type: 'ghostNode',
				width: null,
				height: null,
				tags: null,
				status: null,
				importance: null,
				sourceUrl: null,
				metadata: {
					suggestedContent: suggestion.content,
					suggestedType: suggestion.nodeType,
					nodePayload: suggestion.nodePayload,
					confidence: suggestion.confidence,
					context: suggestion.context,
					sourceNodeName: suggestion.sourceNodeName,
				},
				aiData: null,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			},
			draggable: false,
			selectable: false,
			deletable: false,
			connectable: true,
		};

		// Auto-create animated ghost edge if source node exists
		const newEdges = [...edges];
		if (suggestion.context.sourceNodeId) {
			const ghostEdgeId = `ghost-edge-${suggestion.context.sourceNodeId}-${ghostId}`;
			const ghostEdge: AppEdge = {
				id: ghostEdgeId,
				source: suggestion.context.sourceNodeId,
				target: ghostId,
				type: 'animatedGhostEdge',
				animated: true,
				style: {
					stroke: 'rgba(168, 85, 247, 0.6)', // Purple color for ghost edges
					strokeWidth: 2,
					strokeDasharray: '5 5',
				},
				markerEnd: 'arrowclosed',
				data: {
					id: ghostEdgeId,
					map_id: mapId || '',
					user_id: 'system',
					source: suggestion.context.sourceNodeId,
					target: ghostId,
					type: 'animatedGhostEdge',
					label: suggestion.context.relationshipType || null,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
					animated: true,
					markerEnd: 'arrowclosed',
					style: {
						stroke: 'rgba(168, 85, 247, 0.6)',
						strokeWidth: 2,
						strokeDasharray: '5 5',
					},
					metadata: {
						pathType: 'smoothstep' as const,
						isGhostEdge: true, // Mark as ghost edge for cleanup
					},
					aiData: {
						isSuggested: true,
					},
				},
			};
			newEdges.push(ghostEdge);
		}

		set((state) => ({
			ghostNodes: [...state.ghostNodes, ghostNode],
			edges: newEdges,
		}));
	},

	removeGhostNode: (nodeId: string) => {
		set((state) => ({
			ghostNodes: state.ghostNodes.filter((node) => node.id !== nodeId),
			// Also remove any ghost edges connected to this node
			edges: state.edges.filter(
				(edge) =>
					!(
						edge.data?.metadata?.isGhostEdge &&
						(edge.source === nodeId || edge.target === nodeId)
					)
			),
		}));
	},

	clearGhostNodes: () => {
		set((state) => ({
			ghostNodes: [],
			// Also clear all ghost edges
			edges: state.edges.filter((edge) => !edge.data?.metadata?.isGhostEdge),
		}));
	},

	acceptSuggestion: async (nodeId: string) => {
		const state = get();
		const ghostNode = state.getGhostNodeById(nodeId);

		if (!ghostNode || !ghostNode.data.metadata) {
			console.warn(`Ghost node with ID ${nodeId} not found`);
			return;
		}

		const ghostMetadata = ghostNode.data.metadata;
		const approvedNodeId = generateUuid();
		const approvedNodeInput = buildApprovedNodeInput({
			suggestedContent:
				ghostMetadata.suggestedContent ?? ghostNode.data.content ?? '',
			suggestedType: ghostMetadata.suggestedType as AvailableNodeTypes,
			nodePayload: ghostMetadata.nodePayload,
		});

		// Clean up any pending animations for edges connected to this ghost node
		const edges = state.edges.filter(
			(edge) => edge.source === nodeId || edge.target === nodeId
		);

		edges.forEach((edge) => {
			if (state.pendingAnimations.has(edge.id)) {
				state.completeEdgeAnimation(edge.id);
			}
		});

		// Add the new node to the main nodes array using the proper method signature
		await state.addNode({
			parentNode: null,
			nodeId: approvedNodeId,
			content: approvedNodeInput.content,
			nodeType: approvedNodeInput.nodeType,
			position: { x: ghostNode.position.x, y: ghostNode.position.y },
			data: approvedNodeInput.data,
		});

		// Remove the ghost node
		state.removeGhostNode(nodeId);

		// If there's a connection context, create the edge
		if (ghostMetadata.context?.sourceNodeId) {
			await state.addEdge(ghostMetadata.context.sourceNodeId, approvedNodeId, {
				label: ghostMetadata.context.relationshipType || null,
				animated: false,
			});
		}
	},

	rejectSuggestion: (nodeId: string) => {
		const state = get();

		// Clean up any pending animations for edges connected to this ghost node
		const edges = state.edges.filter(
			(edge) => edge.source === nodeId || edge.target === nodeId
		);

		edges.forEach((edge) => {
			if (state.pendingAnimations.has(edge.id)) {
				state.completeEdgeAnimation(edge.id);
			}
		});

		// Remove the ghost node
		state.removeGhostNode(nodeId);
	},

	generateSuggestions: async (context: SuggestionContext) => {
		const {
			nodes,
			edges,
			ghostNodes,
			mapId,
			mindMap,
			addGhostNode,
			clearGhostNodes,
			triggerStream,
			showStreamingToast,
			updateStreamingToast,
			setStreamingToastError,
			setStreamSteps,
			reactFlowInstance,
		} = get();

		set({
			streamingAPI: '/api/ai/suggestions',
		});

		try {
			const noveltyState = mergeGhostNodesIntoNoveltyState(
				readSuggestionNoveltyState(mapId),
				ghostNodes
			);
			const { selectedLenses, lensOrder, lensIndex } =
				advanceSuggestionLenses(noveltyState);
			const nextNoveltyState: SuggestionNoveltyState = {
				...noveltyState,
				lensOrder,
				lensIndex,
				clickCount: noveltyState.clickCount + 1,
			};
			writeSuggestionNoveltyState(mapId, nextNoveltyState);

			const suggestionContext = {
				nodes,
				edges,
				mapId,
				mapMeta: mindMap
					? {
							title: mindMap.title,
							description: mindMap.description,
						}
					: undefined,
				context,
				recentSuggestions: nextNoveltyState.recentSuggestions.slice(
					-MAX_SENT_RECENT_SUGGESTIONS
				),
				selectedLenses,
				clickIndex: nextNoveltyState.clickCount,
				requestNonce: createSuggestionRequestNonce(),
			};

			// Clear any existing ghost nodes before generating new suggestions
			clearGhostNodes();

			const anchorSuggestionCounts = new Map<string, number>();

			// Define the specific chunk handler for THIS process
			const handleChunk = (chunk: any) => {
				if (!chunk || !chunk.type) return;

				switch (chunk.type) {
					case 'data-stream-info':
						if (chunk.data?.steps) {
							setStreamSteps(chunk.data.steps);
						}

						break;

					case 'data-stream-status':
						if (chunk.data.error) {
							setStreamingToastError(chunk.data.error);
						} else {
							updateStreamingToast(chunk.data);
						}

						break;

					case 'data-node-suggestion':
						if (chunk.data) {
							const suggestionChunk = chunk.data;
							const placement = getStreamedSuggestionPlacement({
								nodes,
								requestContext: context,
								suggestionContext: suggestionChunk.context,
								reactFlowInstance,
								anchorSuggestionCounts,
							});
							const historyEntry: SuggestionHistoryEntry = {
								content: suggestionChunk.content,
								sourceNodeId: placement.resolvedAnchorNodeId,
								trigger: suggestionChunk.context?.trigger ?? context.trigger,
								timestamp: new Date().toISOString(),
							};
							const recentSuggestions = mergeSuggestionHistory(
								nextNoveltyState.recentSuggestions,
								[historyEntry]
							);
							nextNoveltyState.recentSuggestions = recentSuggestions;
							writeSuggestionNoveltyState(mapId, {
								...nextNoveltyState,
								recentSuggestions,
							});
							addGhostNode({
								...suggestionChunk,
								context: {
									...suggestionChunk.context,
									sourceNodeId: placement.resolvedAnchorNodeId,
								},
								position: placement.position,
							});
						}

						break;

					default:
						// Ignore 'start' or other event types if no action is needed
						break;
				}
			};

			// Show the initial toast
			showStreamingToast('Generating Node Suggestions');

			// Trigger the stream with a specific callback for handling node suggestions
			triggerStream(
				'/api/ai/suggestions', // Ensure you create this endpoint
				suggestionContext,
				handleChunk
			);
		} catch (error) {
			console.error('Error generating suggestions:', error);
			set({
				suggestionError:
					error instanceof Error
						? error.message
						: 'Failed to generate suggestions',
			});
		} finally {
			set({ isGeneratingSuggestions: false });
		}
	},

	generateConnectionSuggestions: (sourceNodeId?: string) => {
		const {
			mapId,
			triggerStream,
			showStreamingToast,
			updateStreamingToast,
			setStreamingToastError,
			addConnectionSuggestion,
			setStreamSteps,
		} = get();

		if (!mapId) {
			console.error('Cannot suggest connections without a mapId.');
			return;
		}

		// 1. Define the specific chunk handler for THIS process.
		// This function knows how to interpret the data from the stream.
		// If sourceNodeId is provided, filter suggestions to only include
		// connections where the source or target matches that node.
		const handleChunk = (chunk: any) => {
			if (!chunk || !chunk.type) return;

			switch (chunk.type) {
				case 'data-stream-info':
					if (chunk.data?.steps) {
						setStreamSteps(chunk.data.steps);
					}

					break;
				// This is a status update for our toast UI.
				case 'data-stream-status':
					if (chunk.data.error) {
						setStreamingToastError(chunk.data.error);
					} else {
						updateStreamingToast(chunk.data);
					}

					break;

				// This is a streamed AI-generated object.
				case 'data-connection-suggestion':
					// If sourceNodeId provided, filter to only connections involving that node
					if (sourceNodeId) {
						const suggestion = chunk.data;
						if (
							suggestion.sourceNodeId === sourceNodeId ||
							suggestion.targetNodeId === sourceNodeId
						) {
							addConnectionSuggestion(suggestion);
						}
					} else {
						addConnectionSuggestion(chunk.data);
					}
					break;

				default:
					// Ignore 'start' or other event types if no action is needed
					break;
			}
		};

		// Trigger the generic stream mediator.
		// Pass sourceNodeId in the body for potential API-side filtering
		const streamStarted = triggerStream(
			'/api/ai/suggest-connections', // The API endpoint to call
			{ mapId, sourceNodeId }, // The body for the request
			handleChunk // The specific callback to process the stream data
		);
		if (!streamStarted) {
			return;
		}

		// Replace stale AI connection suggestions only after stream start is accepted.
		set((state) => ({
			edges: removeSuggestedEdges(state.edges, AI_CONNECTION_EDGE_TYPE),
		}));

		showStreamingToast(
			sourceNodeId ? 'Finding Node Connections' : 'Suggesting Connections'
		);
	},

	acceptConnectionSuggestion: async (edgeId: string) => {
		const { edges, addEdge } = get();
		const edge = edges.find((e) => e.id === edgeId);

		if (!edge?.data?.aiData?.isSuggested) {
			console.warn(`Edge ${edgeId} is not a suggestion or not found`);
			return;
		}

		const connectionId = generateUuid();
		const originalSourceNodeId =
			edge.data?.aiData?.connectionProxy?.originalSourceNodeId ?? edge.source;
		const originalTargetNodeId =
			edge.data?.aiData?.connectionProxy?.originalTargetNodeId ?? edge.target;

		try {
			// Convert suggestion to regular edge
			await addEdge(originalSourceNodeId, originalTargetNodeId, {
				...edge.data,
				id: connectionId,
				aiData: {
					...edge.data.aiData,
					isSuggested: false,
					connectionProxy: null,
				},
				style: {
					...edge.data.style,
					stroke: '#6c757d', // Regular edge color
				},
			});

			// Remove the suggestion edge
			get().rejectConnectionSuggestion(edgeId);
		} catch (error) {
			console.error('Failed to accept connection suggestion:', error);
			throw error;
		}
	},

	rejectConnectionSuggestion: (edgeId: string) => {
		const { edges } = get();
		const edge = edges.find((e) => e.id === edgeId);

		if (edge) {
			set({ edges: edges.filter((e) => e.id !== edgeId) });
		}
	},

	addConnectionSuggestion: (suggestion: AiConnectionSuggestion) => {
		const { edges, nodes, mapId } = get();
		const { reason, label, confidence, metadata, extendedReason } = suggestion;
		const placement = resolveConnectionSuggestionPlacement({
			suggestion,
			nodes,
			edges,
			visibleNodes: get().getVisibleNodes(),
		});
		if (!placement) {
			console.warn(
				'[suggestions-slice] Failed to resolve visible proxy for connection suggestion, skipping',
				{
					sourceNodeId: suggestion.sourceNodeId,
					targetNodeId: suggestion.targetNodeId,
				}
			);
			return;
		}
		const {
			originalSourceNodeId,
			originalTargetNodeId,
			displaySourceNodeId,
			displayTargetNodeId,
			sourceHiddenChildLabel,
			targetHiddenChildLabel,
		} = placement;

		// Check if suggestion already exists (dedupe by original pair).
		const existingEdge = edges.find(
			(edge) =>
				edge.data?.aiData?.isSuggested === true &&
				getOriginalConnectionPair(edge).sourceNodeId === originalSourceNodeId &&
				getOriginalConnectionPair(edge).targetNodeId === originalTargetNodeId
		);

		if (existingEdge) {
			console.warn('Connection suggestion already exists, skipping');
			return;
		}

		const edgeId = `suggestion-${originalSourceNodeId}-${originalTargetNodeId}-${Date.now()}`;

		// Create suggestion edge
		const suggestionEdge: AppEdge = {
			id: edgeId,
			source: displaySourceNodeId,
			target: displayTargetNodeId,
			type: 'suggestedConnection',
			zIndex: AI_SUGGESTION_EDGE_Z_INDEX,
			animated: false,
			label: label,
			style: {
				stroke: '#f59e0b',
				strokeWidth: 2,
			},
			markerEnd: 'arrowclosed',
			data: {
				id: edgeId,
				map_id: mapId || '',
				user_id: 'system', // AI suggestions are system-generated
				source: displaySourceNodeId,
				target: displayTargetNodeId,
				type: 'suggestedConnection',
				label: label,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
				animated: false,
				markerEnd: 'arrowclosed',
				style: {
					stroke: '#f59e0b',
					strokeWidth: 2,
				},
				metadata: {
					pathType: 'smoothstep' as const,
				},
				aiData: {
					isSuggested: true,
					suggestion: {
						reason: reason || 'AI suggested connection',
						extendedReason: extendedReason || '',
						confidence: confidence,
						contextualRelevance: metadata.contextualRelevance,
					},
					connectionProxy: {
						originalSourceNodeId,
						originalTargetNodeId,
						displaySourceNodeId,
						displayTargetNodeId,
						sourceHiddenChildLabel,
						targetHiddenChildLabel,
					},
				},
			},
		};

		// Add to edges array
		set((state) => ({
			edges: [...state.edges, suggestionEdge],
		}));
	},

	generateCounterpointsForNode: (nodeId: string) => {
		const {
			nodes,
			edges,
			mapId,
			triggerStream,
			showStreamingToast,
			updateStreamingToast,
			setStreamingToastError,
			setStreamSteps,
			addGhostNode,
		} = get();

		if (!mapId) {
			console.error('Cannot generate counterpoints without a mapId.');
			return;
		}

		const sourceNode = nodes.find((n) => n.id === nodeId);

		const handleChunk = (chunk: any) => {
			if (!chunk || !chunk.type) return;

			switch (chunk.type) {
				case 'data-stream-info':
					if (chunk.data?.steps) setStreamSteps(chunk.data.steps);
					break;
				case 'data-stream-status':
					if (chunk.data?.error) setStreamingToastError(chunk.data.error);
					else updateStreamingToast(chunk.data);
					break;
				case 'data-node-suggestion':
					if (chunk.data) {
						const suggestion = chunk.data;
						addGhostNode({
							...suggestion,
							position: {
								x:
									(sourceNode?.position.x ?? 0) +
									(suggestion.index || 0) * 300 +
									(suggestion.index || 0) * 25,
								y:
									(sourceNode?.position.y ?? 0) +
									(sourceNode?.height ?? sourceNode?.data.height ?? 0) +
									50,
							},
						});
					}
					break;
				default:
					break;
			}
		};

		showStreamingToast('Generating Counterpoints');

		const body = {
			nodes,
			edges,
			mapId,
			context: { sourceNodeId: nodeId, trigger: 'magic-wand' as const },
		};

		triggerStream('/api/ai/counterpoints', body, handleChunk);
	},

	generateMergeSuggestions: (sourceNodeId?: string) => {
		const {
			mapId,
			triggerStream,
			showStreamingToast,
			updateStreamingToast,
			setStreamingToastError,
			setStreamSteps,
		} = get();

		if (!mapId) {
			// We throw an error here so the HOF can catch it and show a toast.
			throw new Error('A map must be loaded to suggest merges.');
		}

		// Reset previous error state at the start of the operation.
		set({ suggestionError: null });

		try {
			// Define the specific chunk handler for merge suggestions
			// If sourceNodeId is provided, filter suggestions to only include
			// merges where node1 or node2 matches that node.
			const handleChunk = (chunk: any) => {
				if (!chunk || !chunk.type) return;

				switch (chunk.type) {
					case 'data-stream-info':
						setStreamSteps(chunk.data.steps);

						break;

					case 'data-stream-status':
						if (chunk.data.error) {
							setStreamingToastError(chunk.data.error);
						} else {
							updateStreamingToast(chunk.data);
						}

						break;

					case 'data-merge-suggestion':
						const suggestion = chunk.data;

						// If sourceNodeId provided, filter to only merges involving that node
						if (sourceNodeId) {
							if (
								suggestion.node1Id !== sourceNodeId &&
								suggestion.node2Id !== sourceNodeId
							) {
								// Skip suggestions that don't involve the source node
								break;
							}
						}

						const edgeId = `merge-suggestion-${suggestion.node1Id}-${suggestion.node2Id}`;
						const newEdge: AppEdge = {
							id: edgeId,
							source: suggestion.node1Id,
							target: suggestion.node2Id,
							type: 'suggestedMerge', // This matches the key in edgeTypes
							zIndex: AI_SUGGESTION_EDGE_Z_INDEX,
							animated: true,
							label: null, // Label is handled inside the component
							data: {
								id: edgeId,
								map_id: mapId,
								user_id: 'system', // AI is the user
								source: suggestion.node1Id,
								target: suggestion.node2Id,
								type: 'suggestedMerge',
								label: null,
								created_at: new Date().toISOString(),
								updated_at: new Date().toISOString(),
								animated: true,
								style: {
									stroke: '#9333ea', // purple-600
									strokeWidth: 2,
									strokeDasharray: '5 5',
								},
								metadata: {
									pathType: 'smoothstep' as const,
								},
								aiData: {
									isSuggested: true,
									suggestion: {
										node1Id: suggestion.node1Id,
										node2Id: suggestion.node2Id,
										confidence: suggestion.confidence || 0.8,
										reason: suggestion.reason || 'AI suggested merge',
										similarityScore: suggestion.similarityScore,
									},
								},
							},
						};

						set((state) => ({
							...state,
							edges: [...state.edges, newEdge], // Clear old merge suggestions and add new ones
						}));

						break;

					default:
						// Ignore 'start' or other event types if no action is needed
						break;
				}
			};

			// Pass sourceNodeId in the body for potential API-side filtering
			const streamStarted = triggerStream(
				'/api/ai/suggest-merges', // Ensure you create this endpoint
				{ mapId, sourceNodeId },
				handleChunk
			);
			if (!streamStarted) {
				return;
			}

			set((state) => ({
				edges: removeSuggestedEdges(state.edges, AI_MERGE_EDGE_TYPE),
				mergeSuggestions: [],
			}));

			showStreamingToast(
				sourceNodeId ? 'Finding Similar Nodes' : 'Suggesting Node Merges'
			);
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: 'Failed to generate merge suggestions.';
			console.error(errorMessage, error);
			set({ suggestionError: errorMessage });

			// Re-throw the error to be caught by the HOF
			throw new Error(errorMessage);
		}
	},
	setMergeSuggestions: (suggestions: AiMergeSuggestion[]) => {
		set({ mergeSuggestions: suggestions });
	},

	acceptMerge: async (suggestion) => {
		const { nodes, edges, updateNode, deleteNodes, deleteEdges } = get();

		const nodeToKeep = nodes.find((n) => n.id === suggestion.node1Id);
		const nodeToRemove = nodes.find((n) => n.id === suggestion.node2Id);

		if (!nodeToKeep || !nodeToRemove) {
			console.error('Nodes for merge not found');
			return;
		}

		// 1. Merge content
		const mergedContent = `${nodeToKeep.data.content}\n\n---\n*Merged from "${nodeToRemove.data.content}"*`;
		await updateNode({
			nodeId: nodeToKeep.id,
			data: { content: mergedContent },
		});

		// 2. Re-parent children of the removed node
		const edgesToReparent = edges.filter((e) => e.source === nodeToRemove.id);

		for (const edge of edgesToReparent) {
			// Create a new edge from the kept node to the child
			await get().addEdge(nodeToKeep.id, edge.target, {});
		}

		// 3. Delete the now-merged node and its associated edges
		const edgesToDelete = edges.filter(
			(e) => e.source === nodeToRemove.id || e.target === nodeToRemove.id
		);
		await deleteEdges(edgesToDelete);
		await deleteNodes([nodeToRemove]);

		// 4. Clean up the suggestion from the UI
		// (History is tracked via underlying operations: updateNode, deleteEdges, deleteNodes)
		get().rejectMerge(suggestion);
	},

	rejectMerge: (suggestion) => {
		set((state) => ({
			mergeSuggestions: state.mergeSuggestions.filter((s) => s !== suggestion),
			edges: state.edges.filter(
				(e: AppEdge) =>
					!(
						e.data?.aiData?.suggestion?.node1Id === suggestion.node1Id &&
						e.data?.aiData?.suggestion?.node2Id === suggestion.node2Id
					)
			),
		}));
	},

	triggerStream: (api, body, onStreamChunk) => {
		const { isStreaming, canTriggerSuggestion } = get();

		if (isStreaming === true) {
			return false;
		}

		// Check throttling (except for manual triggers)
		const isSuggestionAPI =
			api.includes('/suggestions') || api.includes('/suggest-');
		if (isSuggestionAPI && !canTriggerSuggestion()) {
			return false;
		}

		const streamId = `stream_${Date.now()}`;
		set({
			isStreaming: true,
			suggestionError: null,
			activeStreamId: streamId,
			streamTrigger: {
				id: streamId,
				api,
				body,
				onStreamChunk, // Store the callback
			},
			streamingAPI: api,
			lastTriggerTime: Date.now(), // Update trigger time
		});
		return true;
	},

	finishStream: () => {
		get().hideStreamingToast();
		set({
			isStreaming: false,
			activeStreamId: null,
			streamTrigger: null,
			streamingAPI: null,
			chunks: [],
			stopStreamCallback: null,
		});
	},

	abortStream: (reason) => {
		get().hideStreamingToast();
		set({
			isStreaming: false,
			suggestionError: reason,
			activeStreamId: null,
			streamTrigger: null,
			streamingAPI: null,
			chunks: [],
			stopStreamCallback: null,
		});
	},

	stopStream: () => {
		const { stopStreamCallback } = get();
		if (stopStreamCallback) {
			stopStreamCallback();
		}
		get().hideStreamingToast();
		set({
			isStreaming: false,
			activeStreamId: null,
			streamTrigger: null,
			streamingAPI: null,
			chunks: [],
			stopStreamCallback: null,
		});
	},

	setStopStreamCallback: (callback) => {
		set({ stopStreamCallback: callback });
	},

	// Configuration and animation management
	updateSuggestionConfig: (config: PartialSuggestionConfig) => {
		set((state) => ({
			suggestionConfig: {
				...state.suggestionConfig,
				...config,
				timing: { ...state.suggestionConfig.timing, ...config.timing },
				quality: { ...state.suggestionConfig.quality, ...config.quality },
				context: { ...state.suggestionConfig.context, ...config.context },
				animation: {
					...state.suggestionConfig.animation,
					...config.animation,
					easing: {
						...state.suggestionConfig.animation.easing,
						...config.animation?.easing,
					},
				},
				triggers: config.triggers || state.suggestionConfig.triggers,
			},
		}));
	},

	canTriggerSuggestion: () => {
		const state = get();
		const { lastTriggerTime, suggestionConfig, isStreaming } = state;

		// Don't trigger if already streaming
		if (isStreaming) {
			return false;
		}

		// Check if enough time has passed since last trigger
		const now = Date.now();
		const timeSinceLastTrigger = now - lastTriggerTime;

		return (
			timeSinceLastTrigger >= suggestionConfig.timing.minTimeBetweenSuggestions
		);
	},

	startEdgeAnimation: (edgeId: string) => {
		set((state) => {
			const newMap = new Map(state.pendingAnimations);
			newMap.set(edgeId, true);
			return { pendingAnimations: newMap };
		});
	},

	completeEdgeAnimation: (edgeId: string) => {
		set((state) => {
			const newMap = new Map(state.pendingAnimations);
			newMap.delete(edgeId);
			return { pendingAnimations: newMap };
		});
	},

	isAnimationPending: (edgeId: string) => {
		return get().pendingAnimations.has(edgeId);
	},

	// Helper methods
	getGhostNodeById: (nodeId: string) => {
		return get().ghostNodes.find((node) => node.id === nodeId);
	},

	hasGhostNodes: () => {
		return get().ghostNodes.length > 0;
	},
});
