export interface VerifiedAuthUser {
	id: string;
	email?: string | null;
	user_metadata?: Record<string, unknown> | null;
}

export interface ExistingUserProfileIdentity {
	display_name?: string | null;
	full_name?: string | null;
}

function getMetadataText(
	user: VerifiedAuthUser,
	key: 'pending_display_name' | 'display_name' | 'full_name'
): string | null {
	const value = user.user_metadata?.[key];
	return typeof value === 'string' && value.trim().length > 0
		? value.trim()
		: null;
}

function getEmailFallback(
	email: string | null | undefined,
	userId: string
): string {
	const emailPrefix = email?.split('@')[0]?.trim();
	return emailPrefix || `User ${userId.slice(0, 8)}`;
}

/**
 * Generates a user_id-conflict upsert that keeps existing profile identity as
 * canonical while filling required identity fields for first-time profiles.
 */
export function buildVerifiedUserProfileUpsert(
	user: VerifiedAuthUser,
	existingProfile: ExistingUserProfileIdentity | null
) {
	const pendingDisplayName = getMetadataText(user, 'pending_display_name');
	const displayName =
		existingProfile?.display_name?.trim() ||
		pendingDisplayName ||
		getMetadataText(user, 'display_name');
	const fullName =
		existingProfile?.full_name?.trim() ||
		getMetadataText(user, 'full_name') ||
		pendingDisplayName ||
		displayName ||
		getEmailFallback(user.email, user.id);

	return {
		profile: {
			user_id: user.id,
			email: user.email ?? null,
			display_name: displayName ?? null,
			full_name: fullName,
			is_anonymous: false,
		},
		options: {
			onConflict: 'user_id',
		},
	};
}
