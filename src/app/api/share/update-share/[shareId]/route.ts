import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import {
	disconnectPartyKitUsers,
	pushPartyKitPermissionUpdate,
} from '@/helpers/partykit/admin';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import { ShareRole } from '@/types/sharing-types';
import { z } from 'zod';

const updateShareBodySchema = z.object({
	role: z.enum(['viewer', 'commentator', 'editor']),
});

type UpdateShareBody = z.infer<typeof updateShareBodySchema>;

/**
 * PATCH /api/share/update-share/[shareId] - Update user's role/permissions on a shared map
 *
 * Updates a share_access record, modifying a specific user's permissions.
 * Authorization: Only the map owner can update share access records.
 *
 * @param shareId - The share_access record ID (numeric, passed as string in URL)
 * @body role - New role: 'viewer' | 'commentator' | 'editor'
 */
export const PATCH = withApiValidation<
	UpdateShareBody,
	{ shareId: string },
	{ shareId: string }
>(updateShareBodySchema, async (req, validatedBody, supabase, user, params) => {
	try {
		const shareId = params?.shareId;
		const { role } = validatedBody;

		if (!shareId) {
			return respondError(
				'Share ID is required',
				400,
				'Missing share ID parameter'
			);
		}

		// Parse shareId as number since share_access.id is numeric
		// Use strict validation: trim, check digits only, then convert
		const trimmedShareId = shareId.trim();
		if (!/^\d+$/.test(trimmedShareId)) {
			return respondError(
				'Invalid share ID format',
				400,
				'Share ID must be a valid number'
			);
		}

		const shareIdNum = Number(trimmedShareId);
		if (!Number.isInteger(shareIdNum) || shareIdNum <= 0) {
			return respondError(
				'Invalid share ID format',
				400,
				'Share ID must be a positive integer'
			);
		}

		// Fetch the share_access record to get map_id for authorization
		const { data: shareAccess, error: fetchError } = await supabase
			.from('share_access')
			.select('id, map_id, user_id, role')
			.eq('id', shareIdNum)
			.single();

		if (fetchError || !shareAccess) {
			if (fetchError) console.error('Failed to fetch share access:', fetchError);
			return respondError(
				'Share access record not found',
				404
			);
		}

		// Prevent changing owner role
		if (shareAccess.role === 'owner') {
			return respondError(
				'Cannot modify owner permissions',
				400,
				'Owner role cannot be changed'
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

		// Authorization: only map owner can modify shared users
		if (mindMap.user_id !== user.id) {
			return respondError(
				'Permission denied',
				403,
				'Only the map owner can modify user permissions'
			);
		}

		// Derive permission flags from role
		const permissions = getRolePermissions(role);

		// Use service role client to bypass RLS after authorization is verified
		const adminClient = createServiceRoleClient();

		// Update the share_access record
		const { data: updatedShare, error: updateError } = await adminClient
			.from('share_access')
			.update({
				role: role,
				can_edit: permissions.can_edit,
				can_comment: permissions.can_comment,
				can_view: permissions.can_view,
				updated_at: new Date().toISOString(),
			})
			.eq('id', shareIdNum)
			.select()
			.single();

		if (updateError) {
			console.error('Failed to update share access:', updateError);
			return respondError(
				'Failed to update user permissions',
				500
			);
		}

		if (!updatedShare.map_id || !updatedShare.user_id) {
			return respondError(
				'Updated share record is invalid',
				500,
				'Missing map_id or user_id after update'
			);
		}

		let permissionPushResult = {
			attempted: false,
			delivered: false,
		};
		let permissionPushErrorMessage: string | undefined;

		// Push user-targeted permission event before reconnecting transport rooms.
		try {
			permissionPushResult = await pushPartyKitPermissionUpdate({
				mapId: updatedShare.map_id,
				targetUserId: updatedShare.user_id,
				role: updatedShare.role as ShareRole,
				can_view: Boolean(updatedShare.can_view),
				can_comment: Boolean(updatedShare.can_comment),
				can_edit: Boolean(updatedShare.can_edit),
				updatedAt: updatedShare.updated_at ?? new Date().toISOString(),
			});

			if (permissionPushResult.attempted && !permissionPushResult.delivered) {
				console.warn(
					'[share/update-share] Permission push attempted but not delivered',
					{
						mapId: updatedShare.map_id,
						targetUserId: updatedShare.user_id,
					}
				);
			}
		} catch (permissionPushError) {
			permissionPushErrorMessage = toErrorMessage(permissionPushError);
			console.warn(
				'[share/update-share] Permission push failed after DB update',
				{
					mapId: updatedShare.map_id,
					targetUserId: updatedShare.user_id,
					error: permissionPushErrorMessage,
				}
			);
		}

		let disconnectResult = {
			attempted: false,
			succeededRooms: [] as string[],
			failedRooms: [] as string[],
		};

		// Force reconnect so PartyKit applies updated room-mode permissions immediately.
		try {
			disconnectResult = await disconnectPartyKitUsers({
				mapId: updatedShare.map_id,
				userIds: [updatedShare.user_id],
				reason: 'permissions_updated',
			});

			if (
				disconnectResult.attempted &&
				disconnectResult.failedRooms.length > 0
			) {
				console.warn(
					'[share/update-share] PartyKit disconnect degraded after role update',
					{
						mapId: updatedShare.map_id,
						targetUserId: updatedShare.user_id,
						failedRooms: disconnectResult.failedRooms,
						succeededRooms: disconnectResult.succeededRooms,
					}
				);
			}
		} catch (disconnectError) {
			console.warn(
				'[share/update-share] PartyKit disconnect request failed after role update',
				{
					mapId: updatedShare.map_id,
					targetUserId: updatedShare.user_id,
					error: toErrorMessage(disconnectError),
				}
			);
		}

		return respondSuccess(
			{
				id: String(updatedShare.id),
				map_id: updatedShare.map_id,
				user_id: updatedShare.user_id,
				role: updatedShare.role,
				can_edit: updatedShare.can_edit,
				can_comment: updatedShare.can_comment,
				can_view: updatedShare.can_view,
				updated_at: updatedShare.updated_at,
				realtime: {
					permission_push: {
						attempted: permissionPushResult.attempted,
						delivered: permissionPushResult.delivered,
						...(permissionPushErrorMessage
							? { error: permissionPushErrorMessage }
							: {}),
					},
					disconnect: {
						attempted: disconnectResult.attempted,
						succeededRooms: disconnectResult.succeededRooms,
						failedRooms: disconnectResult.failedRooms,
					},
				},
			},
			200,
			'User permissions updated successfully'
		);
	} catch (error) {
		console.error('Error in PATCH /api/share/update-share/[shareId]:', error);
		return respondError('Failed to update user permissions', 500);
	}
});

/**
 * Derive permission flags from role string
 */
function getRolePermissions(role: ShareRole): {
	can_edit: boolean;
	can_comment: boolean;
	can_view: boolean;
} {
	switch (role) {
		case 'editor':
			return { can_edit: true, can_comment: true, can_view: true };
		case 'commentator':
			return { can_edit: false, can_comment: true, can_view: true };
		case 'viewer':
		default:
			return { can_edit: false, can_comment: false, can_view: true };
	}
}

function toErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Unknown error';
}
