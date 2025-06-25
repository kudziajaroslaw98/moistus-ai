import type { AvailableNodeTypes } from './available-node-types';
import { NodeData } from './node-data';

export interface SuggestionContext {
	sourceNodeId?: string;
	targetNodeId?: string;
	relationshipType?: string;
	trigger: 'magic-wand' | 'dangling-edge' | 'auto';
}

export interface GhostNodeData {
	suggestedContent: string;
	suggestedType: AvailableNodeTypes;
	confidence: number;
	context?: SuggestionContext;
}

export interface GhostNode extends NodeData {
	type: 'ghostNode';
}

export type SuggestionTrigger = 'magic-wand' | 'dangling-edge' | 'auto';

export interface NodeSuggestion {
	id: string;
	content: string;
	nodeType: AvailableNodeTypes;
	confidence: number;
	position: { x: number; y: number };
	context: SuggestionContext;
	reasoning?: string;
}
