import type { AppNode } from '@/types/app-node';
import { pluginCallContext } from './call-context';
import { buildPluginRefs } from './ref-context';

const node = (id: string, data: Record<string, unknown> = {}): AppNode =>
	({
		id,
		type: (data.node_type as string) ?? 'defaultNode',
		position: { x: 0, y: 0 },
		data: { id, node_type: 'defaultNode', content: id, metadata: {}, ...data },
	}) as unknown as AppNode;

describe('buildPluginRefs', () => {
	it('describes only the linked nodes, by id', () => {
		const nodes = [
			node('a', { content: 'Ch. 3\nA letter arrives' }),
			node('b', {
				node_type: 'taskNode',
				metadata: { tasks: [{ isComplete: true }, { isComplete: false }], tags: ['beta'] },
			}),
			node('c'),
		];

		const refs = buildPluginRefs(['a', 'b'], nodes);

		expect(Object.keys(refs)).toEqual(['a', 'b']);
		expect(refs.a).toMatchObject({ type: 'note', text: 'Ch. 3 A letter arrives' });
		expect(refs.b).toMatchObject({ type: 'task', tasks: { done: 1, total: 2 }, tags: ['beta'] });
	});

	it('leaves out deleted nodes and unaccepted AI suggestions, so a plugin can tell', () => {
		const nodes = [node('a'), node('ghost', { node_type: 'ghostNode' })];

		expect(buildPluginRefs(['a', 'gone', 'ghost'], nodes)).toEqual({
			a: expect.objectContaining({ type: 'note' }),
		});
	});

	it('is part of what a plugin is called with, only when it has the power', () => {
		expect(pluginCallContext(true, null, { a: buildPluginRefs(['a'], [node('a')]).a }).refs).toBeDefined();
		expect(pluginCallContext(true)).not.toHaveProperty('refs');
	});
});
