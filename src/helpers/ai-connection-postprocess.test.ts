import { normalizeConnectionSuggestionElement } from './ai-connection-postprocess';

describe('ai-connection-postprocess', () => {
	it('returns parsed connection suggestions when the element matches the schema', () => {
		expect(
			normalizeConnectionSuggestionElement({
				id: 'conn-1',
				sourceNodeId: 'node-1',
				targetNodeId: 'node-2',
				label: 'depends on',
				reason: 'The implementation task depends on the prerequisite.',
				confidence: 0.91,
				relationshipType: 'depends-on',
				metadata: {
					strength: 'strong',
					bidirectional: false,
					contextualRelevance: 0.87,
				},
			})
		).toEqual({
			id: 'conn-1',
			sourceNodeId: 'node-1',
			targetNodeId: 'node-2',
			label: 'depends on',
			reason: 'The implementation task depends on the prerequisite.',
			confidence: 0.91,
			relationshipType: 'depends-on',
			metadata: {
				strength: 'strong',
				bidirectional: false,
				contextualRelevance: 0.87,
			},
		});
	});

	it('drops invalid connection suggestions', () => {
		expect(
			normalizeConnectionSuggestionElement({
				id: 'conn-1',
				sourceNodeId: 'node-1',
				targetNodeId: 'node-2',
				confidence: 2,
			})
		).toBeNull();
	});
});
