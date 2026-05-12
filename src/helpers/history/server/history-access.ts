import type { HistoryServerClient } from './history-client-types';

export interface HistoryAccessResult {
	ok: boolean;
	status: number;
	error?: string;
	map?: {
		id: string;
		user_id: string;
	};
}

export async function verifyHistoryReadAccess(
	supabase: HistoryServerClient,
	mapId: string,
	userId: string
): Promise<HistoryAccessResult> {
	const { data: map, error: mapError } = await supabase
		.from('mind_maps')
		.select('id, user_id')
		.eq('id', mapId)
		.single();

	if (mapError) {
		console.error('history/access: map fetch error', mapError);
	}

	if (!map) {
		return { ok: false, status: 404, error: 'Map not found' };
	}

	const { data: share, error: shareError } = await supabase
		.from('share_access')
		.select('id')
		.eq('map_id', mapId)
		.eq('user_id', userId)
		.eq('status', 'active')
		.limit(1)
		.maybeSingle();

	if (shareError && shareError.code !== 'PGRST116') {
		console.warn('history/access: share fetch warning', shareError);
	}

	if (map.user_id !== userId && !share) {
		return { ok: false, status: 403, error: 'Access denied', map };
	}

	return { ok: true, status: 200, map };
}

export async function verifyManualCheckpointAccess(
	supabase: HistoryServerClient,
	mapId: string,
	userId: string
): Promise<HistoryAccessResult> {
	const { data: map, error: mapError } = await supabase
		.from('mind_maps')
		.select('id, user_id')
		.eq('id', mapId)
		.single();

	if (mapError) {
		console.error('history/access: checkpoint map fetch error', mapError);
	}

	if (!map || map.user_id !== userId) {
		return { ok: false, status: 404, error: 'Map not found or access denied' };
	}

	const { data: subscription, error: subscriptionError } = await supabase
		.from('user_subscriptions')
		.select('status')
		.eq('user_id', userId)
		.in('status', ['active', 'trialing'])
		.limit(1)
		.single();

	if (subscriptionError && subscriptionError.code !== 'PGRST116') {
		console.error('history/access: subscription fetch error', subscriptionError);
		return { ok: false, status: 500, error: 'Internal server error', map };
	}

	if (!subscription) {
		return { ok: false, status: 403, error: 'Manual checkpoints are Pro-only', map };
	}

	return { ok: true, status: 200, map };
}
