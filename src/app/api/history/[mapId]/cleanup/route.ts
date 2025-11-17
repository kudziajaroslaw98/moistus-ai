import { createClient } from '@/helpers/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user)
			return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

		const { data, error } = await supabase.rpc('cleanup_old_history');
		if (error) {
			console.error('Cleanup failed:', error);
			return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
		}

		return NextResponse.json({
			deletedSnapshots: data?.[0]?.deleted_snapshots ?? 0,
			deletedEvents: data?.[0]?.deleted_events ?? 0,
			executionTimeMs: data?.[0]?.execution_time_ms ?? 0,
		});
	} catch (error) {
		console.error('Cleanup route error:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
