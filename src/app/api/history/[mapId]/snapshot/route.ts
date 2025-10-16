import { createClient } from '@/helpers/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
	req: Request,
	{ params }: { params: Promise<{ mapId: string }> }
) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user)
			return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

		const { mapId } = await params;
		const body = await req.json().catch(() => ({}));
		const { actionName, nodes = [], edges = [], isMajor = true } = body;

		// Verify map ownership (manual checkpoint only for owner)
		const { data: map } = await supabase
			.from('mind_maps')
			.select('id, user_id')
			.eq('id', mapId)
			.single();
		if (!map || map.user_id !== user.id) {
			return NextResponse.json(
				{ error: 'Map not found or access denied' },
				{ status: 404 }
			);
		}

		// Treat users with active/trialing subscription as Pro
		const { data: subscription } = await supabase
			.from('user_subscriptions')
			.select('status')
			.eq('user_id', user.id)
			.in('status', ['active', 'trialing'])
			.limit(1)
			.single();
		if (!subscription) {
			return NextResponse.json(
				{ error: 'Manual checkpoints are Pro-only' },
				{ status: 403 }
			);
		}

		// Get current snapshot index
		const { data: lastSnapshot } = await supabase
			.from('map_history_snapshots')
			.select('snapshot_index')
			.eq('map_id', mapId)
			.order('snapshot_index', { ascending: false })
			.limit(1)
			.single();
		const nextIndex = (lastSnapshot?.snapshot_index ?? -1) + 1;

		const { data: inserted, error } = await supabase
			.from('map_history_snapshots')
			.insert({
				map_id: mapId,
				user_id: user.id,
				snapshot_index: nextIndex,
				action_name: actionName || 'Manual Checkpoint',
				nodes,
				edges,
				node_count: nodes.length,
				edge_count: edges.length,
				is_major: !!isMajor,
			})
			.select()
			.single();
		if (error) {
			console.error('Failed to create snapshot:', error);
			return NextResponse.json(
				{ error: 'Failed to create snapshot' },
				{ status: 500 }
			);
		}

		// Update the current history pointer to the new snapshot
		try {
			await supabase.from('map_history_current').upsert(
				{
					map_id: mapId,
					snapshot_id: inserted.id,
					event_id: null,
					updated_by: user.id,
					updated_at: new Date().toISOString(),
				},
				{ onConflict: 'map_id' }
			);
		} catch (pointerErr) {
			console.error(
				'Failed to update current history pointer (snapshot):',
				pointerErr
			);
		}

		return NextResponse.json({
			snapshotId: inserted.id,
			snapshotIndex: inserted.snapshot_index,
			message: 'Checkpoint created successfully',
		});
	} catch (error) {
		console.error('Snapshot error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
