import { resolveWaypointEdgeLabelPosition } from './waypoint-edge-label-position';

describe('resolveWaypointEdgeLabelPosition', () => {
	it('prefers ELK label coordinates for ELK-routed edges', () => {
		expect(
			resolveWaypointEdgeLabelPosition(
				{
					id: 'edge-1',
					map_id: 'map-1',
					user_id: 'user-1',
					source: 'a',
					target: 'b',
					metadata: {
						routingStyle: 'elk',
						elkLabel: {
							x: 100,
							y: 40,
							width: 84,
							height: 24,
							centerX: 142,
							centerY: 52,
						},
					},
				},
				{ labelX: 10, labelY: 20 }
			)
		).toEqual({ labelX: 142, labelY: 52 });
	});

	it('falls back to midpoint placement for non-ELK edges', () => {
		expect(
			resolveWaypointEdgeLabelPosition(
				{
					id: 'edge-1',
					map_id: 'map-1',
					user_id: 'user-1',
					source: 'a',
					target: 'b',
					metadata: {
						routingStyle: 'orthogonal',
						elkLabel: {
							x: 100,
							y: 40,
							width: 84,
							height: 24,
							centerX: 142,
							centerY: 52,
						},
					},
				},
				{ labelX: 10, labelY: 20 }
			)
		).toEqual({ labelX: 10, labelY: 20 });
	});
});
