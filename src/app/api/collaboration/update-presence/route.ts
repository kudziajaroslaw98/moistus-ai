import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const UpdatePresenceSchema = z.object({
	map_id: z.string().uuid(),
	status: z.enum(['active', 'idle', 'away', 'offline']).optional(),
	cursor_position: z
		.object({
			x: z.number(),
			y: z.number(),
		})
		.optional(),
	viewport: z
		.object({
			x: z.number(),
			y: z.number(),
			zoom: z.number().min(0.1).max(5),
		})
		.optional(),
});

export const POST = withApiValidation(
	UpdatePresenceSchema,
	async (req, data, supabase, user) => {
		// 1. Check if user has access to the map
		const { data: hasAccess, error: accessError } = await supabase.rpc(
			'check_user_map_permission',
			{
				p_user_id: user.id,
				p_map_id: data.map_id,
				p_action: 'view',
			}
		);

		if (accessError || !hasAccess) {
			return respondError(
				'Access denied',
				403,
				"You don't have permission to view this map"
			);
		}

		// 2. Get or assign user color
		let userColor = null;
		const { data: existingPresence } = await supabase
			.from('collaboration_presence')
			.select('user_color')
			.eq('user_id', user.id)
			.eq('map_id', data.map_id)
			.single();

		if (!existingPresence?.user_color) {
			const { data: assignedColor } = await supabase.rpc('assign_user_color', {
				p_map_id: data.map_id,
				p_user_id: user.id,
			});
			userColor = assignedColor;
		} else {
			userColor = existingPresence.user_color;
		}

		// 3. Build update object
		const updates: any = {
			user_id: user.id,
			map_id: data.map_id,
			last_activity: new Date().toISOString(),
			user_color: userColor,
		};

		if (data.status) {
			updates.status = data.status;
		}

		if (data.cursor_position) {
			updates.cursor_x = data.cursor_position.x;
			updates.cursor_y = data.cursor_position.y;
		}

		if (data.viewport) {
			updates.viewport_x = data.viewport.x;
			updates.viewport_y = data.viewport.y;
			updates.zoom_level = data.viewport.zoom;
		}

		// 4. Upsert presence record
		const { data: presence, error: presenceError } = await supabase
			.from('collaboration_presence')
			.upsert(updates, {
				onConflict: 'user_id,map_id',
			})
			.select()
			.single();

		if (presenceError) {
			console.error('Failed to update presence:', presenceError);
			return respondError('Failed to update presence', 500);
		}

		// 5. Get user info for response
		const { data: userData } = await supabase
			.from('auth.users')
			.select('email, raw_user_meta_data')
			.eq('id', user.id)
			.single();

		const userName =
			userData?.raw_user_meta_data?.full_name ||
			userData?.email?.split('@')[0] ||
			'Unknown User';
		const userAvatar = userData?.raw_user_meta_data?.avatar_url;

		// 6. Broadcast presence update through Supabase Realtime
		// Note: This is handled automatically by the database trigger

		return respondSuccess({
			success: true,
			presence: {
				user_id: user.id,
				user_name: userName,
				user_avatar: userAvatar,
				user_color: presence.user_color,
				status: presence.status,
				cursor_x: presence.cursor_x,
				cursor_y: presence.cursor_y,
				viewport_x: presence.viewport_x,
				viewport_y: presence.viewport_y,
				zoom_level: presence.zoom_level,
				last_activity: presence.last_activity,
			},
		});
	}
);

// GET endpoint to fetch current presence for a map
export const GET = async (request: NextRequest) => {
	const searchParams = request.nextUrl.searchParams;
	const mapId = searchParams.get('map_id');

	if (!mapId) {
		return respondError('map_id parameter is required', 400);
	}

	const supabase = await import('@/helpers/supabase/server').then((m) =>
		m.createClient()
	);

	// Check authentication
	const {
		data: { user },
		error: authError,
	} = await supabase.auth.getUser();

	if (authError || !user) {
		return respondError('Authentication required', 401);
	}

	// Check access
	const { data: hasAccess } = await supabase.rpc('check_user_map_permission', {
		p_user_id: user.id,
		p_map_id: mapId,
		p_action: 'view',
	});

	if (!hasAccess) {
		return respondError('Access denied', 403);
	}

	// Get active users
	const { data: activeUsers, error: presenceError } = await supabase.rpc(
		'get_active_map_users',
		{ p_map_id: mapId }
	);

	if (presenceError) {
		console.error('Failed to fetch active users:', presenceError);
		return respondError('Failed to fetch active users', 500);
	}

	return respondSuccess({
		map_id: mapId,
		active_users: activeUsers || [],
		total_active: activeUsers?.length || 0,
	});
};
