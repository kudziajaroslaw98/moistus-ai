'use client';

import {
	catalogManifestUrl,
	latestCatalogVersion,
	type PluginCatalogEntry,
} from '@/lib/plugins/catalog';
import {
	pluginManifestSchema,
	type PluginManifest,
} from '@/lib/plugins/manifest-schema';
import { useEffect, useState } from 'react';

const manifestCache = new Map<string, Promise<PluginManifest | null>>();

function fetchManifest(url: string): Promise<PluginManifest | null> {
	let pending = manifestCache.get(url);
	if (!pending) {
		pending = fetch(url)
			.then((response) => (response.ok ? response.json() : null))
			.then((json) => {
				const parsed = pluginManifestSchema.safeParse(json);
				return parsed.success ? parsed.data : null;
			})
			.catch(() => null);
		manifestCache.set(url, pending);
	}
	return pending;
}

/**
 * Latest catalog manifests keyed by plugin id, fetched once per session.
 * `null` means the manifest couldn't be loaded; a missing key means it's still loading.
 */
export function useCatalogManifests(
	entries: readonly PluginCatalogEntry[],
	enabled: boolean
) {
	const [manifests, setManifests] = useState<
		Record<string, PluginManifest | null>
	>({});

	useEffect(() => {
		if (!enabled) return;
		let cancelled = false;
		for (const entry of entries) {
			const url = catalogManifestUrl(entry.id, latestCatalogVersion(entry).version);
			void fetchManifest(url).then((manifest) => {
				if (!cancelled)
					setManifests((current) => ({ ...current, [entry.id]: manifest }));
			});
		}
		return () => {
			cancelled = true;
		};
	}, [entries, enabled]);

	return manifests;
}

/** One catalog version's manifest (for checking nodes before an update or roll back). */
export function useCatalogVersionManifest(
	pluginId: string,
	version: string | null
): PluginManifest | null | undefined {
	const url = version ? catalogManifestUrl(pluginId, version) : null;
	const [result, setResult] = useState<{
		url: string;
		manifest: PluginManifest | null;
	} | null>(null);

	useEffect(() => {
		if (!url) return;
		let cancelled = false;
		void fetchManifest(url).then((manifest) => {
			if (!cancelled) setResult({ url, manifest });
		});
		return () => {
			cancelled = true;
		};
	}, [url]);

	return url && result?.url === url ? result.manifest : undefined;
}
