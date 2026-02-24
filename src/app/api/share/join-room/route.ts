import { respondError, respondSuccess } from '@/helpers/api/responses';
import {
	fetchCollaboratorEntryByMapAndUser,
	toErrorMessage,
} from '@/helpers/partykit/collaborator-sync';
import { pushPartyKitCollaboratorEvent } from '@/helpers/partykit/admin';
import { normalizeDisplayName } from '@/helpers/sharing/join-identity';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import { withAuthValidation } from '@/helpers/api/with-auth-validation';
import { getMindMapRoomName } from '@/lib/realtime/room-names';
import { z } from 'zod';

const JoinRoomSchema = z.object({
	token: z
		.string()
		.regex(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/i, 'Invalid room code format'),
	display_name: z.string().trim().min(1).max(50).optional(),
});

export const POST = withAuthValidation(
	JoinRoomSchema,
	async (req, data, supabase, user) => {
		// Single RPC call handles: validation, limit check, access creation
		const { data: result, error: rpcError } = await supabase.rpc('join_room', {
			p_room_code: data.token.toUpperCase(),
			p_user_id: user.id,
		});

		if (rpcError) {
			console.error('Join room RPC error:', rpcError);
			return respondError('Failed to join room', 500);
		}

		// Extract first result (RPC returns TABLE)
		const joinResult = result?.[0];

		if (!joinResult?.success) {
			// Map error codes to HTTP status codes
			const statusMap: Record<string, number> = {
				INVALID_CODE: 404,
				EXPIRED: 410,
				ROOM_FULL: 403,
				LIMIT_REACHED: 402,
				MAP_NOT_FOUND: 404,
				INVALID_USER: 401,
				INTERNAL_ERROR: 500,
			};

			const status = statusMap[joinResult?.error_code] || 500;

			return respondError(
				joinResult?.error_message || 'Failed to join room',
				status,
				joinResult?.error_code,
				joinResult?.error_code === 'LIMIT_REACHED'
					? {
							currentCount: joinResult.collaborator_count,
							limit: joinResult.collaborator_limit,
							upgradeUrl: '/dashboard/settings/billing',
						}
					: undefined
			);
		}

		const normalizedDisplayName = normalizeDisplayName(data.display_name);
		if (normalizedDisplayName) {
			try {
				const { error: profileUpdateError } = await supabase
					.from('user_profiles')
					.update({
						display_name: normalizedDisplayName,
					})
					.eq('user_id', user.id);

				if (profileUpdateError) {
					console.warn(
						'[share/join-room] failed to persist display_name in user_profiles',
						{
							mapId: joinResult.map_id,
							userId: user.id,
							error: profileUpdateError.message,
						}
					);
				}
			} catch (profileUpdateUnhandledError) {
				console.warn(
					'[share/join-room] unexpected user_profiles display_name update failure',
					{
						mapId: joinResult.map_id,
						userId: user.id,
						error: toErrorMessage(profileUpdateUnhandledError),
					}
				);
			}

			try {
				const { error: authUpdateError } = await supabase.auth.updateUser({
					data: {
						display_name: normalizedDisplayName,
					},
				});

				if (authUpdateError) {
					console.warn(
						'[share/join-room] failed to persist display_name in auth metadata',
						{
							mapId: joinResult.map_id,
							userId: user.id,
							error: authUpdateError.message,
						}
					);
				}
			} catch (authUpdateUnhandledError) {
				console.warn(
					'[share/join-room] unexpected auth metadata display_name update failure',
					{
						mapId: joinResult.map_id,
						userId: user.id,
						error: toErrorMessage(authUpdateUnhandledError),
					}
				);
			}
		}

		let collaboratorSyncResult: {
			attempted: boolean;
			delivered: boolean;
			error?: string;
		} = {
			attempted: false,
			delivered: false,
		};

		try {
			const adminClient = createServiceRoleClient();
			const collaborator = await fetchCollaboratorEntryByMapAndUser(
				adminClient,
				joinResult.map_id,
				user.id
			);

			if (!collaborator) {
				collaboratorSyncResult = {
					attempted: false,
					delivered: false,
					error: 'Collaborator row not found after join',
				};
			} else {
				const occurredAt = new Date().toISOString();
				const pushResult = await pushPartyKitCollaboratorEvent({
					type: 'sharing:collaborator:upsert',
					mapId: joinResult.map_id,
					occurredAt,
					collaborator,
				});
				collaboratorSyncResult = {
					attempted: pushResult.attempted,
					delivered: pushResult.delivered,
				};
			}
		} catch (error) {
			collaboratorSyncResult = {
				attempted: true,
				delivered: false,
				error: toErrorMessage(error),
			};
			console.warn(
				'[share/join-room] collaborator sync push failed after DB join',
				{
					mapId: joinResult.map_id,
					userId: user.id,
					error: collaboratorSyncResult.error,
				}
			);
		}

		// Return success response
		const realtimeRoom = getMindMapRoomName(joinResult.map_id, 'sync');
		const metadataDisplayName =
			typeof user.user_metadata?.display_name === 'string'
				? user.user_metadata.display_name
				: null;
		const responseDisplayName =
			normalizedDisplayName ||
			normalizeDisplayName(metadataDisplayName) ||
			`User ${user.id.slice(0, 8)}`;

		return respondSuccess({
			map_id: joinResult.map_id,
			map_title: joinResult.map_title,
			map_description: joinResult.map_description,
			permissions: joinResult.permissions,
			user_id: user.id,
			is_anonymous: user.is_anonymous,
			user_display_name: responseDisplayName,
			user_avatar: user.user_metadata?.avatar_url,
			realtime_room: realtimeRoom,
			share_token_id: joinResult.token_id,
			join_method: 'anonymous_auth',
			joined_at: new Date().toISOString(),
			realtime: {
				collaborator_sync: collaboratorSyncResult,
			},
		});
	}
);
