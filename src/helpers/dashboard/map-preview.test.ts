import {
	buildMapPreview,
	MAP_PREVIEW_HEIGHT,
	MAP_PREVIEW_WIDTH,
	type PreviewSourceNode,
} from './map-preview';

const node = (
	id: string,
	x: number,
	y: number,
	extra: Partial<PreviewSourceNode> = {}
): PreviewSourceNode => ({
	id,
	position_x: x,
	position_y: y,
	width: 200,
	height: 60,
	node_type: 'defaultNode',
	...extra,
});

describe('buildMapPreview', () => {
	it('returns an empty preview for a map without nodes', () => {
		expect(buildMapPreview([], [])).toEqual({ nodes: [], edges: [] });
	});

	it('fits every node inside the preview box with padding', () => {
		const preview = buildMapPreview(
			[node('a', 0, 0), node('b', 2000, 0), node('c', 1000, 900)],
			[]
		);

		expect(preview.nodes).toHaveLength(3);

		for (const rect of preview.nodes) {
			expect(rect.x).toBeGreaterThanOrEqual(0);
			expect(rect.y).toBeGreaterThanOrEqual(0);
			expect(rect.x + rect.w).toBeLessThanOrEqual(MAP_PREVIEW_WIDTH);
			expect(rect.y + rect.h).toBeLessThanOrEqual(MAP_PREVIEW_HEIGHT);
		}
	});

	it('keeps the layout aspect ratio instead of stretching it', () => {
		const preview = buildMapPreview([node('a', 0, 0), node('b', 3000, 0)], []);
		const [a, b] = preview.nodes;

		// Same y in flow space must stay the same y in the preview.
		expect(a.y).toBe(b.y);
		expect(b.x).toBeGreaterThan(a.x);
	});

	it('does not blow a single node up to fill the box', () => {
		const preview = buildMapPreview([node('a', 500, 500)], []);
		const [rect] = preview.nodes;

		expect(rect.w).toBeLessThanOrEqual(MAP_PREVIEW_WIDTH / 3);
		// Centered.
		expect(Math.abs(rect.x + rect.w / 2 - MAP_PREVIEW_WIDTH / 2)).toBeLessThanOrEqual(1);
		expect(Math.abs(rect.y + rect.h / 2 - MAP_PREVIEW_HEIGHT / 2)).toBeLessThanOrEqual(1);
	});

	it('falls back to a default size when width or height is missing', () => {
		const preview = buildMapPreview(
			[
				node('a', 0, 0, { width: null, height: null }),
				node('b', 1000, 0),
			],
			[]
		);
		const [a, b] = preview.nodes;

		expect(a.w).toBe(b.w);
		expect(a.h).toBe(b.h);
	});

	it('skips ghost nodes and edges that touch them', () => {
		const preview = buildMapPreview(
			[node('a', 0, 0), node('ghost', 400, 0, { node_type: 'ghostNode' })],
			[{ source: 'a', target: 'ghost' }]
		);

		expect(preview.nodes).toHaveLength(1);
		expect(preview.edges).toEqual([]);
	});

	it('maps edges to node indices and drops duplicates and dangling edges', () => {
		const preview = buildMapPreview(
			[node('a', 0, 0), node('b', 400, 0), node('c', 800, 0)],
			[
				{ source: 'a', target: 'b' },
				{ source: 'a', target: 'b' },
				{ source: 'b', target: 'c' },
				{ source: 'c', target: 'missing' },
				{ source: 'b', target: 'b' },
			]
		);

		expect(preview.edges).toEqual([
			[0, 1],
			[1, 2],
		]);
	});

	it('caps the number of nodes', () => {
		const many = Array.from({ length: 100 }, (_, i) => node(`n${i}`, i * 300, 0));
		const preview = buildMapPreview(many, [], { maxNodes: 40 });

		expect(preview.nodes).toHaveLength(40);
	});

	it('returns whole-number coordinates to keep the payload small', () => {
		const preview = buildMapPreview(
			[node('a', 13.37, 7.1), node('b', 977.7, 431.9)],
			[]
		);

		for (const rect of preview.nodes) {
			for (const value of [rect.x, rect.y, rect.w, rect.h]) {
				expect(Number.isInteger(value)).toBe(true);
			}
		}
	});
});
