import { ComponentType } from 'react';
import { NodeData } from '@/types/node-data';
import { AnnotationNodeContent } from './annotation-node-content';
import { CodeNodeContent } from './code-node-content';
import { DefaultNodeContent } from './default-node-content';
import { ImageNodeContent } from './image-node-content';
import { QuestionNodeContent } from './question-node-content';
import { ReferenceNodeContent } from './reference-node-content';
import { ResourceNodeContent } from './resource-node-content';
import { TaskNodeContent } from './task-node-content';
import { TextNodeContent } from './text-node-content';

// Re-export all content components
export { AnnotationNodeContent } from './annotation-node-content';
export { CodeNodeContent } from './code-node-content';
export { DefaultNodeContent } from './default-node-content';
export { ImageNodeContent } from './image-node-content';
export { QuestionNodeContent } from './question-node-content';
export { ReferenceNodeContent } from './reference-node-content';
export { ResourceNodeContent } from './resource-node-content';
export { TaskNodeContent } from './task-node-content';
export { TextNodeContent } from './text-node-content';

/**
 * Content component props interface
 */
export interface ContentComponentProps {
	data: NodeData;
}

/**
 * Registry map of node types to their content components.
 * Used by PreviewNodeRenderer to dynamically render the correct content.
 */
export const NODE_CONTENT_MAP: Record<
	string,
	ComponentType<ContentComponentProps>
> = {
	defaultNode: DefaultNodeContent,
	taskNode: TaskNodeContent,
	codeNode: CodeNodeContent,
	imageNode: ImageNodeContent,
	annotationNode: AnnotationNodeContent,
	questionNode: QuestionNodeContent,
	referenceNode: ReferenceNodeContent,
	textNode: TextNodeContent,
	resourceNode: ResourceNodeContent,
};

/**
 * Get the content component for a given node type.
 * Falls back to DefaultNodeContent if type not found.
 */
export function getContentComponent(
	nodeType: string
): ComponentType<ContentComponentProps> {
	return NODE_CONTENT_MAP[nodeType] || DefaultNodeContent;
}
