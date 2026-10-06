import { respondError, respondSuccess } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import type { PluginLibraryResponse } from '@/lib/plugins/catalog';
import { loadPluginLibrary } from '@/lib/plugins/server/plugin-library';
import { z } from 'zod';

/**
 * The plugin library for the browser: published community plugins (versions, code
 * fingerprints and powers, never code) and every plugin or version Shiko turned off.
 * Shiko's own plugins ship with the app, so they appear here only when turned off.
 */
export const GET = withApiValidation<unknown, PluginLibraryResponse>(
	z.any().nullish(),
	async () => {
		try {
			const library = await loadPluginLibrary(createServiceRoleClient());
			const response = respondSuccess(library);
			// Turning a plugin off must reach every browser quickly.
			response.headers.set('Cache-Control', 'no-store');
			return response;
		} catch (error) {
			return respondError(
				'Could not load the plugin library.',
				500,
				error instanceof Error ? error.message : undefined
			);
		}
	}
);
