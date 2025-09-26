import AnnotationNode from '@/components/nodes/annotation-node';
import CodeNode from '@/components/nodes/code-node';
import DefaultNode from '@/components/nodes/default-node';
import GroupNode from '@/components/nodes/group-node';
import ImageNode from '@/components/nodes/image-node';
import QuestionNode from '@/components/nodes/question-node';
import ReferenceNode from '@/components/nodes/reference-node';
import ResourceNode from '@/components/nodes/resource-node';
import TaskNode from '@/components/nodes/task-node';
import TextNode from '@/components/nodes/text-node'; // Import the new TextNode

export type NodeTypes = keyof typeof nodeTypes;
export const nodeTypes = {
	defaultNode: DefaultNode, // Note Node
	taskNode: TaskNode,
	imageNode: ImageNode,
	questionNode: QuestionNode,
	resourceNode: ResourceNode,
	annotationNode: AnnotationNode,
	groupNode: GroupNode,
	codeNode: CodeNode,
	textNode: TextNode, // Add the new TextNode
	referenceNode: ReferenceNode,
};

import { NodeData } from '@/types/node-data';

interface NodeTypeConfig {
	label: string;
	defaultMetadata: Partial<NodeData['metadata']>;
}

export const nodeTypesConfig: Record<string, NodeTypeConfig> = {
	defaultNode: {
		label: 'Note',
		defaultMetadata: {},
	},
	textNode: {
		label: 'Text',
		defaultMetadata: {
			fontSize: '14px',
			textAlign: 'left',
			showBackground: false,
			backgroundColor: '#3f3f46',
			textColor: '#fafafa',
		},
	},
	imageNode: {
		label: 'Image',
		defaultMetadata: {
			imageUrl: '',
			altText: '',
			caption: '',
			showCaption: true,
		},
	},
	resourceNode: {
		label: 'Resource',
		defaultMetadata: {
			url: '',
			faviconUrl: '',
			thumbnailUrl: '',
			summary: '',
			showThumbnail: true,
			showSummary: true,
		},
	},
	questionNode: {
		label: 'Question',
		defaultMetadata: {
			answer: '', // AI-generated answer (kept for backward compatibility)
			questionType: 'binary' as 'binary' | 'multiple',
			responseFormat: {
				options: [],
				allowMultiple: false,
			},
			responses: [],
			source: undefined as string | undefined,
		},
	},
	annotationNode: {
		label: 'Annotation',
		defaultMetadata: {
			annotationType: 'comment',
			fontSize: '12px',
			fontWeight: 400,
		},
	},
	codeNode: {
		label: 'Code Snippet',
		defaultMetadata: {
			language: 'javascript',
			showLineNumbers: true,
			fileName: '',
		},
	},
	taskNode: {
		label: 'Task',
		defaultMetadata: {
			tasks: [],
			dueDate: undefined,
			priority: undefined,
		},
	},
	groupNode: {
		label: 'Group',
		defaultMetadata: {
			isGroup: true,
			groupChildren: [],
			backgroundColor: 'rgba(113, 113, 122, 0.1)',
			borderColor: '#52525b',
			label: 'Group',
			groupPadding: 40,
		},
	},
	referenceNode: {
		label: 'Reference',
		defaultMetadata: {
			targetMapId: undefined, // UUID of the map being referenced
			targetNodeId: undefined, // UUID of the node being referenced
			targetMapTitle: 'Untitled Map', // Title of the map for display
			contentSnippet: 'No content', // Snippet of the referenced node's content
		},
	},
};
