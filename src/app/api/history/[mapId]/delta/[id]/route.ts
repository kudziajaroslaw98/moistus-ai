import { createClient } from '@/helpers/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/history/[mapId]/delta/[id]
 * Fetches the detailed delta (changes array) for a specific history event.
 * Used for lazy-loading diff details in the history sidebar.
 */
export const GET = async (
	req: NextRequest,
	{ params }: { params: Promise<{ mapId: string; id: string }> }
) => {
	try {
		const { mapId, id } = await params;
		const supabase = await createClient();

		// Authenticate user
		const { data: userData, error: userErr } = await supabase.auth.getUser();
		if (userErr) {
			console.error('history/delta: auth error', userErr);
		}
		const user = userData?.user;
		if (!user) {
			return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
		}

		// Verify map access (owner or shared access)
		const { data: map, error: mapErr } = await supabase
			.from('mind_maps')
			.select('id, user_id')
			.eq('id', mapId)
			.single();

		if (mapErr || !map) {
			console.error('history/delta: map fetch error', mapErr);
			return NextResponse.json({ error: 'Map not found' }, { status: 404 });
		}

		const { data: shareRows, error: shareErr } = await supabase
			.from('share_access')
			.select('id')
			.eq('map_id', mapId)
			.eq('user_id', user.id)
			.eq('status', 'active')
			.limit(1)
			.maybeSingle();

		if (shareErr && shareErr.code !== 'PGRST116') {
			console.warn('history/delta: share fetch warning', shareErr);
		}

		const share =
			Array.isArray(shareRows) && shareRows.length > 0 ? shareRows[0] : shareRows;
		const hasAccess = map.user_id === user.id || !!share;

		if (!hasAccess) {
			return NextResponse.json({ error: 'Access denied' }, { status: 403 });
		}

		// Fetch event with changes (delta)
		const { data: event, error: eventErr } = await supabase
			.from('map_history_events')
			.select('id, action_name, operation_type, entity_type, changes, created_at, user_id')
			.eq('id', id)
			.eq('map_id', mapId)
			.single();

		if (eventErr || !event) {
			console.error('history/delta: event fetch error', eventErr);
			return NextResponse.json({ error: 'Event not found' }, { status: 404 });
		}

		// Fetch user attribution (optional)
		let userAttribution = null;
		if (event.user_id) {
			const { data: profile } = await supabase
				.from('user_profiles')
				.select('user_id, display_name, avatar_url')
				.eq('user_id', event.user_id)
				.single();

			if (profile) {
				userAttribution = {
					userId: profile.user_id,
					userName: profile.display_name || 'Unknown',
					userAvatar: profile.avatar_url,
				};
			}
		}

		// Extract changes array from stored delta
		// The database stores the full delta object, so event.changes is { operation, entityType, changes: [...] }
		const storedDelta = event.changes as any;
		const changesArray = storedDelta?.changes || [];

		// Return delta with attribution
		return NextResponse.json({
			id: event.id,
			actionName: event.action_name,
			operation: event.operation_type || storedDelta?.operation,
			entityType: event.entity_type || storedDelta?.entityType,
			changes: changesArray,
			timestamp: new Date(event.created_at).getTime(),
			...userAttribution,
		});
	} catch (error) {
		console.error('Fetch delta error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};
