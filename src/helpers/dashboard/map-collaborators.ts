import {
	resolveAvatarUrl,
	resolveDisplayName,
} from '@/helpers/identity/resolve-user-identity';

/** One person with access to a map, shaped like `share_access_with_profiles`. */
export interface CollaboratorRow {
	map_id: string;
	user_id: string | null;
	display_name: string | null;
	full_name: string | null;
	avatar_url: string | null;
	email: string | null;
}

export interface MapCollaborator {
	userId: string;
	displayName: string;
	avatarUrl: string;
}

export interface MapCollaboratorSummary {
	/** First `max` people, in row order. */
	collaborators: MapCollaborator[];
	/** Everyone with access except the current user. */
	collaboratorCount: number;
}

/**
 * Groups collaborator rows per map for dashboard cards: drops the viewer,
 * dedupes repeated users, keeps row order (so callers can put the owner
 * first) and caps the visible list while keeping the full count.
 */
export function groupMapCollaborators(
	rows: CollaboratorRow[],
	currentUserId: string,
	max = 3
): Record<string, MapCollaboratorSummary> {
	const seen = new Map<string, Set<string>>();
	const result: Record<string, MapCollaboratorSummary> = {};

	for (const row of rows) {
		if (!row.user_id || row.user_id === currentUserId) continue;

		const mapSeen = seen.get(row.map_id) ?? new Set<string>();
		if (mapSeen.has(row.user_id)) continue;
		mapSeen.add(row.user_id);
		seen.set(row.map_id, mapSeen);

		const summary = (result[row.map_id] ??= {
			collaborators: [],
			collaboratorCount: 0,
		});
		summary.collaboratorCount += 1;

		if (summary.collaborators.length < max) {
			summary.collaborators.push({
				userId: row.user_id,
				displayName: resolveDisplayName({
					displayName: row.display_name,
					fullName: row.full_name,
					email: row.email,
					userId: row.user_id,
				}),
				avatarUrl: resolveAvatarUrl({
					profileAvatarUrl: row.avatar_url,
					userId: row.user_id,
				}),
			});
		}
	}

	return result;
}
