import type { AvailableNodeTypes } from '@/registry/node-registry';
import type { NodeData } from './node-data';

export interface SuggestionContext {
	sourceNodeId?: string | null;
	targetNodeId?: string | null;
	relationshipType?: string | null;
	trigger: 'magic-wand' | 'dangling-edge' | 'auto';
}

export interface SuggestionNodePayload {
	title?: string | null;
	taskTexts?: string[] | null;
	answer?: string | null;
	questionType?: 'binary' | 'multiple' | null;
	annotationType?:
		| 'note'
		| 'idea'
		| 'quote'
		| 'summary'
		| 'warning'
		| 'success'
		| 'info'
		| 'error'
		| null;
	language?: string | null;
	fileName?: string | null;
}

export interface GhostNodeData {
	suggestedContent: string;
	suggestedType: AvailableNodeTypes;
	nodePayload?: SuggestionNodePayload | null;
	confidence: number;
	context?: SuggestionContext;
	sourceNodeName?: string; // Name/content of the node that triggered this suggestion
}

export interface GhostNode extends NodeData {
	type: 'ghostNode';
}

export type SuggestionTrigger = 'magic-wand' | 'dangling-edge' | 'auto';

export const SUGGESTION_EXPLORATION_LENSES = [
	'next-step',
	'risk',
	'constraint',
	'counterpoint',
	'dependency',
	'measurement',
	'user-impact',
	'implementation',
	'adjacent-opportunity',
	'example',
] as const;

export type SuggestionLens =
	(typeof SUGGESTION_EXPLORATION_LENSES)[number];

export interface SuggestionHistoryEntry {
	content: string;
	sourceNodeId: string | null;
	trigger: SuggestionTrigger;
	timestamp: string;
}

export interface SuggestionNoveltyState {
	recentSuggestions: SuggestionHistoryEntry[];
	lensOrder: SuggestionLens[];
	lensIndex: number;
	clickCount: number;
}

export interface NodeSuggestion {
	id: string;
	content: string;
	nodeType: AvailableNodeTypes;
	nodePayload?: SuggestionNodePayload | null;
	confidence: number;
	position: { x: number; y: number };
	context: SuggestionContext;
	reasoning?: string;
	sourceNodeName?: string; // Name/content of the node that triggered this suggestion
	sourceNodeContent?: string; // Full content for tooltip/preview
}
