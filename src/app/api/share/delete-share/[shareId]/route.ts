import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import {
	disconnectPartyKitUsers,
	pushPartyKitAccessRevoked,
} from '@/helpers/partykit/admin';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import { z } from 'zod';

/**
 * DELETE /api/share/delete-share/[shareId] - Remove user access from a shared map
 *
 * Deletes a share_access record, revoking a specific user's access to the map.
 * Authorization: Only the map owner can delete share access records.
 *
 * @param shareId - The share_access record ID (numeric, passed as string in URL)
 */
export const DELETE = withApiValidation<
	Record<string, never>,
	{ shareId: string },
	{ shareId: string }
>(
	z.object({}), // No body required for DELETE
	async (req, _validatedBody, supabase, user, params) => {
		try {
			const shareId = params?.shareId;

			if (!shareId) {
				return respondError(
					'Share ID is required',
					400,
					'Missing share ID parameter'
				);
			}

			// Parse shareId as number since share_access.id is numeric
			const shareIdNum = parseInt(shareId, 10);

			if (isNaN(shareIdNum)) {
				return respondError(
					'Invalid share ID format',
					400,
					'Share ID must be a valid number'
				);
			}

			// Fetch the share_access record to get map_id for authorization
			const { data: shareAccess, error: fetchError } = await supabase
				.from('share_access')
				.select('id, map_id, user_id, share_token_id')
				.eq('id', shareIdNum)
				.single();

			if (fetchError || !shareAccess) {
				if (fetchError) console.error('Failed to fetch share access:', fetchError);
				return respondError(
					'Share access record not found',
					404
				);
			}

			if (!shareAccess.map_id || !shareAccess.user_id) {
				return respondError(
					'Invalid share access record',
					400,
					'Share access is missing required identifiers'
				);
			}

			// Verify the requesting user owns the map
			const { data: mindMap, error: mapError } = await supabase
				.from('mind_maps')
				.select('id, user_id')
				.eq('id', shareAccess.map_id)
				.single();

			if (mapError || !mindMap) {
				return respondError(
					'Mind map not found',
					404,
					mapError?.message || 'Map not found'
				);
			}

			// Authorization: only map owner can remove shared users
			if (mindMap.user_id !== user.id) {
				return respondError(
					'Permission denied',
					403,
					'Only the map owner can remove shared users'
				);
			}

			// Prevent owner from removing themselves
			if (shareAccess.user_id === user.id) {
				return respondError(
					'Cannot remove yourself',
					400,
					'Map owner cannot remove their own access'
				);
			}

			// Use service role client to bypass RLS after authorization is verified
			// This is safe because we've already confirmed the user owns the map (line 73)
			const adminClient = createServiceRoleClient();

			// Delete the share_access record
			const { error: deleteError } = await adminClient
				.from('share_access')
				.delete()
				.eq('id', shareIdNum);

			if (deleteError) {
				console.error('Failed to delete share access:', deleteError);
				return respondError(
					'Failed to remove user access',
					500
				);
			}

			// Verify deletion actually occurred (RLS can silently block deletes)
			const { data: stillExists } = await adminClient
				.from('share_access')
				.select('id')
				.eq('id', shareIdNum)
				.maybeSingle();

			if (stillExists) {
				console.error('Delete verification failed - record still exists');
				return respondError(
					'Failed to remove user access',
					500,
					'Delete operation did not complete'
				);
			}

			const revokedAt = new Date().toISOString();
			let kickSignalResult = {
				attempted: false,
				delivered: false,
			};
			let kickSignalError: string | undefined;

			try {
				kickSignalResult = await pushPartyKitAccessRevoked({
					mapId: shareAccess.map_id,
					targetUserId: shareAccess.user_id,
					reason: 'access_revoked',
					revokedAt,
				});
			} catch (error) {
				kickSignalError =
					error instanceof Error ? error.message : 'Unknown kick signal error';
				console.warn('[share/delete-share] Failed to push access-revoked event', {
					mapId: shareAccess.map_id,
					targetUserId: shareAccess.user_id,
					error: kickSignalError,
				});
			}

			let disconnectResult = {
				attempted: false,
				succeededRooms: [] as string[],
				failedRooms: [] as string[],
			};

			try {
				disconnectResult = await disconnectPartyKitUsers({
					mapId: shareAccess.map_id,
					userIds: [shareAccess.user_id],
					reason: 'access_revoked',
				});
			} catch (disconnectError) {
				// Non-blocking: access is already revoked in DB.
				console.error(
					'Failed to request PartyKit disconnect after share deletion:',
					disconnectError
				);
			}

			// Decrement current_users on the associated share token
			// Use atomic RPC to prevent race conditions
			if (shareAccess.share_token_id) {
				const { error: decrementError } = await adminClient.rpc(
					'decrement_share_token_users',
					{ token_id: shareAccess.share_token_id }
				);

				if (decrementError) {
					console.error('Failed to decrement current_users:', decrementError);
					// Non-blocking - don't fail the deletion if counter update fails
				}
			}

			return respondSuccess(
				{
					shareId: shareId,
					userId: shareAccess.user_id,
					mapId: shareAccess.map_id,
					realtime: {
						kick_signal: {
							attempted: kickSignalResult.attempted,
							delivered: kickSignalResult.delivered,
							targetUserId: shareAccess.user_id,
							...(kickSignalError ? { error: kickSignalError } : {}),
						},
						disconnect: {
							attempted: disconnectResult.attempted,
							succeededRooms: disconnectResult.succeededRooms,
							failedRooms: disconnectResult.failedRooms,
						},
					},
				},
				200,
				'User access removed successfully'
			);
		} catch (error) {
			console.error(
				'Error in DELETE /api/share/delete-share/[shareId]:',
				error
			);
			return respondError('Failed to remove user access', 500);
		}
	}
);
