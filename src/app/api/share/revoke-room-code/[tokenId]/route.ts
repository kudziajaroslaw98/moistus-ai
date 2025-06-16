import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { z } from 'zod';

// Empty schema since this is a DELETE request with path parameters only
const RevokeRoomCodeSchema = z.object({});

interface RouteParams {
	params: Promise<{
		tokenId: string;
	}>;
}

export async function DELETE(request: Request, context: RouteParams) {
	const { params } = context;
	const { tokenId } = await params;

	// Validate tokenId format
	if (!tokenId || typeof tokenId !== 'string') {
		return respondError('Invalid token ID', 400);
	}

	return withAuthValidation(
		RevokeRoomCodeSchema,
		async (req, data, supabase, user) => {
			try {
				// 1. Get the share token and verify it exists
				const { data: shareToken, error: tokenError } = await supabase
					.from('share_tokens')
					.select(`
						id,
						map_id,
						created_by,
						is_active,
						mind_maps!inner(id, user_id)
					`)
					.eq('id', tokenId)
					.single();

				if (tokenError || !shareToken) {
					return respondError('Share token not found', 404);
				}

				// 2. Check if token is already inactive
				if (!shareToken.is_active) {
					return respondError('Share token is already inactive', 400);
				}

				// 3. Check if user has permission to revoke this token
				const isMapOwner = shareToken.mind_maps.some(
					(map) => map.user_id === user.id
				);
				const isTokenCreator = shareToken.created_by === user.id;

				if (!isMapOwner && !isTokenCreator) {
					// Check if user has sharing permissions through existing shares
					const { data: shareData } = await supabase
						.from('mind_map_shares')
						.select('can_edit')
						.eq('map_id', shareToken.map_id)
						.eq('user_id', user.id)
						.single();

					if (!shareData?.can_edit) {
						return respondError('Permission denied', 403);
					}
				}

				// 4. Deactivate the share token
				const { error: updateError } = await supabase
					.from('share_tokens')
					.update({
						is_active: false,
						updated_at: new Date().toISOString(),
					})
					.eq('id', tokenId);

				if (updateError) {
					console.error('Error revoking share token:', updateError);
					return respondError('Failed to revoke room code', 500);
				}

				// 5. Log the revocation using the database function
				try {
					await supabase.rpc('log_anonymous_share_access', {
						share_token_id_param: tokenId,
						user_id_param: user.id,
						access_type_param: 'leave',
						ip_address_param: req.headers.get('x-forwarded-for') || 
							req.headers.get('x-real-ip') || null,
						user_agent_param: req.headers.get('user-agent') || null,
						metadata_param: {
							action: 'revoked',
							revoked_by: user.id,
							timestamp: new Date().toISOString(),
						}
					});
				} catch (logError) {
					console.error('Error logging revocation:', logError);
					// Don't fail the request for logging errors
				}

				return respondSuccess({
					success: true,
					message: 'Room code revoked successfully',
					token_id: tokenId,
				});

			} catch (error) {
				console.error('Error in revoke-room-code:', error);
				return respondError('An unexpected error occurred', 500);
			}
		}
	)(request);
}