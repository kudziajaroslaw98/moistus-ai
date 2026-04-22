import { createAiIdAliasMap } from '@/helpers/ai-id-alias-map';
import { processMergeSuggestionElement } from './ai-merge-postprocess';

describe('ai-merge-postprocess', () => {
	it('remaps aliased ids and suppresses duplicate pairs after remap', () => {
		const aliasMap = createAiIdAliasMap([
			{ id: 'node-1' },
			{ id: 'node-2' },
			{ id: 'node-3' },
		]);
		const validNodeIds = new Set(['node-1', 'node-2', 'node-3']);
		const processedPairs = new Set<string>();

		expect(
			processMergeSuggestionElement({
				element: {
					node1Id: 1,
					node2Id: 2,
					reason: 'Overlap',
					similarityScore: 0.92,
					confidence: 0.88,
				},
				aliasMap,
				validNodeIds,
				processedPairs,
			})
		).toEqual({
			node1Id: 'node-1',
			node2Id: 'node-2',
			reason: 'Overlap',
			similarityScore: 0.92,
			confidence: 0.88,
		});

		expect(
			processMergeSuggestionElement({
				element: {
					node1Id: 2,
					node2Id: 1,
					reason: 'Same overlap',
					similarityScore: 0.91,
					confidence: 0.86,
				},
				aliasMap,
				validNodeIds,
				processedPairs,
			})
		).toBeNull();
	});

	it('rejects self-merges and unknown node ids', () => {
		const aliasMap = createAiIdAliasMap([{ id: 'node-1' }, { id: 'node-2' }]);
		const validNodeIds = new Set(['node-1', 'node-2']);

		expect(
			processMergeSuggestionElement({
				element: {
					node1Id: 1,
					node2Id: 1,
					reason: 'Self',
					similarityScore: 0.99,
					confidence: 0.99,
				},
				aliasMap,
				validNodeIds,
				processedPairs: new Set<string>(),
			})
		).toBeNull();

		expect(
			processMergeSuggestionElement({
				element: {
					node1Id: 1,
					node2Id: 99,
					reason: 'Unknown',
					similarityScore: 0.9,
					confidence: 0.9,
				},
				aliasMap,
				validNodeIds,
				processedPairs: new Set<string>(),
			})
		).toBeNull();
	});
});
