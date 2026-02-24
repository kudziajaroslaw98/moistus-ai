import { generateFallbackAvatar } from '@/helpers/user-profile-helpers';

type NullableString = string | null | undefined;

export interface ResolveDisplayNameInput {
	displayName?: NullableString;
	fullName?: NullableString;
	email?: NullableString;
	userId?: NullableString;
}

export interface ResolveAvatarUrlInput {
	profileAvatarUrl?: NullableString;
	metadataAvatarUrl?: NullableString;
	userId?: NullableString;
}

export function normalizeIdentityString(value: NullableString): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	const normalized = value.trim();
	return normalized.length > 0 ? normalized : null;
}

function resolveEmailPrefix(email: NullableString): string | null {
	const normalizedEmail = normalizeIdentityString(email);
	if (!normalizedEmail) {
		return null;
	}

	const [prefix] = normalizedEmail.split('@');
	return normalizeIdentityString(prefix);
}

function resolveUserLabelFallback(userId: NullableString): string {
	const normalizedUserId = normalizeIdentityString(userId);
	if (!normalizedUserId) {
		return 'User';
	}

	return `User ${normalizedUserId.slice(0, 8)}`;
}

export function resolveDisplayName({
	displayName,
	fullName,
	email,
	userId,
}: ResolveDisplayNameInput): string {
	return (
		normalizeIdentityString(displayName) ||
		normalizeIdentityString(fullName) ||
		resolveEmailPrefix(email) ||
		resolveUserLabelFallback(userId)
	);
}

export function resolveAvatarUrl({
	profileAvatarUrl,
	metadataAvatarUrl,
	userId,
}: ResolveAvatarUrlInput): string {
	return (
		normalizeIdentityString(profileAvatarUrl) ||
		normalizeIdentityString(metadataAvatarUrl) ||
		generateFallbackAvatar(normalizeIdentityString(userId) ?? 'anonymous')
	);
}
