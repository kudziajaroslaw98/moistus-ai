import {
	buildTemplateSlug,
	cloneGraphForTemplate,
} from './clone-template-graph';

function sequentialIds() {
	let i = 0;
	return () => `new-${++i}`;
}

describe('cloneGraphForTemplate', () => {
	it('remaps node, parent and edge ids and nulls ownership', () => {
		const result = cloneGraphForTemplate(
			[
				{ id: 'a', parent_id: null, node_type: 'defaultNode', content: 'Root', user_id: 'u1' },
				{ id: 'b', parent_id: 'a', node_type: 'taskNode', content: 'Child', user_id: 'u1' },
			],
			[{ id: 'e1', source: 'a', target: 'b', label: 'has', user_id: 'u1' }],
			'template-1',
			sequentialIds()
		);

		expect(result.nodes).toEqual([
			{ id: 'new-1', parent_id: null, node_type: 'defaultNode', content: 'Root', user_id: null, map_id: 'template-1' },
			{ id: 'new-2', parent_id: 'new-1', node_type: 'taskNode', content: 'Child', user_id: null, map_id: 'template-1' },
		]);
		expect(result.edges).toEqual([
			{ id: 'new-3', source: 'new-1', target: 'new-2', label: 'has', user_id: null, map_id: 'template-1' },
		]);
	});

	it('drops ghost nodes and edges that reference missing nodes', () => {
		const result = cloneGraphForTemplate(
			[
				{ id: 'a', parent_id: null, node_type: 'defaultNode' },
				{ id: 'g', parent_id: 'a', node_type: 'ghostNode' },
				{ id: 'c', parent_id: 'g', node_type: 'defaultNode' },
			],
			[
				{ id: 'e1', source: 'a', target: 'g' },
				{ id: 'e2', source: 'a', target: 'c' },
				{ id: 'e3', source: null, target: 'c' },
			],
			'template-1',
			sequentialIds()
		);

		expect(result.nodes.map((n) => n.id)).toEqual(['new-1', 'new-2']);
		// Parent was a ghost: child becomes a root rather than dangling.
		expect(result.nodes[1].parent_id).toBeNull();
		expect(result.edges).toHaveLength(1);
		expect(result.edges[0]).toMatchObject({ source: 'new-1', target: 'new-2' });
	});
});

describe('buildTemplateSlug', () => {
	it('slugifies titles with a suffix', () => {
		expect(buildTemplateSlug('  Product Roadmap — Q4!  ', 'ab12')).toBe(
			'product-roadmap-q4-ab12'
		);
		expect(buildTemplateSlug('Café Ideas', 'x')).toBe('cafe-ideas-x');
	});

	it('falls back when nothing slug-safe remains', () => {
		expect(buildTemplateSlug('!!!', 'x')).toBe('template-x');
	});
});
