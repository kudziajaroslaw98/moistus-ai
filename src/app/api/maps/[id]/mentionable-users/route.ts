import { resolveAvatarUrl, resolveDisplayName } from '@/helpers/identity/resolve-user-identity';
import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import type { MentionableUser } from '@/types/notification';
import { slugifyCollaborator } from '@/utils/collaborator-utils';
import { z } from 'zod';

const mentionableUsersSchema = z.object({});

interface MentionableUsersResponse {
	users: MentionableUser[];
}

interface RawProfileRow {
	user_id: string;
	display_name: string | null;
	full_name: string | null;
	avatar_url: string | null;
	email: string | null;
}

interface RawShareRow {
	user_id: string;
	role: 'owner' | 'editor' | 'commentator' | 'viewer';
	display_name: string | null;
	full_name: string | null;
	avatar_url: string | null;
	email: string | null;
}

export const GET = withApiValidation<
	z.infer<typeof mentionableUsersSchema>,
	MentionableUsersResponse,
	{ id: string }
>(mentionableUsersSchema, async (_req, _validatedBody, _supabase, user, params) => {
	try {
		const mapId = params?.id;
		if (!mapId) {
			return respondError('Map ID is required', 400);
		}

		const adminClient = createServiceRoleClient();

		const { data: mapData, error: mapError } = await adminClient
			.from('mind_maps')
			.select('id, user_id')
			.eq('id', mapId)
			.maybeSingle();

		if (mapError || !mapData?.id || !mapData.user_id) {
			return respondError('Map not found', 404);
		}

		if (mapData.user_id !== user.id) {
			const { data: accessData, error: accessError } = await adminClient
				.from('share_access')
				.select('id')
				.eq('map_id', mapId)
				.eq('user_id', user.id)
				.eq('status', 'active')
				.maybeSingle();

			if (accessError || !accessData) {
				return respondError('Access denied', 403);
			}
		}

		const [{ data: ownerProfile }, { data: shareRows }] = await Promise.all([
			adminClient
				.from('user_profiles')
				.select('user_id, display_name, full_name, avatar_url, email')
				.eq('user_id', mapData.user_id)
				.maybeSingle(),
			adminClient
				.from('share_access_with_profiles')
				.select('user_id, role, display_name, full_name, avatar_url, email')
				.eq('map_id', mapId)
				.eq('status', 'active'),
		]);

		const mentionableMap = new Map<string, MentionableUser>();

		const typedOwnerProfile = (ownerProfile ?? null) as RawProfileRow | null;
		mentionableMap.set(
			mapData.user_id,
			createMentionableUser({
				userId: mapData.user_id,
				role: 'owner',
				displayName: typedOwnerProfile?.display_name ?? null,
				fullName: typedOwnerProfile?.full_name ?? null,
				avatarUrl: typedOwnerProfile?.avatar_url ?? null,
				email: typedOwnerProfile?.email ?? null,
			})
		);

		for (const row of (shareRows ?? []) as RawShareRow[]) {
			if (!row.user_id) {
				continue;
			}
			const normalizedRole =
				row.role === 'owner' ||
				row.role === 'editor' ||
				row.role === 'commentator' ||
				row.role === 'viewer'
					? row.role
					: 'viewer';

			mentionableMap.set(
				row.user_id,
				createMentionableUser({
					userId: row.user_id,
					role: normalizedRole,
					displayName: row.display_name,
					fullName: row.full_name,
					avatarUrl: row.avatar_url,
					email: row.email,
				})
			);
		}

		const users = Array.from(mentionableMap.values()).sort((a, b) =>
			a.displayName.localeCompare(b.displayName)
		);

		return respondSuccess(
			{
				users,
			},
			200,
			'Mentionable users fetched'
		);
	} catch (error) {
		console.error('[maps/mentionable-users] failed', error);
		return respondError('Failed to fetch mentionable users', 500);
	}
});

function createMentionableUser(input: {
	userId: string;
	role: 'owner' | 'editor' | 'commentator' | 'viewer';
	displayName: string | null;
	fullName: string | null;
	avatarUrl: string | null;
	email: string | null;
}): MentionableUser {
	const normalizedDisplayName = resolveDisplayName({
		displayName: input.displayName,
		fullName: input.fullName,
		email: input.email,
		userId: input.userId,
	});
	const slug = slugifyCollaborator({
		id: input.userId,
		name: normalizedDisplayName,
		email: input.email,
		profile: {
			display_name: normalizedDisplayName,
		},
	});

	return {
		userId: input.userId,
		slug,
		displayName: normalizedDisplayName,
		avatarUrl: resolveAvatarUrl({
			profileAvatarUrl: input.avatarUrl,
			userId: input.userId,
		}),
		email: input.email,
		role: input.role,
	};
}
