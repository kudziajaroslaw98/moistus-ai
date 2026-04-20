import {
	compactPromptList,
	compactPromptText,
	getCompactNodeType,
} from '@/helpers/ai-hybrid-rows';
import { extractEnhancedContext } from '@/helpers/extract-enhanced-node-context';
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

function normalizeMapMeta(mapMeta?: SuggestionPromptInput['mapMeta']) {
	return {
		title: compactPromptText(mapMeta?.title) ?? 'Untitled',
		description: compactPromptText(mapMeta?.description),
	};
}

function getNodeType(node: AppNode): string {
	return getCompactNodeType(node.data.node_type || node.type);
}

function getNodeSemanticText(node: AppNode): string {
	const metadata = node.data.metadata;
	const fragments = [
		typeof metadata?.title === 'string' ? metadata.title : null,
		typeof metadata?.label === 'string' ? metadata.label : null,
		typeof node.data.content === 'string' ? node.data.content : null,
		typeof metadata?.summary === 'string' ? metadata.summary : null,
		typeof metadata?.answer === 'string' ? metadata.answer : null,
		typeof metadata?.caption === 'string' ? metadata.caption : null,
		typeof metadata?.altText === 'string' ? metadata.altText : null,
	]
		.map((fragment) => compactPromptText(fragment))
		.filter((fragment): fragment is string => fragment !== null);

	return Array.from(new Set(fragments)).join(' | ') || '[no content]';
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
	input: SuggestionPromptInput
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
	input: SuggestionPromptInput
): SuggestionGraphContextModel {
	const mapMeta = normalizeMapMeta(input.mapMeta);
	const nodeIds = new Set(input.nodes.map((node) => node.id));
	const sourceNode = input.nodes.find((node) => node.id === input.context.sourceNodeId);
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
				id: sourceNode?.id ?? input.context.sourceNodeId ?? 'unknown',
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
		validAnchorNodeIds: [],
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

export function buildFocusedNodeSuggestionGraph(
	input: SuggestionPromptInput
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
			validAnchorNodeIds: [],
		};
	} catch (error) {
		console.error('Failed to build focused suggestion graph:', error);
		return buildFallbackFocusedGraph(input);
	}
}
