import type { AppNode } from '@/types/app-node';
import type { NodeData } from '@/types/node-data';
import { nanoid } from 'nanoid';
import type { NodeCommand, NodeCreationResult } from './types';

interface CreateNodeOptions {
  command: NodeCommand;
  data: any;
  position: { x: number; y: number };
  parentNode: AppNode | null;
  addNode: (node: Omit<AppNode, 'id'>, parentNodeId?: string | null) => Promise<string>;
}

export const createNodeFromCommand = async ({
  command,
  data,
  position,
  parentNode,
  addNode,
}: CreateNodeOptions): Promise<NodeCreationResult> => {
  try {
    // Transform parsed data into node-specific data structure
    const nodeData = transformDataForNodeType(command.nodeType, data);

    // Create base node structure
    const newNode: Omit<AppNode, 'id'> = {
      type: command.nodeType,
      position,
      data: {
        ...nodeData,
        node_type: command.nodeType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    // Add node to the graph
    const nodeId = await addNode(newNode, parentNode?.id || null);

    return {
      success: true,
      nodeId,
    };
  } catch (error) {
    console.error('Error creating node:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create node',
    };
  }
};

// Transform parsed data based on node type
const transformDataForNodeType = (nodeType: string, data: any): Partial<NodeData> => {
  switch (nodeType) {
    case 'defaultNode':
      return {
        content: data.content || '',
        tags: data.tags || [],
        priority: data.priority,
      };

    case 'taskNode':
      return {
        tasks: data.tasks || [],
        dueDate: data.dueDate?.toISOString(),
        priority: data.priority,
        assignee: data.assignee,
        tags: data.tags || [],
      };

    case 'codeNode':
      return {
        language: data.language || 'plaintext',
        code: data.code || '',
        filename: data.filename,
        lineNumbers: data.lineNumbers !== false,
      };

    case 'imageNode':
      return {
        url: data.url || '',
        alt: data.alt || '',
        caption: data.caption || '',
        source: data.source,
      };

    case 'resourceNode':
      return {
        url: data.url || '',
        title: data.title || '',
        description: data.description || '',
        resourceType: data.type || 'link',
      };

    case 'annotationNode':
      return {
        text: data.text || '',
        annotationType: data.type || 'note',
        icon: data.icon,
      };

    case 'questionNode':
      return {
        question: data.question || '',
        answer: data.answer || '',
        questionType: data.type || 'open',
        options: data.options || [],
      };

    case 'textNode':
      return {
        content: data.content || '',
      };

    default:
      return {
        content: JSON.stringify(data),
      };
  }
};

// Helper to generate child position
export const getChildPosition = (
  parentNode: AppNode,
  siblingCount: number = 0
): { x: number; y: number } => {
  const VERTICAL_SPACING = 120;
  const HORIZONTAL_SPACING = 200;

  return {
    x: parentNode.position.x + (siblingCount % 3) * HORIZONTAL_SPACING - HORIZONTAL_SPACING,
    y: parentNode.position.y + (parentNode.height || 100) + VERTICAL_SPACING,
  };
};

// Helper to validate node data
export const validateNodeData = (
  nodeType: string,
  data: any
): { isValid: boolean; error?: string } => {
  switch (nodeType) {
    case 'taskNode':
      if (!data.tasks || data.tasks.length === 0) {
        return { isValid: false, error: 'At least one task is required' };
      }

      break;

    case 'codeNode':
      if (!data.code || data.code.trim() === '') {
        return { isValid: false, error: 'Code content is required' };
      }

      break;

    case 'imageNode':
      if (!data.url || data.url.trim() === '') {
        return { isValid: false, error: 'Image URL is required' };
      }

      try {
        new URL(data.url);
      } catch {
        return { isValid: false, error: 'Invalid image URL' };
      }

      break;

    case 'resourceNode':
      if (!data.url || data.url.trim() === '') {
        return { isValid: false, error: 'Resource URL is required' };
      }

      try {
        new URL(data.url);
      } catch {
        return { isValid: false, error: 'Invalid resource URL' };
      }

      break;

    case 'questionNode':
      if (!data.question || data.question.trim() === '') {
        return { isValid: false, error: 'Question is required' };
      }

      break;

    case 'annotationNode':
      if (!data.text || data.text.trim() === '') {
        return { isValid: false, error: 'Annotation text is required' };
      }

      break;

    default:
      if (!data.content || data.content.trim() === '') {
        return { isValid: false, error: 'Content is required' };
      }
  }

  return { isValid: true };
};
