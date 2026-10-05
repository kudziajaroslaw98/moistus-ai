'use client';

import type { PluginData } from '@/lib/plugins/plugin-fields';
import { loadPluginHost } from '@/lib/plugins/runtime/load-plugin-host';
import type { PluginRenderResult } from '@/lib/plugins/runtime/plugin-host';
import type { ActivePluginKind } from '@/types/plugins';
import { useCallback, useEffect, useReducer, useState } from 'react';

const MAX_CACHED_RENDERS = 300;

/** Renders keyed by plugin, version, kind, permission and data; shared by every node. */
const renderCache = new Map<string, PluginRenderResult>();

export function pluginRenderKey(
	active: ActivePluginKind,
	data: PluginData,
	canEdit: boolean
): string {
	const { manifest, kind, generation } = active;
	// The generation changes when a developer reloads the plugin with new code.
	return `${manifest.id}@${manifest.version}#${generation}:${kind.kind}:${canEdit ? 1 : 0}:${JSON.stringify(data)}`;
}

export function rememberPluginRender(key: string, result: PluginRenderResult) {
	renderCache.delete(key);
	renderCache.set(key, result);
	if (renderCache.size > MAX_CACHED_RENDERS) {
		const oldest = renderCache.keys().next().value;
		if (oldest !== undefined) renderCache.delete(oldest);
	}
}

interface UsePluginRenderOptions {
	active: ActivePluginKind | null;
	data: PluginData | null;
	canEdit: boolean;
	/** Debounce for fast-changing input (the node editor preview). */
	debounceMs?: number;
}

/**
 * The plugin's live view for some data. Renders run in the plugin worker once per
 * distinct input; until a render arrives callers show the node's saved view.
 */
export function usePluginRender({
	active,
	data,
	canEdit,
	debounceMs = 0,
}: UsePluginRenderOptions) {
	const key = active && data ? pluginRenderKey(active, data, canEdit) : null;
	const [, rerender] = useReducer((count: number) => count + 1, 0);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const cached = key ? renderCache.get(key) : undefined;
	const error = key ? (errors[key] ?? null) : null;
	const hasError = error !== null;

	useEffect(() => {
		if (!key || !active || !data || hasError || renderCache.has(key)) return;
		let cancelled = false;
		const timer = setTimeout(async () => {
			try {
				const host = await loadPluginHost();
				const result = await host.render(
					active.manifest.id,
					active.kind,
					data,
					{
						canEdit,
					}
				);
				rememberPluginRender(key, result);
				if (!cancelled) rerender();
			} catch (renderError) {
				if (cancelled) return;
				setErrors((current) => ({
					...current,
					[key]:
						renderError instanceof Error
							? renderError.message
							: 'Render failed',
				}));
			}
		}, debounceMs);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
		// `key` covers active, data and canEdit.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key, hasError, debounceMs]);

	const retry = useCallback(() => {
		if (!key) return;
		setErrors(({ [key]: _cleared, ...rest }) => rest);
	}, [key]);

	return {
		result: cached ?? null,
		error,
		pending: Boolean(key) && !cached && !hasError,
		retry,
	};
}
