import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/helpers/supabase/server';

export async function POST(req: NextRequest) {
	const authHeader = req.headers.get('authorization');
	const cronSecret = process.env.CRON_SECRET;
	if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const supabase = await createClient();
	try {
		const { data, error } = await supabase.rpc('cleanup_old_history');
		if (error) throw error;
		return NextResponse.json({
			success: true,
			deletedSnapshots: data?.[0]?.deleted_snapshots ?? 0,
			deletedEvents: data?.[0]?.deleted_events ?? 0,
			executionTimeMs: data?.[0]?.execution_time_ms ?? 0,
		});
	} catch (error) {
		console.error('Cron cleanup failed:', error);
		return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
	}
}