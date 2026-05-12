import { verifyManualCheckpointAccess } from '@/helpers/history/server/history-access';
import { createHistoryCheckpoint } from '@/helpers/history/server/history-checkpoints';
import {
	createClient,
	createServiceRoleClient,
} from '@/helpers/supabase/server';
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
		const { actionName, isMajor = true } = body;

		const access = await verifyManualCheckpointAccess(supabase, mapId, user.id);
		if (!access.ok) {
			return NextResponse.json(
				{ error: access.error || 'Access denied' },
				{ status: access.status }
			);
		}

		const checkpoint = await createHistoryCheckpoint({
			adminClient: createServiceRoleClient(),
			mapId,
			userId: user.id,
			actionName: actionName || 'Manual Checkpoint',
			isMajor: !!isMajor,
			prunePrevious: true,
		});

		return NextResponse.json({
			snapshotId: checkpoint.snapshotId,
			snapshotIndex: checkpoint.snapshotIndex,
			nodeCount: checkpoint.nodeCount,
			edgeCount: checkpoint.edgeCount,
			prunedSnapshotCount: checkpoint.prunedSnapshotCount,
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
