import { normalizeIdentityString } from '@/helpers/identity/resolve-user-identity';
import { generateFunName } from '@/helpers/user-profile-helpers';
import useAppStore from '@/store/mind-map-store';
import { useMemo } from 'react';

function toMetadataString(
	metadata: Record<string, unknown> | undefined,
	key: string
): string | null {
	const value = metadata?.[key];
	return normalizeIdentityString(typeof value === 'string' ? value : null);
}

function toEmailPrefix(email: string | null | undefined): string | null {
	const normalizedEmail = normalizeIdentityString(email);
	if (!normalizedEmail) {
		return null;
	}

	const [prefix] = normalizedEmail.split('@');
	return normalizeIdentityString(prefix);
}

export const useCurrentUserName = () => {
	const currentUser = useAppStore((state) => state.currentUser);
	const userProfile = useAppStore((state) => state.userProfile);

	return useMemo(() => {
		const metadata = currentUser?.user_metadata as
			| Record<string, unknown>
			| undefined;
		const metadataDisplayName = toMetadataString(metadata, 'display_name');
		const metadataFullName =
			toMetadataString(metadata, 'full_name') ||
			toMetadataString(metadata, 'name');

		const fallbackSeed =
			currentUser?.id ||
			userProfile?.user_id ||
			currentUser?.email ||
			userProfile?.email ||
			'anonymous';

		return (
			normalizeIdentityString(userProfile?.display_name) ||
			normalizeIdentityString(userProfile?.full_name) ||
			metadataDisplayName ||
			metadataFullName ||
			toEmailPrefix(userProfile?.email || currentUser?.email) ||
			generateFunName(fallbackSeed)
		);
	}, [currentUser, userProfile]);
};

