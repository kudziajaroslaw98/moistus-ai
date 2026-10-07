import type { AppEdge } from '@/types/app-edge';
import type { AppNode } from '@/types/app-node';
import { buildPluginBranch } from './branch-context';

const node = (id: string, data: Record<string, unknown> = {}): AppNode =>
	({
		id,
		type: (data.node_type as string) ?? 'defaultNode',
		position: { x: 0, y: 0 },
		data: { id, node_type: 'defaultNode', content: id, metadata: {}, ...data },
	}) as unknown as AppNode;

const edge = (
	source: string,
	target: string,
	extra: Record<string, unknown> = {}
): AppEdge =>
	({
		id: `${source}-${target}`,
		source,
		target,
		data: {},
		...extra,
	}) as unknown as AppEdge;

describe('buildPluginBranch', () => {
	it('lists the nodes under the root, depth first, with tasks, people, dates and tags', () => {
		const nodes = [
			node('root'),
			node('launch', {
				node_type: 'taskNode',
				metadata: {
					title: 'Launch',
					tasks: [{ isComplete: true }, { isComplete: false }],
					assignee: ['ana'],
					dueDate: new Date(2026, 10, 12).toISOString(),
					tags: ['beta'],
					priority: 'high',
				},
			}),
			node('copy'),
			node('elsewhere'),
		];
		const edges = [
			edge('root', 'launch'),
			edge('launch', 'copy'),
			edge('elsewhere', 'root'),
		];

		expect(buildPluginBranch('root', nodes, edges)).toEqual([
			{
				id: 'launch',
				depth: 1,
				type: 'task',
				text: 'Launch',
				tasks: { done: 1, total: 2 },
				status: null,
				priority: 'high',
				assignees: ['ana'],
				due: '2026-11-12',
				tags: ['beta'],
			},
			expect.objectContaining({
				id: 'copy',
				depth: 2,
				type: 'note',
				text: 'copy',
			}),
		]);
	});

	it('survives cycles and ignores AI suggestion edges', () => {
		const nodes = [node('a'), node('b'), node('ghost')];
		const edges = [
			edge('a', 'b'),
			edge('b', 'a'),
			edge('a', 'ghost', { data: { aiData: { isSuggested: true } } }),
		];
		expect(
			buildPluginBranch('a', nodes, edges).map((entry) => entry.id)
		).toEqual(['b']);
	});
});
