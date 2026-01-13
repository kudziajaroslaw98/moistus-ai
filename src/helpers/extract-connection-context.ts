/**
 * Context extraction optimized for AI connection suggestions.
 *
 * Extracts only semantically meaningful content from nodes and edges,
 * filtering out UI state, styling, URLs, and other non-semantic data.
 *
 * Token reduction: ~97% compared to raw JSON.stringify
 */

import type { AvailableNodeTypes } from '@/registry/node-registry';
import type { EdgeData } from '@/types/edge-data';
import type { NodeData } from '@/types/node-data';

export interface MinimalNodeForConnections {
	id: string;
	type: string;
	semantic: string;
	tags?: string[];
}

export interface MinimalEdgeForConnections {
	source: string;
	target: string;
	label?: string;
}

/** Node types to exclude from connection suggestions */
const EXCLUDED_NODE_TYPES: AvailableNodeTypes[] = [
	'ghostNode', // AI suggestions - temporary
	'commentNode', // Discussion threads - not semantic content
	'groupNode', // Containers - structural only
];

/**
 * Extract semantic content from a node based on its type.
 * Each node type stores content in different fields.
 */
function extractSemanticContent(node: NodeData): string {
	const type = node.node_type || 'defaultNode';

	switch (type) {
		case 'taskNode':
			// Tasks use metadata.title + metadata.tasks[].text
			return [
				node.metadata?.title,
				node.content,
				...(node.metadata?.tasks?.map((t) => t.text) || []),
			]
				.filter(Boolean)
				.join(' | ');

		case 'resourceNode':
			// Resources use metadata.title + metadata.summary (NO url)
			return [node.metadata?.title, node.metadata?.summary]
				.filter(Boolean)
				.join(' | ');

		case 'imageNode':
			// Images use altText + caption (NO imageUrl)
			return [node.metadata?.altText, node.metadata?.caption]
				.filter(Boolean)
				.join(' | ');

		case 'referenceNode':
			// References use targetMapTitle + contentSnippet (NO IDs)
			return [node.metadata?.targetMapTitle, node.metadata?.contentSnippet]
				.filter(Boolean)
				.join(' | ');

		case 'questionNode':
			// Questions use content (question) + metadata.answer
			return [node.content, node.metadata?.answer]
				.filter(Boolean)
				.join(' → ');

		case 'codeNode':
			// Code uses fileName + language + truncated code
			return [
				node.metadata?.fileName,
				node.metadata?.language,
				node.content?.slice(0, 150),
			]
				.filter(Boolean)
				.join(' | ');

		case 'annotationNode':
			// Annotations use annotationType + content
			return [node.metadata?.annotationType, node.content]
				.filter(Boolean)
				.join(': ');

		case 'textNode':
			// Text nodes use label + content
			return [node.metadata?.label, node.content].filter(Boolean).join(' | ');

		default:
			// defaultNode and others: title + content
			return [node.metadata?.title, node.content].filter(Boolean).join(' | ');
	}
}

/**
 * Extract minimal node data for connection suggestions.
 * Filters out non-semantic nodes and extracts only relevant content.
 */
export function extractNodesForConnections(
	nodes: NodeData[]
): MinimalNodeForConnections[] {
	return nodes
		.filter((n) => {
			const type = (n.node_type || 'defaultNode') as AvailableNodeTypes;
			return !EXCLUDED_NODE_TYPES.includes(type);
		})
		.map((n) => {
			const semantic = extractSemanticContent(n);

			return {
				id: n.id,
				type: n.node_type || 'defaultNode',
				semantic: semantic.slice(0, 300), // Cap total length
				...(n.metadata?.tags?.length ? { tags: n.metadata.tags } : {}),
			};
		})
		.filter((n) => n.semantic.length > 0); // Skip empty content nodes
}

/**
 * Extract minimal edge data for connection suggestions.
 * Only includes source, target, and optional label.
 * Filters out ghost/suggested edges.
 */
export function extractEdgesForConnections(
	edges: EdgeData[]
): MinimalEdgeForConnections[] {
	return edges
		.filter((e) => !e.metadata?.isGhostEdge && !e.aiData?.isSuggested)
		.map((e) => ({
			source: e.source,
			target: e.target,
			...(e.label ? { label: e.label } : {}),
		}));
}

/**
 * Format extracted data as a prompt-ready string.
 * Produces compact, structured output for LLM consumption.
 */
export function formatConnectionContext(
	nodes: MinimalNodeForConnections[],
	edges: MinimalEdgeForConnections[]
): string {
	const nodeLines = nodes.map((n) => {
		const parts = [`[${n.id}] (${n.type}): ${n.semantic}`];
		if (n.tags?.length) {
			parts.push(`#${n.tags.join(' #')}`);
		}
		return parts.join(' ');
	});

	const edgeLines = edges.map(
		(e) => `${e.source} -> ${e.target}${e.label ? ` (${e.label})` : ''}`
	);

	return [
		'NODES:',
		nodeLines.join('\n'),
		'',
		'EXISTING CONNECTIONS:',
		edgeLines.length > 0 ? edgeLines.join('\n') : '(none)',
	].join('\n');
}
