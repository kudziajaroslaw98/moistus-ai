import type { SharedUser } from '@/types/sharing-types';

type CollaboratorSource = Pick<SharedUser, 'id' | 'name' | 'email' | 'profile'>;

/**
 * Normalize collaborator identifiers to the same slug format used by mentions.
 */
export function slugifyCollaborator(rawOrUser: string | CollaboratorSource): string {
	const raw =
		typeof rawOrUser === 'string'
			? rawOrUser
			: rawOrUser.profile?.display_name ||
				rawOrUser.name ||
				rawOrUser.email?.split('@')[0] ||
				rawOrUser.id;

	return raw.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/** Get up to 2 uppercase initials from a display name. */
export function getInitials(name: string): string {
	return name
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? '')
		.join('');
}
