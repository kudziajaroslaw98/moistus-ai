import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import {
	disconnectPartyKitUsers,
	pushPartyKitAccessRevoked,
} from '@/helpers/partykit/admin';
import { z } from 'zod';

const RevokeRoomCodeSchema = z.object({
	token_id: z.string().uuid('Invalid token ID format'),
});

/**
 * Revokes a room code and kicks all users who joined via that code.
 *
 * Uses the `revoke_room_code_and_broadcast` RPC function to:
 * 1. Deactivate the token (prevent new joins)
 * 2. Delete share_access rows for users who joined via that token
 *
 * Then calls PartyKit admin revoke endpoint(s) to force immediate disconnect.
 */
export const POST = withAuthValidation(
	RevokeRoomCodeSchema,
	async (req, data, supabase, user) => {
		try {
			const { data: tokenRecord, error: tokenLookupError } = await supabase
				.from('share_tokens')
				.select('id, map_id, created_by')
				.eq('id', data.token_id)
				.maybeSingle();

			if (tokenLookupError) {
				console.error('Failed to load room code metadata:', tokenLookupError);
				return respondError(
					'Failed to revoke room code',
					500
				);
			}

			if (!tokenRecord) {
				return respondError('Room code not found', 404, 'Token does not exist');
			}

			if (tokenRecord.created_by !== user.id) {
				return respondError(
					'Permission denied',
					403,
					'Only map owner can revoke room code'
				);
			}

			if (!tokenRecord.map_id) {
				return respondError(
					'Room code is not linked to a map',
					400,
					'Invalid token'
				);
			}

			const { data: affectedAccessRows, error: accessLookupError } =
				await supabase
					.from('share_access')
					.select('user_id')
					.eq('share_token_id', data.token_id)
					.eq('status', 'active');

			if (accessLookupError) {
				console.error(
					'Failed to load affected collaborators:',
					accessLookupError
				);
			}

			const affectedUserIds = Array.from(
				new Set(
					(affectedAccessRows ?? []).map((row) => row.user_id).filter(Boolean)
				)
			) as string[];

			const { data: result, error } = await supabase.rpc(
				'revoke_room_code_and_broadcast',
				{
					p_token_id: data.token_id,
					p_user_id: user.id,
				}
			);

			if (error) {
				console.error('Failed to revoke room code:', error);
				return respondError('Failed to revoke room code', 500);
			}

			if (!result?.success) {
				return respondError(
					result?.error || 'Share token not found or access denied',
					404,
					'Token does not exist or user does not have permission'
				);
			}

			const revokedAt = new Date().toISOString();
			let kickSignalAttemptedUsers = 0;
			let kickSignalDeliveredUsers = 0;
			const kickSignalFailedUserIds: string[] = [];

			for (const targetUserId of affectedUserIds) {
				kickSignalAttemptedUsers += 1;
				try {
					const kickResult = await pushPartyKitAccessRevoked({
						mapId: tokenRecord.map_id,
						targetUserId,
						reason: 'access_revoked',
						revokedAt,
					});
					if (kickResult.delivered) {
						kickSignalDeliveredUsers += 1;
					} else {
						kickSignalFailedUserIds.push(targetUserId);
					}
				} catch (error) {
					kickSignalFailedUserIds.push(targetUserId);
					console.warn(
						'[share/revoke-room-code] Failed to push access-revoked event',
						{
							mapId: tokenRecord.map_id,
							targetUserId,
							error:
								error instanceof Error
									? error.message
									: 'Unknown kick signal error',
						}
					);
				}
			}

			let disconnectResult = {
				attempted: false,
				succeededRooms: [] as string[],
				failedRooms: [] as string[],
			};

			try {
				disconnectResult = await disconnectPartyKitUsers({
					mapId: tokenRecord.map_id,
					userIds: affectedUserIds,
					reason: 'access_revoked',
				});
			} catch (disconnectError) {
				console.error(
					'PartyKit disconnect request failed after room-code revoke:',
					disconnectError
				);
			}

			return respondSuccess(
				{
					token_id: data.token_id,
					users_kicked: result.users_kicked,
					realtime: {
						kick_signal: {
							attempted: kickSignalAttemptedUsers > 0,
							delivered:
								kickSignalAttemptedUsers > 0 &&
								kickSignalDeliveredUsers === kickSignalAttemptedUsers,
							targetUserIds: affectedUserIds,
							attemptedUsers: kickSignalAttemptedUsers,
							deliveredUsers: kickSignalDeliveredUsers,
							failedUserIds: kickSignalFailedUserIds,
						},
						disconnect: {
							attempted: disconnectResult.attempted,
							succeededRooms: disconnectResult.succeededRooms,
							failedRooms: disconnectResult.failedRooms,
						},
					},
					realtime_disconnect: disconnectResult,
				},
				200,
				'Room code revoked successfully'
			);
		} catch (error) {
			console.error('Revoke room code error:', error);
			return respondError('Failed to revoke room code', 500);
		}
	}
);
