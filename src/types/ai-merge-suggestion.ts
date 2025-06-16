export interface AiMergeSuggestion {
	node1Id: string;
	node2Id: string;
	similarityScore?: number;
	reason?: string;
}
