import {
	normalizeIdentityString,
	resolveAvatarUrl,
} from '@/helpers/identity/resolve-user-identity';
import useAppStore from '@/store/mind-map-store';
import { useMemo } from 'react';

function toMetadataAvatar(metadata: Record<string, unknown> | undefined) {
	const avatarUrl =
		typeof metadata?.avatar_url === 'string' ? metadata.avatar_url : null;
	const picture = typeof metadata?.picture === 'string' ? metadata.picture : null;

	return normalizeIdentityString(avatarUrl) || normalizeIdentityString(picture);
}

export const useCurrentUserImage = (_backgroundColor?: string) => {
	const currentUser = useAppStore((state) => state.currentUser);
	const userProfile = useAppStore((state) => state.userProfile);

	return useMemo(() => {
		const metadata = currentUser?.user_metadata as
			| Record<string, unknown>
			| undefined;
		const avatarSeed =
			currentUser?.id ||
			userProfile?.user_id ||
			currentUser?.email ||
			userProfile?.email ||
			'anonymous';

		return resolveAvatarUrl({
			profileAvatarUrl: userProfile?.avatar_url,
			metadataAvatarUrl: toMetadataAvatar(metadata),
			userId: avatarSeed,
		});
	}, [currentUser, userProfile]);
};

