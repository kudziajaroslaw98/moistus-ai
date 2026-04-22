import type { AvailableNodeTypes } from '@/registry/node-registry';
import type { AppNode } from '@/types/app-node';
import type { NodeData } from '@/types/node-data';
import { aliasNodeId, type AiIdAliasMap } from './ai-id-alias-map';
import {
	compactPromptList,
	compactPromptText,
	encodeHybridRow,
	getCompactNodeType,
} from './ai-hybrid-rows';
import { isAppNode } from './guards/is-app-node';

type NodeContextExtractor = (node: AppNode | NodeData) => string;

type NodeExtractionStrategy = {
	[key in AvailableNodeTypes]?: NodeContextExtractor;
};

export interface ExtractNodeContextOptions {
	aliasMap?: AiIdAliasMap;
}

function formatEmbeddedNodeReference(
	label: string,
	nodeId: string | null | undefined,
	options?: ExtractNodeContextOptions
) {
	const aliasedNodeId = aliasNodeId(nodeId, options?.aliasMap);
	return aliasedNodeId === null ? null : `${label}:${aliasedNodeId}`;
}

export function createNodeContextExtractor(
	strategy: NodeExtractionStrategy,
	defaultExtractor?: NodeContextExtractor,
	options?: ExtractNodeContextOptions
): NodeContextExtractor {
	return (node: NodeData | AppNode): string => {
		let nodeData: NodeData;

		if (isAppNode(node)) {
			nodeData = node.data;
		} else {
			nodeData = node;
		}

		const nodeType = nodeData.node_type as AvailableNodeTypes;

		switch (nodeType) {
			case 'defaultNode':
				return strategy.defaultNode
					? strategy.defaultNode(node)
					: extractDefaultNodeContext(nodeData, options);

			case 'textNode':
				return strategy.textNode
					? strategy.textNode(node)
					: extractTextNodeContext(nodeData, options);

			case 'imageNode':
				return strategy.imageNode
					? strategy.imageNode(node)
					: extractImageNodeContext(nodeData, options);

			case 'resourceNode':
				return strategy.resourceNode
					? strategy.resourceNode(node)
					: extractResourceNodeContext(nodeData, options);

			case 'questionNode':
				return strategy.questionNode
					? strategy.questionNode(node)
					: extractQuestionNodeContext(nodeData, options);

			case 'annotationNode':
				return strategy.annotationNode
					? strategy.annotationNode(node)
					: extractAnnotationNodeContext(nodeData, options);

			case 'codeNode':
				return strategy.codeNode
					? strategy.codeNode(node)
					: extractCodeNodeContext(nodeData, options);

			case 'taskNode':
				return strategy.taskNode
					? strategy.taskNode(node)
					: extractTaskNodeContext(nodeData, options);

			case 'ghostNode':
				return strategy.ghostNode
					? strategy.ghostNode(node)
					: extractGhostNodeContext(nodeData, options);

			default:
				return defaultExtractor
					? defaultExtractor(node)
					: extractDefaultNodeContext(nodeData, options);
		}
	};
}

// Default extraction implementations for each node type
function extractDefaultNodeContext(
	node: NodeData,
	options?: ExtractNodeContextOptions
): string {
	return buildNodeContextRow(node, [
		node?.metadata?.title,
		node?.content,
		node?.importance ? `importance:${node.importance}` : null,
	], options);
}

function extractTextNodeContext(
	node: NodeData,
	options?: ExtractNodeContextOptions
): string {
	return buildNodeContextRow(node, [
		node?.metadata?.label,
		node?.content,
		node?.metadata?.textAlign &&
		node.metadata.textAlign !== 'left'
			? `align:${node.metadata.textAlign}`
			: null,
		node?.metadata?.fontStyle &&
		node.metadata.fontStyle !== 'normal'
			? `style:${node.metadata.fontStyle}`
			: null,
		node?.metadata?.backgroundColor
			? `bg:${node.metadata.backgroundColor}`
			: null,
		node?.metadata?.textColor ? `color:${node.metadata.textColor}` : null,
	], options);
}

function extractImageNodeContext(
	node: NodeData,
	options?: ExtractNodeContextOptions
): string {
	return buildNodeContextRow(node, [
		node?.metadata?.altText,
		node?.metadata?.caption && node?.metadata?.showCaption
			? node.metadata.caption
			: null,
		node?.metadata?.imageUrl ? `image:${node.metadata.imageUrl}` : null,
	], options);
}

function extractResourceNodeContext(
	node: NodeData,
	options?: ExtractNodeContextOptions
): string {
	return buildNodeContextRow(node, [
		node?.metadata?.title,
		node?.metadata?.summary && node?.metadata?.showSummary
			? node.metadata.summary
			: null,
		node?.sourceUrl || node?.metadata?.url
			? `url:${node?.sourceUrl || node?.metadata?.url}`
			: null,
	], options);
}

function extractQuestionNodeContext(
	node: NodeData,
	options?: ExtractNodeContextOptions
): string {
	return buildNodeContextRow(
		node,
		[node?.content, node?.metadata?.answer],
		options
	);
}

function extractAnnotationNodeContext(
	node: NodeData,
	options?: ExtractNodeContextOptions
): string {
	return buildNodeContextRow(node, [
		node?.metadata?.annotationType,
		node?.content,
		formatEmbeddedNodeReference(
			'target',
			node?.metadata?.targetNodeId,
			options
		),
	], options);
}

function extractCodeNodeContext(
	node: NodeData,
	options?: ExtractNodeContextOptions
): string {
	return buildNodeContextRow(node, [
		node?.metadata?.fileName,
		node?.metadata?.language,
		node?.content,
		node?.metadata?.showLineNumbers ? 'lineNumbers:enabled' : null,
	], options);
}

function extractTaskNodeContext(
	node: NodeData,
	options?: ExtractNodeContextOptions
): string {
	const content = node?.content || '';
	const title = node?.metadata?.title || '';
	const status = node?.status || '';
	const dueDate = node?.metadata?.dueDate || '';
	const priority = node?.metadata?.priority || '';
	const tasks = node?.metadata?.tasks || [];

	const completedTasks = tasks.filter((task) => task.isComplete).length;
	const totalTasks = tasks.length;
	const tasksList =
		tasks.length > 0
			? tasks
					.map((task) => `${task.isComplete ? 'done' : 'todo'}:${task.text}`)
					.join(', ')
			: null;

	return buildNodeContextRow(node, [
		title,
		content,
		status ? `status:${status}` : null,
		priority ? `priority:${priority}` : null,
		dueDate ? `due:${dueDate}` : null,
		totalTasks > 0 ? `subtasks:${completedTasks}/${totalTasks}` : null,
		tasksList,
	], options);
}

function extractGhostNodeContext(
	node: NodeData,
	options?: ExtractNodeContextOptions
): string {
	const aliasedSourceNodeId = aliasNodeId(
		node?.metadata?.context?.sourceNodeId,
		options?.aliasMap
	);
	const aliasedTargetNodeId = aliasNodeId(
		node?.metadata?.context?.targetNodeId,
		options?.aliasMap
	);
	const aliasedContext = node?.metadata?.context
		? JSON.stringify({
				...node.metadata.context,
				sourceNodeId: aliasedSourceNodeId,
				targetNodeId: aliasedTargetNodeId,
		  })
		: null;

	return buildNodeContextRow(node, [
		'ghost',
		node?.metadata?.suggestedType
			? `suggestedType:${node.metadata.suggestedType}`
			: null,
		node?.metadata?.suggestedContent,
		typeof node?.metadata?.confidence === 'number'
			? `confidence:${Math.round(node.metadata.confidence * 100)}%`
			: null,
		aliasedContext ? `context:${aliasedContext}` : null,
	], options);
}

// Legacy function - keeping for backward compatibility
export function extractNodeContext(
	node: NodeData,
	options?: ExtractNodeContextOptions
): string {
	const extractor = createNodeContextExtractor({}, undefined, options);
	return extractor(node);
}

// Convenience function to extract context from an array of nodes
export function extractNodesContext(
	nodes: NodeData[],
	options?: ExtractNodeContextOptions
): string[] {
	const extractor = createNodeContextExtractor({}, undefined, options);
	return nodes.map(extractor);
}

// Function to create a summary context from multiple nodes
export function createSummaryContext(
	nodes: NodeData[],
	options?: ExtractNodeContextOptions
): string {
	const contexts = extractNodesContext(nodes, options);
	return contexts.join('\n---\n');
}

function buildNodeContextRow(
	node: NodeData,
	fragments: Array<string | null | undefined>,
	options?: ExtractNodeContextOptions
): string {
	const text = compactPromptText(fragments.filter(Boolean).join(' | '));
	const tags = compactPromptList(node?.metadata?.tags ?? []);
	const nodeId = aliasNodeId(node?.id ?? '', options?.aliasMap);

	return encodeHybridRow('NODE', [
		nodeId ?? (node?.id ?? ''),
		getCompactNodeType(node?.node_type),
		text,
		tags,
	]);
}
