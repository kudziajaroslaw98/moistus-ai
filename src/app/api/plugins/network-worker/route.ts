import { respondError } from '@/helpers/api/responses';
import { withApiValidation } from '@/helpers/api/with-api-validation';
import { createServiceRoleClient } from '@/helpers/supabase/server';
import {
	networkHostProblem,
	networkHostsOf,
	PLUGIN_POWER_LIMITS,
} from '@/lib/plugins/manifest-schema';
import { pluginNetworkWorkerSource } from '@/lib/plugins/network';
import {
	pluginDisabledReason,
	reviewedPluginVersions,
} from '@/lib/plugins/server/plugin-library';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * The network worker a plugin's refresh runs its requests in (`network-client.ts`).
 * `?plugin=<id>&version=<x.y.z>`: a reviewed version (Shiko's or a published library
 * plugin, not turned off); its sites come from the catalog or database, never the page.
 * `?hosts=a,b`: a developer plugin's sites, only for someone with Developer mode on.
 *
 * The script's Content Security Policy lists exactly those sites in `connect-src`, so the
 * browser itself stops the worker reaching anything else, Shiko included. The request
 * still goes from the editor's browser to the site; this server never sees it.
 */

type HostsResult = { hosts: string[] } | { error: string; status: number };

function blockedHosts(req: Request): string[] {
	const hosts = [new URL(req.url).hostname];
	try {
		const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
		if (supabase) hosts.push(new URL(supabase).hostname);
	} catch {
		// No usable Supabase URL configured: nothing to add.
	}
	return hosts.map((host) => host.toLowerCase());
}

async function reviewedHosts(
	pluginId: string,
	version: string
): Promise<HostsResult> {
	if (!/^\d+\.\d+\.\d+$/.test(version)) {
		return { error: 'Unknown plugin version.', status: 404 };
	}
	const admin = createServiceRoleClient();
	const found = (await reviewedPluginVersions(admin, pluginId)).find(
		(candidate) => candidate.version === version
	);
	if (!found) return { error: 'Unknown plugin version.', status: 404 };
	if (await pluginDisabledReason(admin, pluginId, version)) {
		return { error: 'Shiko turned this plugin off.', status: 404 };
	}
	return { hosts: networkHostsOf(found.permissions) };
}

async function developerHosts(
	supabase: SupabaseClient,
	user: User,
	raw: string
): Promise<HostsResult> {
	const { data: profile } = await supabase
		.from('user_profiles')
		.select('preferences')
		.eq('user_id', user.id)
		.maybeSingle();
	const preferences = profile?.preferences as
		{ developerMode?: unknown } | null | undefined;
	if (preferences?.developerMode !== true) {
		return {
			error: 'Turn on Developer mode to run developer plugins.',
			status: 403,
		};
	}
	const hosts = [...new Set(raw.split(',').map((host) => host.trim()))];
	if (hosts.length > PLUGIN_POWER_LIMITS.networkHosts) {
		return { error: 'Too many sites.', status: 400 };
	}
	const problem = hosts.map(networkHostProblem).find(Boolean);
	if (problem) return { error: problem, status: 400 };
	return { hosts };
}

export const GET = withApiValidation<unknown, never>(
	z.any().nullish(),
	async (req, _body, supabase, user) => {
		const params = new URL(req.url).searchParams;
		const pluginId = params.get('plugin');
		const version = params.get('version');
		const devHosts = params.get('hosts');
		const result =
			pluginId && version
				? await reviewedHosts(pluginId, version)
				: devHosts
					? await developerHosts(supabase, user, devHosts)
					: { error: 'Name a plugin version or its sites.', status: 400 };
		if ('error' in result) return respondError(result.error, result.status);

		const blocked = blockedHosts(req);
		const hosts = result.hosts.filter((host) => !blocked.includes(host));
		if (hosts.length === 0) {
			return respondError('This plugin has no sites to reach.', 404);
		}

		return new NextResponse(
			pluginNetworkWorkerSource({ hosts, blockedHosts: blocked }),
			{
				headers: {
					'Content-Type': 'text/javascript; charset=utf-8',
					'X-Content-Type-Options': 'nosniff',
					// No 'self': the worker can't reach Shiko or its database either.
					'Content-Security-Policy': [
						"default-src 'none'",
						`connect-src ${hosts.map((host) => `https://${host}`).join(' ')}`,
					].join('; '),
					// A version can be turned off at any time; always ask again.
					'Cache-Control': 'no-store',
				},
			}
		);
	}
);
