import {
	aliasNodeId,
	createAiIdAliasMap,
	resolveAliasedNodeId,
	resolveAliasedNodeIds,
} from './ai-id-alias-map';

describe('ai id alias map', () => {
	it('assigns deterministic 1-based aliases in first-seen order', () => {
		const aliasMap = createAiIdAliasMap([
			{ id: 'node-a' },
			{ id: 'node-b' },
			{ id: 'node-a' },
			{ id: 'node-c' },
		]);

		expect(aliasMap.nodeIdToAlias.get('node-a')).toBe(1);
		expect(aliasMap.nodeIdToAlias.get('node-b')).toBe(2);
		expect(aliasMap.nodeIdToAlias.get('node-c')).toBe(3);
		expect(aliasMap.aliasToNodeId.get(1)).toBe('node-a');
		expect(aliasMap.aliasToNodeId.get(2)).toBe('node-b');
		expect(aliasMap.aliasToNodeId.get(3)).toBe('node-c');
	});

	it('round-trips node ids through aliasing and resolution', () => {
		const aliasMap = createAiIdAliasMap(['root', 'child']);

		expect(aliasNodeId('root', aliasMap)).toBe(1);
		expect(aliasNodeId('child', aliasMap)).toBe(2);
		expect(resolveAliasedNodeId(1, aliasMap)).toBe('root');
		expect(resolveAliasedNodeId('2', aliasMap)).toBe('child');
		expect(resolveAliasedNodeIds([1, '2'], aliasMap)).toEqual([
			'root',
			'child',
		]);
	});

	it('treats unknown aliases as invalid while preserving known UUIDs', () => {
		const aliasMap = createAiIdAliasMap(['root', 'child']);

		expect(resolveAliasedNodeId(99, aliasMap)).toBeNull();
		expect(resolveAliasedNodeId('not-a-number', aliasMap)).toBeNull();
		expect(resolveAliasedNodeId('root', aliasMap)).toBe('root');
	});
});
