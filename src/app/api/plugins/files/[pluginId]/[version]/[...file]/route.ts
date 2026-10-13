import { respondError } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import { isPluginAdmin } from '@/lib/plugins/server/plugin-library';
import { NextResponse } from 'next/server';
import { z } from 'zod';

type FileParams = { pluginId: string; version: string; file: string[] };

/**
 * A library plugin's files: `manifest.json` and the code file its manifest names.
 * Published versions are readable by anyone signed in (they're public library code);
 * versions in review or turned off only by their author and Shiko's reviewers.
 *
 * Code is sent as plain text with `nosniff` and a sandbox CSP, so a browser never runs
 * it as a script: plugins only ever run inside the QuickJS sandbox.
 */
export const GET = withApiValidation<unknown, never, FileParams>(
	z.any().nullish(),
	async (_req, _body, _supabase, user, params) => {
		const pluginId = params?.pluginId ?? '';
		const version = params?.version ?? '';
		const file = (params?.file ?? []).join('/');
		if (!/^\d+\.\d+\.\d+$/.test(version)) return respondError('Not found.', 404);

		const admin = createServiceRoleClient();
		const { data: row, error } = await admin
			.from('plugin_versions')
			.select('status, manifest, code, submitted_by, disabled_at')
			.eq('plugin_id', pluginId)
			.eq('version', version)
			.maybeSingle();
		if (error) return respondError('Could not load the plugin.', 500, error.message);
		if (!row) return respondError('Not found.', 404);

		const { data: plugin } = await admin
			.from('plugins')
			.select('disabled_at')
			.eq('id', pluginId)
			.maybeSingle();
		const isPublic = row.status === 'published' && !row.disabled_at && !plugin?.disabled_at;
		if (!isPublic && row.submitted_by !== user.id && !(await isPluginAdmin(admin, user.id))) {
			return respondError('Not found.', 404);
		}

		const manifest = row.manifest as { main?: unknown };
		const body =
			file === 'manifest.json'
				? JSON.stringify(row.manifest)
				: file === manifest.main
					? (row.code as string)
					: null;
		if (body === null) return respondError('Not found.', 404);

		return new NextResponse(body, {
			headers: {
				'Content-Type':
					file === 'manifest.json'
						? 'application/json; charset=utf-8'
						: 'text/plain; charset=utf-8',
				'X-Content-Type-Options': 'nosniff',
				'Content-Security-Policy': "sandbox; default-src 'none'",
				// Published versions never change; others may be replaced or turned off.
				'Cache-Control': isPublic ? 'private, max-age=31536000, immutable' : 'no-store',
			},
		});
	}
);
