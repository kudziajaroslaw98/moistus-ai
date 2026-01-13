import { createClient } from '@/helpers/supabase/server';
import { checkUsageLimit } from '@/helpers/api/with-subscription-check';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/nodes/check-limit
 *
 * Validates if a user can create a new node in a specific map.
 * Returns 200 if allowed, 402 if limit reached.
 *
 * Body: { mapId: string }
 */
export async function POST(request: NextRequest) {
	try {
		const supabase = await createClient();

		// Get the current user
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();

		if (authError || !user) {
			return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
		}

		const body = await request.json();
		const { mapId } = body;

		if (!mapId) {
			return NextResponse.json(
				{ error: 'mapId is required' },
				{ status: 400 }
			);
		}

		// Count current nodes in this map
		const { count: currentNodesCount, error: countError } = await supabase
			.from('nodes')
			.select('*', { count: 'exact', head: true })
			.eq('map_id', mapId);

		if (countError) {
			console.error('Error counting nodes:', countError);
			return NextResponse.json(
				{ error: 'Failed to check node count' },
				{ status: 500 }
			);
		}

		// Check against user's plan limits
		const { allowed, limit, remaining } = await checkUsageLimit(
			user,
			supabase,
			'nodesPerMap',
			currentNodesCount || 0
		);

		if (!allowed) {
			return NextResponse.json(
				{
					error: 'Node limit reached',
					code: 'LIMIT_REACHED',
					limit,
					remaining: 0,
					currentCount: currentNodesCount,
				},
				{ status: 402 }
			);
		}

		return NextResponse.json({
			allowed: true,
			limit,
			remaining,
			currentCount: currentNodesCount,
		});
	} catch (error) {
		console.error('Error in node limit check:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
