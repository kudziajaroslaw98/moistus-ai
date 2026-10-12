'use client';

import { localDateString, pluginCallContext } from '@/lib/plugins/call-context';
import type {
	PluginManifest,
	PluginNodeKind,
} from '@/lib/plugins/manifest-schema';
import {
	loadDraftProgram,
	type DraftProgram,
} from '@/lib/plugins/playground/draft-program';
import type { FetchAll } from '@/lib/plugins/playground/mock-network';
import { sampleBranch, sampleRefs } from '@/lib/plugins/playground/sample-data';
import type { PluginCheck } from '@/lib/plugins/plugin-checks';
import {
	collectNodeRefs,
	validatePluginData,
	type PluginData,
} from '@/lib/plugins/plugin-fields';
import { loadPlaygroundPluginHost } from '@/lib/plugins/runtime/load-plugin-host';
import type { PluginHost } from '@/lib/plugins/runtime/plugin-host';
import type { PluginUiNode } from '@/lib/plugins/ui-tree';
import type { PluginDraftCheckSummary } from '@/types/plugin-drafts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** Pauses after typing before the draft is loaded, checked and redrawn. */
export const PROGRAM_DEBOUNCE_MS = 400;
export const CHECKS_DEBOUNCE_MS = 700;
export const RENDER_DEBOUNCE_MS = 120;

const messageOf = (error: unknown) =>
	error instanceof Error ? error.message : 'Something went wrong';

/** First `max` characters, so a long answer doesn't flood the status line. */
const brief = (text: string, max = 200) =>
	text.length > max ? `${text.slice(0, max)}…` : text;

/**
 * The playground's own plugin host: a worker of its own, started when the page opens and
 * stopped when it closes, so a draft never shares a runtime with the plugins on a map.
 */
export function usePlaygroundHost(): PluginHost | null {
	const [host, setHost] = useState<PluginHost | null>(null);

	useEffect(() => {
		let cancelled = false;
		let created: PluginHost | null = null;
		void loadPlaygroundPluginHost().then((loaded) => {
			if (cancelled) {
				loaded.dispose();
				return;
			}
			created = loaded;
			setHost(loaded);
		});
		return () => {
			cancelled = true;
			created?.dispose();
		};
	}, []);

	return host;
}

/**
 * Loads the draft's code into the host (after typing pauses) and says whether it's usable:
 * a valid manifest, code that loads, every kind defined. A late answer for older text is
 * dropped.
 */
export function useDraftProgram(
	host: PluginHost | null,
	manifestText: string,
	code: string
) {
	const [program, setProgram] = useState<DraftProgram | null>(null);

	useEffect(() => {
		if (!host) return;
		let current = true;
		const timer = setTimeout(() => {
			void loadDraftProgram(host, manifestText, code).then((loaded) => {
				if (current) setProgram(loaded);
			});
		}, PROGRAM_DEBOUNCE_MS);
		return () => {
			current = false;
			clearTimeout(timer);
		};
	}, [host, manifestText, code]);

	return { program };
}

function parseJson(
	text: string
): { ok: true; value: unknown } | { ok: false; message: string } {
	try {
		return { ok: true, value: JSON.parse(text) };
	} catch (error) {
		return { ok: false, message: messageOf(error) };
	}
}

/**
 * The same automatic checks the submit sheet runs, kept up to date while the author types.
 * Unreadable JSON is reported as the first check failing, without calling the host.
 */
export function useDraftChecks(
	host: PluginHost | null,
	manifestText: string,
	code: string,
	previousManifest: unknown
) {
	const [checks, setChecks] = useState<PluginCheck[]>([]);
	const [done, setDone] = useState(false);

	useEffect(() => {
		let current = true;
		const timer = setTimeout(() => {
			const parsed = parseJson(manifestText);
			if (!parsed.ok) {
				setChecks([
					{ label: 'Manifest is valid', ok: false, detail: parsed.message },
				]);
				setDone(true);
				return;
			}
			if (!host) return;
			host
				.check({ manifest: parsed.value, code, previousManifest })
				.then((result) => {
					if (!current) return;
					setChecks(result.checks);
					setDone(true);
				})
				.catch((error: unknown) => {
					if (!current) return;
					setChecks([
						{
							label: 'The checks could not run',
							ok: false,
							detail: messageOf(error),
						},
					]);
					setDone(true);
				});
		}, CHECKS_DEBOUNCE_MS);
		return () => {
			current = false;
			clearTimeout(timer);
		};
	}, [host, manifestText, code, previousManifest]);

	const summary = useMemo<PluginDraftCheckSummary | null>(
		() =>
			done
				? {
						passed: checks.filter((check) => check.ok).length,
						total: checks.length,
					}
				: null,
		[checks, done]
	);
	return { checks, summary };
}

interface PlaygroundNodeOptions {
	host: PluginHost | null;
	manifest: PluginManifest | null;
	kind: PluginNodeKind | null;
	data: PluginData;
	canEdit: boolean;
	/** The preview's data changed (a button ran, or a refresh came back). */
	onData: (data: PluginData) => void;
	/** Answers a refresh's requests: typed JSON, or the real network worker. */
	fetchAll: FetchAll;
}

export interface PlaygroundLastResult {
	ok: boolean;
	text: string;
}

/**
 * The preview node: draws the sample data with the plugin's `render`, and runs its
 * actions and `refresh` the way a map would (every result is validated by the host).
 * Data that doesn't fit the kind's fields isn't drawn; `fieldErrors` says which fields.
 */
export function usePlaygroundNode({
	host,
	manifest,
	kind,
	data,
	canEdit,
	onData,
	fetchAll,
}: PlaygroundNodeOptions) {
	const [view, setView] = useState<{
		tree: PluginUiNode;
		summary: string;
	} | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [error, setError] = useState<string | null>(null);
	const [last, setLast] = useState<PlaygroundLastResult | null>(null);
	const [refreshing, setRefreshing] = useState(false);
	const validated = useRef<PluginData | null>(null);

	const readsBranch = manifest?.permissions.includes('branch:read') ?? false;
	const readsRefs = manifest?.permissions.includes('nodes:refs') ?? false;
	const context = useMemo(
		() =>
			pluginCallContext(
				canEdit,
				readsBranch ? sampleBranch(localDateString()) : null,
				readsRefs && kind ? sampleRefs(collectNodeRefs(kind, data)) : null
			),
		[canEdit, readsBranch, readsRefs, kind, data]
	);

	useEffect(() => {
		if (!host || !manifest || !kind) return;
		let current = true;
		const timer = setTimeout(() => {
			const checked = validatePluginData(kind, data);
			if (!checked.ok) {
				setFieldErrors(
					Object.fromEntries(
						checked.errors.map((issue) => [issue.field, issue.message])
					)
				);
				return;
			}
			validated.current = checked.data;
			setFieldErrors({});
			host
				.render(manifest.id, kind, checked.data, context)
				.then((rendered) => {
					if (!current) return;
					setView(rendered);
					setError(null);
				})
				.catch((reason: unknown) => {
					if (current) setError(messageOf(reason));
				});
		}, RENDER_DEBOUNCE_MS);
		return () => {
			current = false;
			clearTimeout(timer);
		};
	}, [host, manifest, kind, data, context]);

	/** An `edit` button opens the node editor on a map; here there's nothing to run. */
	const noteEdit = useCallback(
		() =>
			setLast({
				ok: true,
				text: 'This button opens the node editor on a map. There’s nothing to run here.',
			}),
		[]
	);

	const runAction = useCallback(
		async (action: string, payload?: unknown) => {
			const input = validated.current;
			if (!host || !manifest || !kind || !input) return;
			try {
				const next = await host.action(
					manifest.id,
					kind,
					action,
					input,
					payload,
					context
				);
				onData(next);
				setLast({
					ok: true,
					text: brief(`${action} → ${JSON.stringify(next)}`),
				});
			} catch (reason) {
				setLast({ ok: false, text: brief(`${action} → ${messageOf(reason)}`) });
			}
		},
		[host, manifest, kind, context, onData]
	);

	const refresh = useCallback(async () => {
		const input = validated.current;
		if (!host || !manifest || !kind || !input) return;
		setRefreshing(true);
		try {
			const result = await host.refresh(
				manifest.id,
				kind,
				input,
				context,
				fetchAll
			);
			onData(result.data);
			setLast({
				ok: true,
				text: brief(`refresh → ${JSON.stringify(result.data)}`),
			});
		} catch (reason) {
			setLast({ ok: false, text: brief(`refresh → ${messageOf(reason)}`) });
		} finally {
			setRefreshing(false);
		}
	}, [host, manifest, kind, context, fetchAll, onData]);

	return {
		view,
		fieldErrors,
		error,
		last,
		refreshing,
		canRefresh:
			host && manifest && kind
				? host.canRefresh(manifest.id, kind.kind)
				: false,
		runAction,
		noteEdit,
		refresh,
	};
}
