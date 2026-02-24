import { generateFunName } from '@/helpers/user-profile-helpers';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export interface JoinIdentityProfile {
	user_id: string;
	display_name: string | null;
	email: string | null;
	avatar_url: string | null;
	is_anonymous: boolean | null;
}

export interface ExistingJoinIdentity {
	sessionUser: User | null;
	profile: JoinIdentityProfile | null;
	existingDisplayName: string | null;
	isAnonymous: boolean;
	email?: string;
	avatarUrl?: string;
}

const MAX_DISPLAY_NAME_LENGTH = 50;

export function normalizeDisplayName(
	input: string | null | undefined
): string | null {
	if (typeof input !== 'string') {
		return null;
	}

	const trimmed = input.trim();

	if (trimmed.length === 0) {
		return null;
	}

	return trimmed.slice(0, MAX_DISPLAY_NAME_LENGTH);
}

function metadataString(
	user: User,
	key: 'display_name' | 'avatar_url'
): string | null {
	const value = user.user_metadata?.[key];
	return typeof value === 'string' ? value : null;
}

function emailPrefix(email: string | null | undefined): string | null {
	if (!email) {
		return null;
	}

	const prefix = email.split('@')[0];
	return normalizeDisplayName(prefix);
}

function resolveDisplayName(
	sessionUser: User,
	profile: JoinIdentityProfile | null
): string {
	return (
		normalizeDisplayName(profile?.display_name) ||
		normalizeDisplayName(metadataString(sessionUser, 'display_name')) ||
		emailPrefix(profile?.email ?? sessionUser.email) ||
		generateFunName(sessionUser.id)
	);
}

export async function loadExistingJoinIdentity(
	supabase: SupabaseClient
): Promise<ExistingJoinIdentity> {
	const {
		data: { session },
		error: sessionError,
	} = await supabase.auth.getSession();

	if (sessionError) {
		console.warn('[join-identity] session lookup failed:', sessionError);
	}

	const sessionUser = session?.user ?? null;
	if (!sessionUser) {
		return {
			sessionUser: null,
			profile: null,
			existingDisplayName: null,
			isAnonymous: true,
		};
	}

	const { data: profile, error: profileError } = await supabase
		.from('user_profiles')
		.select('user_id, display_name, email, avatar_url, is_anonymous')
		.eq('user_id', sessionUser.id)
		.maybeSingle<JoinIdentityProfile>();

	if (profileError) {
		console.warn('[join-identity] profile lookup failed:', profileError);
	}

	return {
		sessionUser,
		profile: profile ?? null,
		existingDisplayName: resolveDisplayName(sessionUser, profile ?? null),
		isAnonymous: Boolean(profile?.is_anonymous ?? sessionUser.is_anonymous),
		email: profile?.email ?? sessionUser.email ?? undefined,
		avatarUrl:
			profile?.avatar_url ??
			metadataString(sessionUser, 'avatar_url') ??
			undefined,
	};
}
