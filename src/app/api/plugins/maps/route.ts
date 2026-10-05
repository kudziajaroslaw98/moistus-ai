import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { z } from 'zod';

export interface PluginMapSummary {
	id: string;
	title: string;
	/** Plugins turned on for this map. */
	pluginIds: string[];
}

/**
 * The signed-in user's own maps (not templates) and the plugins each has on, for
 * the dashboard Plugins page. Turning plugins on or off uses the per-map route.
 */
export const GET = withApiValidation(
	z.any().nullish(),
	async (_req, _body, supabase, user) => {
		if (user.is_anonymous) {
			return respondError(
				'Create an account to use plugins.',
				403,
				'Anonymous user'
			);
		}

		const { data, error } = await supabase
			.from('mind_maps')
			.select('id, title, map_plugins(plugin_id)')
			.eq('user_id', user.id)
			.eq('is_template', false)
			.order('updated_at', { ascending: false });

		if (error) {
			return respondError('Failed to load your maps.', 500, error.message);
		}

		const maps: PluginMapSummary[] = (data ?? []).map((map) => ({
			id: map.id,
			title: map.title,
			pluginIds: (map.map_plugins ?? []).map(
				(row: { plugin_id: string }) => row.plugin_id
			),
		}));
		return respondSuccess({ maps });
	}
);
