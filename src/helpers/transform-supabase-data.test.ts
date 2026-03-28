import { transformSupabaseData } from './transform-supabase-data';

describe('transformSupabaseData', () => {
	it('normalizes legacy persisted layout directions into supported map state', () => {
		const result = transformSupabaseData({
			map_id: 'map-1',
			user_id: 'user-1',
			title: 'Map',
			description: null,
			tags: null,
			thumbnail_url: null,
			is_template: false,
			template_category: null,
			layout_direction: 'RADIAL',
			created_at: '2026-03-11T00:00:00.000Z',
			map_updated_at: '2026-03-11T00:00:00.000Z',
			nodes: [],
			edges: [],
		});

		expect(result.mindMap.layout_direction).toBe('TOP_BOTTOM');
	});

	it('renders normal persisted edges as waypoint edges by default', () => {
		const result = transformSupabaseData({
			map_id: 'map-1',
			user_id: 'user-1',
			title: 'Map',
			description: null,
			tags: null,
			thumbnail_url: null,
			is_template: false,
			template_category: null,
			layout_direction: 'LEFT_RIGHT',
			created_at: '2026-03-11T00:00:00.000Z',
			map_updated_at: '2026-03-11T00:00:00.000Z',
			nodes: [],
			edges: [
				{
					id: 'edge-1',
					map_id: 'map-1',
					user_id: 'user-1',
					source: 'a',
					target: 'b',
					label: null,
					created_at: '2026-03-11T00:00:00.000Z',
					updated_at: '2026-03-11T00:00:00.000Z',
					animated: false,
					markerEnd: undefined,
					markerStart: undefined,
					style: null,
					metadata: { pathType: 'bezier' },
					aiData: null,
				},
			],
		});

		expect(result.reactFlowEdges[0]?.type).toBe('waypointEdge');
		expect(result.reactFlowEdges[0]?.data?.metadata?.pathType).toBe('waypoint');
	});
});
