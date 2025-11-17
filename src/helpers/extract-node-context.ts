import type { AvailableNodeTypes } from '@/registry/node-registry';
import type { AppNode } from '@/types/app-node';
import type { NodeData } from '@/types/node-data';
import { isAppNode } from './guards/is-app-node';

type NodeContextExtractor = (node: AppNode | NodeData) => string;

type NodeExtractionStrategy = {
	[key in AvailableNodeTypes]?: NodeContextExtractor;
};

export function createNodeContextExtractor(
	strategy: NodeExtractionStrategy,
	defaultExtractor?: NodeContextExtractor
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
					: extractDefaultNodeContext(nodeData);

			case 'textNode':
				return strategy.textNode
					? strategy.textNode(node)
					: extractTextNodeContext(nodeData);

			case 'imageNode':
				return strategy.imageNode
					? strategy.imageNode(node)
					: extractImageNodeContext(nodeData);

			case 'resourceNode':
				return strategy.resourceNode
					? strategy.resourceNode(node)
					: extractResourceNodeContext(nodeData);

			case 'questionNode':
				return strategy.questionNode
					? strategy.questionNode(node)
					: extractQuestionNodeContext(nodeData);

			case 'annotationNode':
				return strategy.annotationNode
					? strategy.annotationNode(node)
					: extractAnnotationNodeContext(nodeData);

			case 'codeNode':
				return strategy.codeNode
					? strategy.codeNode(node)
					: extractCodeNodeContext(nodeData);

			case 'taskNode':
				return strategy.taskNode
					? strategy.taskNode(node)
					: extractTaskNodeContext(nodeData);

			case 'ghostNode':
				return strategy.ghostNode
					? strategy.ghostNode(node)
					: extractGhostNodeContext(nodeData);

			default:
				return defaultExtractor
					? defaultExtractor(node)
					: extractDefaultNodeContext(nodeData);
		}
	};
}

// Default extraction implementations for each node type
function extractDefaultNodeContext(node: NodeData): string {
	const content = node?.content || '';
	const title = node?.metadata?.title || '';
	const tags = node?.metadata?.tags?.join(', ') || '';

	const parts = [
		`ID: ${node?.id}`,
		title && `Title: ${title}`,
		content && `Content: ${content}`,
		tags && `Tags: ${tags}`,
		node?.importance && `Importance: ${node.importance}`,
	].filter(Boolean);

	return parts.join(' | ');
}

function extractTextNodeContext(node: NodeData): string {
	const content = node?.content || '';
	const label = node?.metadata?.label || '';
	const textAlign = node?.metadata?.textAlign || '';
	const fontStyle = node?.metadata?.fontStyle || '';
	const backgroundColor = node?.metadata?.backgroundColor || '';
	const textColor = node?.metadata?.textColor || '';

	const parts = [
		`ID: ${node?.id}`,
		label && `Label: ${label}`,
		content && `Text: ${content}`,
		textAlign && textAlign !== 'left' && `Alignment: ${textAlign}`,
		fontStyle && fontStyle !== 'normal' && `Style: ${fontStyle}`,
		backgroundColor && `Background: ${backgroundColor}`,
		textColor && `Color: ${textColor}`,
	].filter(Boolean);

	return parts.join(' | ');
}

function extractImageNodeContext(node: NodeData): string {
	const imageUrl = node?.metadata?.imageUrl || '';
	const altText = node?.metadata?.altText || '';
	const caption = node?.metadata?.caption || '';
	const showCaption = node?.metadata?.showCaption;

	const parts = [
		`ID: ${node?.id}`,
		imageUrl && `Image URL: ${imageUrl}`,
		altText && `Alt Text: ${altText}`,
		caption && showCaption && `Caption: ${caption}`,
	].filter(Boolean);

	return parts.join(' | ');
}

function extractResourceNodeContext(node: NodeData): string {
	const url = node?.sourceUrl || node?.metadata?.url || '';
	const title = node?.metadata?.title || '';
	const summary = node?.metadata?.summary || '';
	const showSummary = node?.metadata?.showSummary;

	const parts = [
		`ID: ${node?.id}`,
		title && `Resource: ${title}`,
		url && `URL: ${url}`,
		summary && showSummary && `Summary: ${summary}`,
	].filter(Boolean);

	return parts.join(' | ');
}

function extractQuestionNodeContext(node: NodeData): string {
	const content = node?.content || '';
	const answer = node?.metadata?.answer || '';

	const parts = [
		`ID: ${node?.id}`,
		content && `Question: ${content}`,
		answer && `Answer: ${answer}`,
	].filter(Boolean);

	return parts.join(' | ');
}

function extractAnnotationNodeContext(node: NodeData): string {
	const content = node?.content || '';
	const annotationType = node?.metadata?.annotationType || '';
	const targetNodeId = node?.metadata?.targetNodeId || '';

	const parts = [
		`ID: ${node?.id}`,
		annotationType && `Type: ${annotationType}`,
		content && `Annotation: ${content}`,
		targetNodeId && `Target: ${targetNodeId}`,
	].filter(Boolean);

	return parts.join(' | ');
}

function extractCodeNodeContext(node: NodeData): string {
	const content = node?.content || '';
	const language = node?.metadata?.language || '';
	const fileName = node?.metadata?.fileName || '';
	const showLineNumbers = node?.metadata?.showLineNumbers;

	const parts = [
		`ID: ${node?.id}`,
		fileName && `File: ${fileName}`,
		language && `Language: ${language}`,
		content && `Code: ${content}`,
		showLineNumbers && 'Line Numbers: enabled',
	].filter(Boolean);

	return parts.join(' | ');
}

function extractTaskNodeContext(node: NodeData): string {
	const content = node?.content || '';
	const title = node?.metadata?.title || '';
	const status = node?.status || '';
	const dueDate = node?.metadata?.dueDate || '';
	const priority = node?.metadata?.priority || '';
	const tasks = node?.metadata?.tasks || [];

	const completedTasks = tasks.filter((task) => task.isComplete).length;
	const totalTasks = tasks.length;

	const parts = [
		`ID: ${node?.id}`,
		title && `Task: ${title}`,
		content && `Description: ${content}`,
		status && `Status: ${status}`,
		priority && `Priority: ${priority}`,
		dueDate && `Due: ${dueDate}`,
		totalTasks > 0 && `Subtasks: ${completedTasks}/${totalTasks}`,
	].filter(Boolean);

	// Add individual tasks if they exist
	if (tasks.length > 0) {
		const tasksList = tasks
			.map((task) => `${task.isComplete ? '✓' : '○'} ${task.text}`)
			.join(', ');
		parts.push(`Tasks: ${tasksList}`);
	}

	return parts.join(' | ');
}

function extractGhostNodeContext(node: NodeData): string {
	const suggestedContent = node?.metadata?.suggestedContent || '';
	const suggestedType = node?.metadata?.suggestedType || '';
	const confidence = node?.metadata?.confidence || 0;
	const context = node?.metadata?.context;

	const parts = [
		`ID: ${node?.id}`,
		'Ghost Node (AI Suggestion)',
		suggestedType && `Suggested Type: ${suggestedType}`,
		suggestedContent && `Suggested Content: ${suggestedContent}`,
		confidence > 0 && `Confidence: ${Math.round(confidence * 100)}%`,
		context && `Context: ${JSON.stringify(context)}`,
	].filter(Boolean);

	return parts.join(' | ');
}

// Legacy function - keeping for backward compatibility
export function extractNodeContext(node: NodeData): string {
	const extractor = createNodeContextExtractor({});
	return extractor(node);
}

// Convenience function to extract context from an array of nodes
export function extractNodesContext(nodes: NodeData[]): string[] {
	const extractor = createNodeContextExtractor({});
	return nodes.map(extractor);
}

// Function to create a summary context from multiple nodes
export function createSummaryContext(nodes: NodeData[]): string {
	const contexts = extractNodesContext(nodes);
	return contexts.join('\n---\n');
}
