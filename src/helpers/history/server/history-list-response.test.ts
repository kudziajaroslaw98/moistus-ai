import { readHistoryActorLabel } from './history-list-response';

describe('readHistoryActorLabel', () => {
	it('reads the recipe or plugin label written by applyGraphOps', () => {
		expect(
			readHistoryActorLabel({ actor: { kind: 'recipe', id: 'r-1', label: ' Pre-mortem ' } })
		).toBe('Pre-mortem');
		expect(
			readHistoryActorLabel({ actor: { kind: 'plugin', id: 'p', label: 'Kanban' } })
		).toBe('Kanban');
	});

	it('ignores user actors, missing or malformed labels', () => {
		expect(readHistoryActorLabel({ actor: { kind: 'user', id: 'u-1' } })).toBeUndefined();
		expect(readHistoryActorLabel({ actor: { kind: 'recipe', id: 'r-1' } })).toBeUndefined();
		expect(
			readHistoryActorLabel({ actor: { kind: 'recipe', id: 'r-1', label: 42 } })
		).toBeUndefined();
		expect(readHistoryActorLabel({ operation: 'add' })).toBeUndefined();
		expect(readHistoryActorLabel(null)).toBeUndefined();
	});

	it('caps long labels', () => {
		expect(
			readHistoryActorLabel({ actor: { kind: 'recipe', id: 'r', label: 'x'.repeat(100) } })
		).toHaveLength(60);
	});
});
