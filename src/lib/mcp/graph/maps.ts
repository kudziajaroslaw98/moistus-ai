import type { SupabaseClient } from '@supabase/supabase-js';
import { McpToolError } from '../errors';
import { buildShortIds, normalizeIdInput, resolveShortId } from '../format/short-ids';
import type { McpMapRole } from './types';

export interface AccessibleMap {
	id: string;
	title: string;
	nodeCount: number;
	role: McpMapRole;
	updatedAt: string;
}

interface MapRow {
	id: string;
	title: string | null;
	updated_at: string;
	nodes: { count: number }[] | null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const toAccessibleMap = (row: MapRow, role: McpMapRole): AccessibleMap => ({
	id: row.id,
	title: row.title ?? 'Untitled map',
	nodeCount: row.nodes?.[0]?.count ?? 0,
	role,
	updatedAt: row.updated_at,
});

/** Maps the caller owns plus maps shared with them, newest first. */
export async function listAccessibleMaps(
	supabase: SupabaseClient,
	userId: string
): Promise<AccessibleMap[]> {
	const [owned, shares] = await Promise.all([
		supabase
			.from('mind_maps')
			.select('id, title, updated_at, nodes(count)')
			.eq('user_id', userId)
			.eq('is_template', false)
			.returns<MapRow[]>(),
		supabase
			.from('share_access')
			.select('map_id, role')
			.eq('user_id', userId)
			.eq('status', 'active')
			.returns<{ map_id: string; role: string | null }[]>(),
	]);

	if (owned.error) throw new McpToolError(`Could not list your maps: ${owned.error.message}`);
	if (shares.error) throw new McpToolError(`Could not list shared maps: ${shares.error.message}`);

	const maps = (owned.data ?? []).map((row) => toAccessibleMap(row, 'owner'));
	const ownedIds = new Set(maps.map((map) => map.id));
	const roleByMapId = new Map(
		(shares.data ?? [])
			.filter((share) => !ownedIds.has(share.map_id))
			.map((share) => [share.map_id, share.role] as const)
	);

	if (roleByMapId.size > 0) {
		const shared = await supabase
			.from('mind_maps')
			.select('id, title, updated_at, nodes(count)')
			.in('id', [...roleByMapId.keys()])
			.returns<MapRow[]>();
		if (shared.error) {
			throw new McpToolError(`Could not list shared maps: ${shared.error.message}`);
		}
		for (const row of shared.data ?? []) {
			const role = roleByMapId.get(row.id);
			maps.push(
				toAccessibleMap(
					row,
					role === 'editor' || role === 'commentator' ? role : 'viewer'
				)
			);
		}
	}

	return maps.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Map short ids are unique among the caller's own and shared maps. */
export function buildMapShortIds(maps: AccessibleMap[]): Map<string, string> {
	return buildShortIds(maps.map((map) => map.id));
}

/**
 * Resolves the `map` argument: a short id from list_maps, a longer prefix, or
 * a full UUID (which also opens templates and maps not in the list).
 */
export async function resolveMapId(
	supabase: SupabaseClient,
	userId: string,
	input: string
): Promise<string> {
	const normalized = normalizeIdInput(input);
	if (UUID_PATTERN.test(normalized)) return normalized.toLowerCase();

	const maps = await listAccessibleMaps(supabase, userId);
	const result = resolveShortId(normalized, maps.map((map) => map.id));
	if (result.ok) return result.id;

	if (result.reason === 'invalid') {
		throw new McpToolError(
			`"${input}" is not a map id. Use the id from list_maps (6+ hex characters).`
		);
	}
	if (result.reason === 'ambiguous') {
		const shortIds = buildMapShortIds(maps);
		const options = maps
			.filter((map) => result.candidates.includes(map.id))
			.map((map) => `${shortIds.get(map.id)} (${map.title})`)
			.join(', ');
		throw new McpToolError(`Map id "${input}" matches several maps: ${options}.`);
	}
	throw new McpToolError(`No map "${input}" among your maps. Run list_maps to see ids.`);
}
