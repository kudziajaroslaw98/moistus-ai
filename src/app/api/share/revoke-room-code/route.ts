import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { NextRequest } from 'next/server';
import { z } from 'zod';

const RevokeRoomCodeSchema = z.object({
	token_id: z.string().uuid(),
});

export const POST = withApiValidation(
	RevokeRoomCodeSchema,
	async (req, data, supabase, user) => {
		// 1. Get the token and verify ownership
		const { data: tokenData, error: tokenError } = await supabase
			.from('share_tokens')
			.select(
				`
        id,
        token,
        map_id,
        created_by,
        is_active,
        mind_maps!inner(
          id,
          user_id
        )
      `
			)
			.eq('id', data.token_id)
			.single();

		if (tokenError || !tokenData) {
			return respondError('Room code not found', 404);
		}

		// 2. Check if user has permission to revoke
		const isOwner = tokenData.mind_maps.find(
			(map) => map.id === tokenData.map_id && map.user_id === user.id
		);
		const isCreator = tokenData.created_by === user.id;

		if (!isOwner && !isCreator) {
			return respondError(
				'Permission denied',
				403,
				'You can only revoke room codes you created or for maps you own'
			);
		}

		// 3. Check if already revoked
		if (!tokenData.is_active) {
			return respondError('Room code already revoked', 400);
		}

		// 4. Update token to inactive
		const { error: updateError } = await supabase
			.from('share_tokens')
			.update({
				is_active: false,
				updated_at: new Date().toISOString(),
			})
			.eq('id', data.token_id);

		if (updateError) {
			console.error('Failed to revoke room code:', updateError);
			return respondError('Failed to revoke room code', 500);
		}

		// 5. Log the revocation activity
		await supabase.rpc('log_activity', {
			p_map_id: tokenData.map_id,
			p_user_id: user.id,
			p_action_type: 'map_share',
			p_metadata: {
				action: 'room_code_revoked',
				token: tokenData.token,
				revoked_at: new Date().toISOString(),
			},
			p_change_summary: `Room code ${tokenData.token} revoked`,
		});

		// 6. Log access event
		await supabase.rpc('log_share_access', {
			p_share_token_id: tokenData.id,
			p_user_id: user.id,
			p_guest_user_id: null,
			p_access_type: 'leave',
			p_ip_address:
				req.headers.get('x-forwarded-for') ||
				req.headers.get('x-real-ip') ||
				null,
			p_user_agent: req.headers.get('user-agent') || null,
			p_referrer: null,
			p_metadata: {
				action: 'token_revoked',
				revoked_by: user.id,
			},
		});

		return respondSuccess({
			success: true,
			token_id: tokenData.id,
			token: tokenData.token,
			revoked_at: new Date().toISOString(),
		});
	}
);

// DELETE endpoint for RESTful API
export const DELETE = async (
	request: NextRequest,
	{ params }: { params: { token_id: string } }
) => {
	const body = { token_id: params.token_id };

	// Create a new request with the token_id in the body
	const newRequest = new Request(request.url, {
		method: 'POST',
		headers: request.headers,
		body: JSON.stringify(body),
	});

	return POST(newRequest);
};
