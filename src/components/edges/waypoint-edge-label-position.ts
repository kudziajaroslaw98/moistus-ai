import type { WaypointPathResult } from '@/helpers/get-waypoint-path';
import type { EdgeData } from '@/types/edge-data';

export function resolveWaypointEdgeLabelPosition(
	data: EdgeData | undefined,
	pathResult: Pick<WaypointPathResult, 'labelX' | 'labelY'>
): { labelX: number; labelY: number } {
	const elkLabel = data?.metadata?.elkLabel;
	if (
		data?.metadata?.routingStyle === 'elk' &&
		elkLabel &&
		Number.isFinite(elkLabel.centerX) &&
		Number.isFinite(elkLabel.centerY)
	) {
		return {
			labelX: elkLabel.centerX,
			labelY: elkLabel.centerY,
		};
	}

	return {
		labelX: pathResult.labelX,
		labelY: pathResult.labelY,
	};
}
