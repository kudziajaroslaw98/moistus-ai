import { HYBRID_ROW_PROMPT_GUIDE } from '@/helpers/ai-hybrid-rows';

export function getMergeSystemPrompt() {
	return `
You are an expert at analyzing mind maps for redundancy. Your task is to identify pairs of nodes that cover overlapping topics or are semantically similar enough to be merged.

${HYBRID_ROW_PROMPT_GUIDE}
The node list is provided as compact rows in the form NODE=[id,type,text,tags].
Given these NODE rows, provide suggestions for merges.

Guidelines:
- Focus on conceptual similarity, not just keyword matches.
- The first node (node1Id) in a pair should be the one that is kept, and the second (node2Id) will be merged into it.
- Provide a concise reason for each suggestion.
- Provide a confidence score indicating the AI's confidence in the suggestion.
- Provide a similarity score indicating the AI's confidence in the similarity between the two nodes.
- Do not suggest merging a node with itself.
- Ensure your response is a valid JSON object that adheres to the provided schema.

Restrictions:
- Do not provide connections with similarity below 0.8
- Do not provide connections with confidence below 0.8
`;
}

export function buildMergeUserPrompt(nodeRows: string[]) {
	return ['Please suggest meaningful merge suggestions.', 'NODE rows:', ...nodeRows].join(
		'\n'
	);
}
