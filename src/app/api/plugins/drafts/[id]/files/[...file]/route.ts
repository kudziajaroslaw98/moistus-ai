import { respondError } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { draftAccessError } from '@/lib/plugins/server/plugin-drafts';
import { NextResponse } from 'next/server';
import { z } from 'zod';

type FileParams = { id: string; file: string[] };

const draftIdSchema = z.string().uuid();

function asObject(text: string): Record<string, unknown> | null {
	try {
		const value: unknown = JSON.parse(text);
		return value && typeof value === 'object' && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}

/**
 * A draft's two files, read by the author's own browser when they try the draft on a map
 * (the Developer loader fetches `manifest.json`, then the file its `main` names). Same
 * rules as the library's files route: plain text, `nosniff` and a sandbox policy so a
 * browser never runs the code as a script; plugins only run inside the QuickJS sandbox.
 * Never cached, since the author keeps editing. The manifest always carries the id Shiko
 * gave the draft.
 */
export const GET = withApiValidation<unknown, never, FileParams>(
	z.any().nullish(),
	async (_req, _body, supabase, user, params) => {
		const denied = await draftAccessError(supabase, user);
		if (denied) return denied;
		const id = draftIdSchema.safeParse(params?.id);
		if (!id.success) return respondError('Not found.', 404);

		const { data: row, error } = await supabase
			.from('plugin_drafts')
			.select('plugin_id, manifest_text, code')
			.eq('id', id.data)
			.eq('user_id', user.id)
			.maybeSingle();
		if (error)
			return respondError('Could not load the draft.', 500, error.message);
		if (!row) return respondError('Not found.', 404);

		const file = (params?.file ?? []).join('/');
		const manifest = asObject(row.manifest_text as string);

		let body: string;
		let type: string;
		if (file === 'manifest.json') {
			if (!manifest) {
				return respondError('manifest.json isn’t valid JSON yet.', 422);
			}
			body = JSON.stringify({ ...manifest, id: row.plugin_id });
			type = 'application/json; charset=utf-8';
		} else if (file === 'plugin.js' || (manifest && file === manifest.main)) {
			body = row.code as string;
			type = 'text/plain; charset=utf-8';
		} else {
			return respondError('Not found.', 404);
		}

		return new NextResponse(body, {
			headers: {
				'Content-Type': type,
				'X-Content-Type-Options': 'nosniff',
				'Content-Security-Policy': "sandbox; default-src 'none'",
				'Cache-Control': 'no-store',
			},
		});
	}
);
