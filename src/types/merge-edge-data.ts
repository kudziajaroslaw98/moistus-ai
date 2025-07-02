import type { EdgeProps } from '@xyflow/react';
import type { CSSProperties } from 'react';
import type { AiMergeSuggestion } from './ai-merge-suggestion';

export type SuggestedMergeEdgeProps = EdgeProps<MergeEdgeData>;

export interface MergeEdgeData {
	id: string;
	map_id: string;
	user_id: string;
	source: string;
	target: string;
	type: 'suggestedMerge';
	label: string | null;
	created_at: string;
	updated_at: string;
	animated: boolean;
	style?: CSSProperties; // For inline-styles if needed, but prefer Tailwind
	metadata: {
		pathType: 'smoothstep' | 'straight' | 'bezier';
		interactionMode: 'click' | 'hover' | 'both';
	};
	aiData: {
		isSuggested: true;
		suggestion: AiMergeSuggestion;
		confidence: number;
		reason: string;
		similarityScore?: number;
	};
}
