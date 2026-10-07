import {
	compactPromptList,
	compactPromptText,
	getCompactNodeType,
} from '@/helpers/ai-hybrid-rows';
import { isStructuralEdge } from '@/helpers/collapse/branch-index';
import { extractEnhancedContext } from '@/helpers/extract-enhanced-node-context';
import { getNodeSemanticText } from '@/helpers/node-semantic-text';
import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import type {
	SuggestionContext,
	SuggestionHistoryEntry,
	SuggestionLens,
} from '@/types/ghost-node';

const EXCLUDED_FULL_MAP_NODE_TYPES = new Set([
	'ghostNode',
	'commentNode',
	'groupNode',
]);

export interface SuggestionPromptInput {
	nodes: AppNode[];
	edges: AppEdge[];
	mapMeta?: {
		title?: string | null;
		description?: string | null;
	};
	context: SuggestionContext;
	selectedLenses: SuggestionLens[];
	recentSuggestions: SuggestionHistoryEntry[];
	clickIndex: number;
	requestNonce: string;
}

/** The graph builders only read these fields of a prompt input. */
export type SuggestionGraphInput = Pick<
	SuggestionPromptInput,
	'nodes' | 'edges' | 'mapMeta' | 'context'
>;

export type SuggestionGraphContextMode = 'full-map' | 'focused-node';

export interface SuggestionGraphNode {
	id: string;
	type: string;
	text: string;
	tags: string[];
	depth: number | null;
	degree: number | null;
	flags: string[];
}

export interface SuggestionGraphRelation {
	kind: string;
	fromId: string;
	toId: string;
}

export interface SuggestionGraphAnchor {
	id: string;
	type: string;
	text: string;
	depth: number;
	degree: number;
}

export interface SuggestionGraphContextModel {
	mode: SuggestionGraphContextMode;
	map: {
		title: string;
		description: string | null;
		nodeCount: number;
		edgeCount: number;
	};
	topics: string[];
	nodes: SuggestionGraphNode[];
	relations: SuggestionGraphRelation[];
	anchors: SuggestionGraphAnchor[];
	metrics: {
		maxDepth: number;
		rootCount: number;
		isolatedCount: number;
	};
	validAnchorNodeIds: string[];
}

function normalizeMapMeta(mapMeta?: SuggestionGraphInput['mapMeta']) {
	return {
		title: compactPromptText(mapMeta?.title) ?? 'Untitled',
		description: compactPromptText(mapMeta?.description),
	};
}

function getNodeType(node: AppNode): string {
	return getCompactNodeType(node.data.node_type || node.type);
}

function getNodePromptTags(node: AppNode): string[] {
	return compactPromptList([
		...(((node.data.tags as string[] | undefined) ?? []) as Array<
			string | null | undefined
		>),
		...((node.data.metadata?.tags ?? []) as Array<string | null | undefined>),
	]);
}

function calculateNodeDepth(
	nodeId: string,
	edges: AppEdge[],
	nodeIds: Set<string>
): number {
	let depth = 0;
	let currentNodeId = nodeId;
	const visited = new Set<string>();

	while (true) {
		if (visited.has(currentNodeId)) {
			break;
		}

		visited.add(currentNodeId);
		const parentEdge = edges.find(
			(edge) => edge.target === currentNodeId && nodeIds.has(edge.source)
		);

		if (!parentEdge) {
			break;
		}

		depth += 1;
		currentNodeId = parentEdge.source;

		if (depth > 100) {
			break;
		}
	}

	return depth;
}

function getNodeDegree(nodeId: string, edges: AppEdge[], nodeIds: Set<string>) {
	return edges.filter(
		(edge) =>
			(edge.source === nodeId && nodeIds.has(edge.target)) ||
			(edge.target === nodeId && nodeIds.has(edge.source))
	).length;
}

function getNodeFlags(params: { depth: number; degree: number; extraFlags?: string[] }) {
	const flags = [...(params.extraFlags ?? [])];

	if (params.depth === 0) {
		flags.push('root');
	}

	if (params.degree === 0) {
		flags.push('isolated');
	}

	return Array.from(new Set(flags));
}

function extractTopics(contents: string[], maxTopics: number = 10): string[] {
	const combined = contents.join(' ').toLowerCase();
	const stopWords = new Set([
		'the',
		'a',
		'an',
		'and',
		'or',
		'but',
		'in',
		'on',
		'at',
		'to',
		'for',
		'of',
		'with',
		'by',
		'from',
		'is',
		'are',
		'was',
		'were',
		'be',
		'been',
		'being',
		'have',
		'has',
		'had',
		'do',
		'does',
		'did',
		'will',
		'would',
		'should',
		'could',
		'can',
		'may',
		'might',
		'must',
		'this',
		'that',
		'these',
		'those',
		'it',
		'its',
	]);

	const words = combined.match(/\b[a-z0-9]{3,}\b/g) || [];
	const wordCounts = words
		.filter((word) => !stopWords.has(word))
		.reduce(
			(counts, word) => {
				counts[word] = (counts[word] || 0) + 1;
				return counts;
			},
			{} as Record<string, number>
		);

	return Object.entries(wordCounts)
		.sort((left, right) => right[1] - left[1])
		.slice(0, maxTopics)
		.map(([word]) => word);
}

function buildGraphMetrics(nodes: SuggestionGraphNode[]) {
	const depths = nodes
		.map((node) => node.depth)
		.filter((depth): depth is number => depth !== null);
	const degrees = nodes
		.map((node) => node.degree)
		.filter((degree): degree is number => degree !== null);

	return {
		maxDepth: Math.max(0, ...depths),
		rootCount: nodes.filter((node) => node.depth === 0).length,
		isolatedCount: degrees.filter((degree) => degree === 0).length,
	};
}

function isFullMapCandidate(node: AppNode) {
	return !EXCLUDED_FULL_MAP_NODE_TYPES.has(
		node.data.node_type || node.type || 'defaultNode'
	);
}

function sortNodesForFullMap(nodes: AppNode[], edges: AppEdge[]) {
	const nodeIds = new Set(nodes.map((node) => node.id));

	return nodes
		.map((node) => {
			const depth = calculateNodeDepth(node.id, edges, nodeIds);
			const degree = getNodeDegree(node.id, edges, nodeIds);
			const score = degree * 2 + (depth === 0 ? 10 : 0) + 1 / (depth + 1);

			return { node, depth, degree, score };
		})
		.sort((left, right) => right.score - left.score);
}

export function buildFullMapSuggestionGraph(
	input: SuggestionGraphInput
): SuggestionGraphContextModel {
	const mapMeta = normalizeMapMeta(input.mapMeta);
	const eligibleNodes = input.nodes.filter(isFullMapCandidate);
	const rankedNodes = sortNodesForFullMap(eligibleNodes, input.edges);
	const eligibleNodeIds = new Set(eligibleNodes.map((node) => node.id));
	const relations = input.edges
		.filter(
			(edge) => eligibleNodeIds.has(edge.source) && eligibleNodeIds.has(edge.target)
		)
		.map((edge) => ({
			kind: 'edge',
			fromId: edge.source,
			toId: edge.target,
		}));
	const graphNodes = rankedNodes.map(({ node, depth, degree }) => ({
		id: node.id,
		type: getNodeType(node),
		text: getNodeSemanticText(node),
		tags: getNodePromptTags(node),
		depth,
		degree,
		flags: getNodeFlags({ depth, degree }),
	}));
	const anchors = rankedNodes.map(({ node, depth, degree }) => ({
		id: node.id,
		type: getNodeType(node),
		text: getNodeSemanticText(node),
		depth,
		degree,
	}));

	return {
		mode: 'full-map',
		map: {
			title: mapMeta.title,
			description: mapMeta.description,
			nodeCount: input.nodes.length,
			edgeCount: input.edges.length,
		},
		topics: extractTopics(graphNodes.map((node) => node.text)),
		nodes: graphNodes,
		relations,
		anchors,
		metrics: buildGraphMetrics(graphNodes),
		validAnchorNodeIds: anchors.map((anchor) => anchor.id),
	};
}

function buildFallbackFocusedGraph(
	input: SuggestionGraphInput
): SuggestionGraphContextModel {
	const mapMeta = normalizeMapMeta(input.mapMeta);
	const nodeIds = new Set(input.nodes.map((node) => node.id));
	const sourceNode = input.nodes.find((node) => node.id === input.context.sourceNodeId);
	const focusedNodeId = sourceNode?.id ?? input.context.sourceNodeId ?? 'unknown';
	const depth = sourceNode
		? calculateNodeDepth(sourceNode.id, input.edges, nodeIds)
		: null;
	const degree = sourceNode
		? getNodeDegree(sourceNode.id, input.edges, nodeIds)
		: null;

	return {
		mode: 'focused-node',
		map: {
			title: mapMeta.title,
			description: mapMeta.description,
			nodeCount: input.nodes.length,
			edgeCount: input.edges.length,
		},
		topics: [],
			nodes: [
				{
					id: focusedNodeId,
					type: sourceNode ? getNodeType(sourceNode) : 'default',
					text: sourceNode ? getNodeSemanticText(sourceNode) : 'Unknown',
					tags: sourceNode ? getNodePromptTags(sourceNode) : [],
				depth,
				degree,
				flags: ['focus'],
			},
		],
		relations: [],
		anchors: [],
			metrics: {
				maxDepth: depth ?? 0,
				rootCount: depth === 0 ? 1 : 0,
				isolatedCount: degree === 0 ? 1 : 0,
			},
			validAnchorNodeIds: [focusedNodeId],
		};
}

function toFocusedGraphNode(
	node: AppNode,
	edges: AppEdge[],
	nodeIds: Set<string>,
	extraFlags: string[]
): SuggestionGraphNode {
	const depth = calculateNodeDepth(node.id, edges, nodeIds);
	const degree = getNodeDegree(node.id, edges, nodeIds);

	return {
		id: node.id,
		type: getNodeType(node),
		text: getNodeSemanticText(node),
		tags: getNodePromptTags(node),
		depth,
		degree,
		flags: getNodeFlags({ depth, degree, extraFlags }),
	};
}

/** Direct children of a node through structural edges, in edge order. */
function getStructuralChildren(
	nodeId: string,
	nodesById: Map<string, AppNode>,
	edges: AppEdge[]
): AppNode[] {
	const children: AppNode[] = [];
	for (const edge of edges) {
		if (edge.source !== nodeId || !isStructuralEdge(edge)) continue;
		const child = nodesById.get(edge.target);
		if (child && !children.includes(child)) children.push(child);
	}
	return children;
}

const FOCUSED_CHILD_LIMIT = 10;

export function buildFocusedNodeSuggestionGraph(
	input: SuggestionGraphInput,
	options: { includeChildren?: boolean } = {}
): SuggestionGraphContextModel {
	if (!input.context.sourceNodeId) {
		return buildFallbackFocusedGraph(input);
	}

	try {
		const mapMeta = normalizeMapMeta(input.mapMeta);
		const enhancedContext = extractEnhancedContext(
			input.context.sourceNodeId,
			input.nodes,
			input.edges,
			{
				includeSiblings: true,
				includeAncestry: true,
				includeTopology: true,
			}
		);
		const nodeIds = new Set(input.nodes.map((node) => node.id));
		const graphNodes: SuggestionGraphNode[] = [
			toFocusedGraphNode(
				enhancedContext.primary,
				input.edges,
				nodeIds,
				['focus']
			),
		];

		if (enhancedContext.parent) {
			graphNodes.push(
				toFocusedGraphNode(enhancedContext.parent, input.edges, nodeIds, ['parent'])
			);
		}

		if (enhancedContext.grandparent) {
			graphNodes.push(
				toFocusedGraphNode(
					enhancedContext.grandparent,
					input.edges,
					nodeIds,
					['grandparent']
				)
			);
		}

		for (const sibling of enhancedContext.siblings.slice(0, 5)) {
			graphNodes.push(
				toFocusedGraphNode(sibling, input.edges, nodeIds, ['sibling'])
			);
		}

		const relations: SuggestionGraphRelation[] = [];
		if (enhancedContext.parent) {
			relations.push({
				kind: 'parent',
				fromId: enhancedContext.parent.id,
				toId: enhancedContext.primary.id,
			});
		}

		if (enhancedContext.grandparent && enhancedContext.parent) {
			relations.push({
				kind: 'parent',
				fromId: enhancedContext.grandparent.id,
				toId: enhancedContext.parent.id,
			});
		}

		for (const sibling of enhancedContext.siblings.slice(0, 5)) {
			relations.push({
				kind: 'sibling',
				fromId: enhancedContext.primary.id,
				toId: sibling.id,
			});
		}

		if (options.includeChildren) {
			const nodesById = new Map(input.nodes.map((node) => [node.id, node]));
			const children = getStructuralChildren(
				enhancedContext.primary.id,
				nodesById,
				input.edges
			).slice(0, FOCUSED_CHILD_LIMIT);

			for (const child of children) {
				graphNodes.push(toFocusedGraphNode(child, input.edges, nodeIds, ['child']));
				relations.push({
					kind: 'parent',
					fromId: enhancedContext.primary.id,
					toId: child.id,
				});
			}
		}

			return {
				mode: 'focused-node',
				map: {
				title: mapMeta.title,
				description: mapMeta.description,
				nodeCount: input.nodes.length,
				edgeCount: input.edges.length,
			},
			topics: compactPromptList(enhancedContext.siblingPatterns.topics, 10),
			nodes: graphNodes,
				relations,
				anchors: [],
				metrics: buildGraphMetrics(graphNodes),
				validAnchorNodeIds: [
					enhancedContext.primary.id ??
						input.context.sourceNodeId ??
						'unknown',
				],
			};
	} catch (error) {
		console.error('Failed to build focused suggestion graph:', error);
		return buildFallbackFocusedGraph(input);
	}
}

/**
 * A node and its whole structural subtree (breadth-first, capped at `limit` nodes
 * including the focus), plus its parent for context. Every node in the subtree is a
 * valid anchor; the parent is not.
 */
export function buildBranchSuggestionGraph(
	input: SuggestionGraphInput,
	options: { limit: number }
): SuggestionGraphContextModel {
	const focusNode = input.nodes.find((node) => node.id === input.context.sourceNodeId);
	if (!focusNode) {
		return buildFallbackFocusedGraph(input);
	}

	const mapMeta = normalizeMapMeta(input.mapMeta);
	const nodeIds = new Set(input.nodes.map((node) => node.id));
	const nodesById = new Map(input.nodes.map((node) => [node.id, node]));
	const branchNodes: AppNode[] = [focusNode];
	const relations: SuggestionGraphRelation[] = [];
	const visited = new Set([focusNode.id]);

	for (let index = 0; index < branchNodes.length; index += 1) {
		const current = branchNodes[index];
		for (const child of getStructuralChildren(current.id, nodesById, input.edges)) {
			// Cross-links into nodes already in the branch are kept as relations only.
			if (visited.has(child.id)) {
				relations.push({ kind: 'link', fromId: current.id, toId: child.id });
				continue;
			}
			if (branchNodes.length >= options.limit) continue;
			visited.add(child.id);
			branchNodes.push(child);
			relations.push({ kind: 'parent', fromId: current.id, toId: child.id });
		}
	}

	const graphNodes = branchNodes.map((node) =>
		toFocusedGraphNode(node, input.edges, nodeIds, [
			node.id === focusNode.id ? 'focus' : 'branch',
		])
	);

	const parentEdge = input.edges.find(
		(edge) =>
			edge.target === focusNode.id &&
			isStructuralEdge(edge) &&
			nodesById.has(edge.source) &&
			!visited.has(edge.source)
	);
	const parentNode = parentEdge ? nodesById.get(parentEdge.source) : undefined;
	if (parentNode) {
		graphNodes.push(toFocusedGraphNode(parentNode, input.edges, nodeIds, ['parent']));
		relations.push({ kind: 'parent', fromId: parentNode.id, toId: focusNode.id });
	}

	return {
		mode: 'focused-node',
		map: {
			title: mapMeta.title,
			description: mapMeta.description,
			nodeCount: input.nodes.length,
			edgeCount: input.edges.length,
		},
		topics: extractTopics(graphNodes.map((node) => node.text)),
		nodes: graphNodes,
		relations,
		anchors: [],
		metrics: buildGraphMetrics(graphNodes),
		validAnchorNodeIds: branchNodes.map((node) => node.id),
	};
}
