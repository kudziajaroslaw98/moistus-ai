import { AppNode } from '@/types/app-node';
import { AvailableNodeTypes } from '@/types/available-node-types';

type NodeContextExtractor = (node: AppNode) => string;

type NodeExtractionStrategy = {
	[K in AvailableNodeTypes]?: NodeContextExtractor;
};

export function createNodeContextExtractor(
	strategy: NodeExtractionStrategy,
	defaultExtractor?: NodeContextExtractor
): NodeContextExtractor {
	return (node: AppNode): string => {
		const nodeType = node.type as AvailableNodeTypes;

		switch (nodeType) {
			case 'defaultNode':
				return strategy.defaultNode
					? strategy.defaultNode(node)
					: extractDefaultNodeContext(node);

			case 'textNode':
				return strategy.textNode
					? strategy.textNode(node)
					: extractTextNodeContext(node);

			case 'imageNode':
				return strategy.imageNode
					? strategy.imageNode(node)
					: extractImageNodeContext(node);

			case 'resourceNode':
				return strategy.resourceNode
					? strategy.resourceNode(node)
					: extractResourceNodeContext(node);

			case 'questionNode':
				return strategy.questionNode
					? strategy.questionNode(node)
					: extractQuestionNodeContext(node);

			case 'annotationNode':
				return strategy.annotationNode
					? strategy.annotationNode(node)
					: extractAnnotationNodeContext(node);

			case 'codeNode':
				return strategy.codeNode
					? strategy.codeNode(node)
					: extractCodeNodeContext(node);

			case 'taskNode':
				return strategy.taskNode
					? strategy.taskNode(node)
					: extractTaskNodeContext(node);

			case 'builderNode':
				return strategy.builderNode
					? strategy.builderNode(node)
					: extractBuilderNodeContext(node);

			case 'ghostNode':
				return strategy.ghostNode
					? strategy.ghostNode(node)
					: extractGhostNodeContext(node);

			default:
				return defaultExtractor
					? defaultExtractor(node)
					: extractDefaultNodeContext(node);
		}
	};
}

// Default extraction implementations for each node type
function extractDefaultNodeContext(node: AppNode): string {
	const content = node.data?.content || '';
	const title = node.data?.metadata?.title || '';
	const tags = node.data?.tags?.join(', ') || '';

	const parts = [
		`ID: ${node.data?.id}`,
		title && `Title: ${title}`,
		content && `Content: ${content}`,
		tags && `Tags: ${tags}`,
		node.data?.importance && `Importance: ${node.data.importance}`,
	].filter(Boolean);

	return parts.join(' | ');
}

function extractTextNodeContext(node: AppNode): string {
	const content = node.data?.content || '';
	const label = node.data?.metadata?.label || '';
	const textAlign = node.data?.metadata?.textAlign || '';
	const fontStyle = node.data?.metadata?.fontStyle || '';
	const backgroundColor = node.data?.metadata?.backgroundColor || '';
	const textColor = node.data?.metadata?.textColor || '';

	const parts = [
		`ID: ${node.data?.id}`,
		label && `Label: ${label}`,
		content && `Text: ${content}`,
		textAlign && textAlign !== 'left' && `Alignment: ${textAlign}`,
		fontStyle && fontStyle !== 'normal' && `Style: ${fontStyle}`,
		backgroundColor && `Background: ${backgroundColor}`,
		textColor && `Color: ${textColor}`,
	].filter(Boolean);

	return parts.join(' | ');
}

function extractImageNodeContext(node: AppNode): string {
	const imageUrl =
		node.data?.metadata?.imageUrl || node.data?.metadata?.image_url || '';
	const altText = node.data?.metadata?.altText || '';
	const caption = node.data?.metadata?.caption || '';
	const showCaption = node.data?.metadata?.showCaption;

	const parts = [
		`ID: ${node.data?.id}`,
		imageUrl && `Image URL: ${imageUrl}`,
		altText && `Alt Text: ${altText}`,
		caption && showCaption && `Caption: ${caption}`,
	].filter(Boolean);

	return parts.join(' | ');
}

function extractResourceNodeContext(node: AppNode): string {
	const url = node.data?.sourceUrl || node.data?.metadata?.url || '';
	const title = node.data?.metadata?.title || '';
	const summary = node.data?.metadata?.summary || '';
	const showSummary = node.data?.metadata?.showSummary;

	const parts = [
		`ID: ${node.data?.id}`,
		title && `Resource: ${title}`,
		url && `URL: ${url}`,
		summary && showSummary && `Summary: ${summary}`,
	].filter(Boolean);

	return parts.join(' | ');
}

function extractQuestionNodeContext(node: AppNode): string {
	const content = node.data?.content || '';
	const answer = node.data?.metadata?.answer || '';
	const aiAnswer = node.data?.aiData?.aiAnswer || '';

	const parts = [
		`ID: ${node.data?.id}`,
		content && `Question: ${content}`,
		answer && `Answer: ${answer}`,
		aiAnswer && `AI Answer: ${aiAnswer}`,
	].filter(Boolean);

	return parts.join(' | ');
}

function extractAnnotationNodeContext(node: AppNode): string {
	const content = node.data?.content || '';
	const annotationType = node.data?.metadata?.annotationType || '';
	const targetNodeId = node.data?.metadata?.targetNodeId || '';

	const parts = [
		`ID: ${node.data?.id}`,
		annotationType && `Type: ${annotationType}`,
		content && `Annotation: ${content}`,
		targetNodeId && `Target: ${targetNodeId}`,
	].filter(Boolean);

	return parts.join(' | ');
}

function extractCodeNodeContext(node: AppNode): string {
	const content = node.data?.content || '';
	const language = node.data?.metadata?.language || '';
	const fileName = node.data?.metadata?.fileName || '';
	const showLineNumbers = node.data?.metadata?.showLineNumbers;

	const parts = [
		`ID: ${node.data?.id}`,
		fileName && `File: ${fileName}`,
		language && `Language: ${language}`,
		content && `Code: ${content}`,
		showLineNumbers && 'Line Numbers: enabled',
	].filter(Boolean);

	return parts.join(' | ');
}

function extractTaskNodeContext(node: AppNode): string {
	const content = node.data?.content || '';
	const title = node.data?.metadata?.title || '';
	const status = node.data?.status || '';
	const dueDate = node.data?.metadata?.dueDate || '';
	const priority = node.data?.metadata?.priority || '';
	const tasks = node.data?.metadata?.tasks || [];

	const completedTasks = tasks.filter((task) => task.isComplete).length;
	const totalTasks = tasks.length;

	const parts = [
		`ID: ${node.data?.id}`,
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

function extractBuilderNodeContext(node: AppNode): string {
	const builderData = node.data?.metadata?.builderData;
	const content = node.data?.content || '';

	const parts = [
		`ID: ${node.data?.id}`,
		'Builder Node',
		content && `Content: ${content}`,
		builderData && 'Has builder configuration',
	].filter(Boolean);

	return parts.join(' | ');
}

function extractGhostNodeContext(node: AppNode): string {
	const suggestedContent = node.data?.metadata?.suggestedContent || '';
	const suggestedType = node.data?.metadata?.suggestedType || '';
	const confidence = node.data?.metadata?.confidence || 0;
	const context = node.data?.metadata?.context;

	const parts = [
		`ID: ${node.data?.id}`,
		'Ghost Node (AI Suggestion)',
		suggestedType && `Suggested Type: ${suggestedType}`,
		suggestedContent && `Suggested Content: ${suggestedContent}`,
		confidence > 0 && `Confidence: ${Math.round(confidence * 100)}%`,
		context && `Context: ${JSON.stringify(context)}`,
	].filter(Boolean);

	return parts.join(' | ');
}

// Legacy function - keeping for backward compatibility
export function extractNodeContext(node: AppNode): string {
	const extractor = createNodeContextExtractor({});
	return extractor(node);
}

// Convenience function to extract context from an array of nodes
export function extractNodesContext(nodes: AppNode[]): string[] {
	const extractor = createNodeContextExtractor({});
	return nodes.map(extractor);
}

// Function to create a summary context from multiple nodes
export function createSummaryContext(nodes: AppNode[]): string {
	const contexts = extractNodesContext(nodes);
	return contexts.join('\n---\n');
}
