'use client';

import { PluginRefreshBar } from '@/components/plugins/plugin-refresh-bar';
import { PluginUiTree } from '@/components/plugins/plugin-ui-tree';
import { usePluginBranch } from '@/components/plugins/use-plugin-branch';
import { usePluginLibrary } from '@/components/plugins/use-plugin-library';
import {
	pluginRenderKey,
	rememberPluginRender,
	usePluginRender,
} from '@/components/plugins/use-plugin-render';
import { applyGraphOps } from '@/lib/extensions/graph-ops';
import { pluginCallContext } from '@/lib/plugins/call-context';
import {
	findActivePluginKind,
	humanizeKind,
} from '@/lib/plugins/active-plugins';
import { compareVersions, findCatalogPlugin } from '@/lib/plugins/catalog';
import {
	validatePluginData,
	type PluginData,
} from '@/lib/plugins/plugin-fields';
import { PLUGIN_ICONS } from '@/lib/plugins/plugin-icons';
import { loadPluginHost } from '@/lib/plugins/runtime/load-plugin-host';
import { validatePluginTree } from '@/lib/plugins/ui-tree';
import useAppStore from '@/store/mind-map-store';
import type { NodeExtensionData } from '@/types/extensions';
import { cn } from '@/utils/cn';
import { Ban, Info, Loader2, Puzzle, TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

/** "Reported for ads" → "Reported for ads." so it reads as a sentence. */
function asSentence(text: string): string {
	const trimmed = text.trim();
	return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/** How a plugin node can be shown right now. */
type PluginNodeState = 'live' | 'loading' | 'off' | 'failed' | 'missing' | 'disabled';

export interface PluginNodeContentProps {
	/** Null in the node editor preview, where nothing is saved. */
	nodeId: string | null;
	extension: NodeExtensionData;
	/** Plain-text fallback (the node's content) when there's no saved view. */
	fallbackText?: string;
	canEdit: boolean;
	/** Renders draft data live, without actions (node editor preview). */
	preview?: boolean;
	/** Whose branch `ctx.branch` describes when `nodeId` is null (editing an existing node). */
	branchRootId?: string | null;
}

/**
 * Body of a plugin node: the plugin's live view when it runs on this map, otherwise the
 * last saved view (`metadata.extension.snapshot`) with a note saying why.
 */
export function PluginNodeContent({
	nodeId,
	extension,
	fallbackText,
	canEdit,
	preview = false,
	branchRootId = null,
}: PluginNodeContentProps) {
	const { loadedPlugins, mapPlugins, mapPluginsLoaded, refreshMapPluginsSoon } =
		useAppStore(
			useShallow((state) => ({
				loadedPlugins: state.loadedPlugins,
				mapPlugins: state.mapPlugins,
				mapPluginsLoaded: state.mapPluginsLoaded,
				refreshMapPluginsSoon: state.refreshMapPluginsSoon,
			}))
		);
	const [busy, setBusy] = useState(false);

	const active = useMemo(
		() =>
			findActivePluginKind(loadedPlugins, extension.pluginId, extension.kind),
		[loadedPlugins, extension.pluginId, extension.kind]
	);
	const loaded = Object.values(loadedPlugins).find(
		(plugin) => (plugin.manifest?.id ?? plugin.key) === extension.pluginId
	);
	// Library plugins are only known once the library has loaded; until then a node of
	// an unknown plugin may still be one of them, so it shows as loading, not missing.
	const library = usePluginLibrary(false);
	const isCatalogPlugin = Boolean(findCatalogPlugin(extension.pluginId));
	const mayBeLibraryPlugin = !isCatalogPlugin && !library.loaded;
	const isEnabled = mapPlugins.some(
		(record) => record.pluginId === extension.pluginId
	);

	const state: PluginNodeState = active
		? 'live'
		: loaded?.disabledReason
			? 'disabled'
			: loaded?.status === 'error'
			? 'failed'
			: loaded?.status === 'loading' ||
				  mayBeLibraryPlugin ||
				  (isCatalogPlugin && (!mapPluginsLoaded || isEnabled))
				? 'loading'
				: isCatalogPlugin
					? 'off'
					: 'missing';

	// Saved by a newer version than this browser runs: the owner may have updated it.
	const savedByNewerVersion =
		active?.source === 'catalog' &&
		compareVersions(extension.version, active.manifest.version) > 0;

	// A collaborator may have just turned this plugin on or updated it.
	useEffect(() => {
		if ((state === 'off' || savedByNewerVersion) && !preview)
			refreshMapPluginsSoon();
	}, [state, savedByNewerVersion, preview, refreshMapPluginsSoon]);

	const data = useMemo<PluginData | null>(() => {
		if (!active) return null;
		const checked = validatePluginData(active.kind, extension.data);
		return checked.ok ? checked.data : null;
	}, [active, extension.data]);

	const branch = usePluginBranch(
		nodeId ?? branchRootId,
		Boolean(active?.readsBranch)
	);
	const render = usePluginRender({
		active,
		data,
		canEdit: canEdit && !preview,
		branch,
		debounceMs: preview ? 150 : 0,
	});

	const snapshot = useMemo(() => {
		const checked = validatePluginTree(extension.snapshot);
		return checked.ok ? checked.tree : null;
	}, [extension.snapshot]);

	const tree = render.result?.tree ?? snapshot;
	const label =
		active?.kind.label ?? extension.kindLabel ?? humanizeKind(extension.kind);
	const KindIcon = active ? PLUGIN_ICONS[active.kind.icon] : Puzzle;
	const pluginName = active?.manifest.name ?? label;
	const invalidData = Boolean(active) && data === null;
	const renderError = invalidData
		? savedByNewerVersion
			? `Saved by ${pluginName} ${extension.version}. This map uses ${active?.manifest.version}, so it shows the last saved view.`
			: `${label} data on this node isn't valid`
		: (render.error ?? null);

	const handleAction = async (action: string, payload: unknown) => {
		if (!active || !data || !nodeId || busy) return;
		setBusy(true);
		try {
			const host = await loadPluginHost();
			const ctx = pluginCallContext(true, branch);
			const nextData = await host.action(
				active.manifest.id,
				active.kind,
				action,
				data,
				payload,
				ctx
			);
			const rendered = await host.render(
				active.manifest.id,
				active.kind,
				nextData,
				ctx
			);
			rememberPluginRender(
				pluginRenderKey(active, nextData, true, branch),
				rendered
			);

			const result = await applyGraphOps(
				useAppStore.getState,
				[
					{
						type: 'updateNode',
						nodeId,
						data: {
							content: rendered.summary,
							metadata: {
								extension: {
									...extension,
									kindLabel: active.kind.label,
									width: active.kind.width,
									version: active.manifest.version,
									data: nextData,
									snapshot: rendered.tree,
								},
							},
						},
					},
				],
				{ kind: 'plugin', id: active.manifest.id, label: active.manifest.name },
				{ label: 'updateNode' }
			);
			if (!result.ok) toast.error(result.error);
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: `${pluginName} couldn't do that`
			);
		} finally {
			setBusy(false);
		}
	};

	const dimmed =
		state === 'off' || state === 'missing' || state === 'failed' || state === 'disabled';

	return (
		<div className='flex flex-col gap-3' data-plugin-state={state}>
			<div className='flex items-center justify-between gap-2'>
				<div className='flex min-w-0 items-center gap-1.5 text-white/60'>
					<KindIcon aria-hidden className='size-3.5 shrink-0' />

					<span className='truncate text-xs font-medium'>{label}</span>
				</div>

				{(state === 'loading' ||
					(state === 'live' && (render.pending || busy))) && (
					<Loader2
						aria-label={`Loading ${pluginName}`}
						className='size-3.5 shrink-0 animate-spin text-primary-400'
						role='status'
					/>
				)}
			</div>

			<div className={cn('flex flex-col gap-3', dimmed && 'opacity-60')}>
				{tree ? (
					<PluginUiTree
						disabled={busy || state !== 'live' || renderError !== null}
						tree={tree}
						onAction={
							state === 'live' && canEdit && !preview && render.result
								? handleAction
								: undefined
						}
					/>
				) : (
					<p className='whitespace-pre-wrap text-sm text-white/60'>
						{fallbackText?.trim() ||
							(state === 'loading' ? 'Loading…' : 'No saved view yet')}
					</p>
				)}
			</div>

			{state === 'live' && renderError && (
				<div
					className='flex items-center gap-2 rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-1.5 text-xs leading-4 text-amber-400/90'
					role='alert'
				>
					<TriangleAlert aria-hidden className='size-3.5 shrink-0' />

					<span className='flex-1'>
						{invalidData
							? renderError
							: `${pluginName} couldn't update. Showing the last saved view.`}
					</span>

					{!invalidData && (
						<button
							className='nodrag rounded-sm px-1 font-semibold text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60'
							type='button'
							onClick={(event) => {
								event.stopPropagation();
								render.retry();
							}}
						>
							Retry
						</button>
					)}
				</div>
			)}

			{!preview &&
				nodeId &&
				(active?.canRefresh || extension.fetchedAt) && (
					<PluginRefreshBar
						active={active}
						canEdit={canEdit}
						fetchedAt={extension.fetchedAt}
						nodeId={nodeId}
						pluginId={extension.pluginId}
					/>
				)}

			{state === 'live' && active?.readsBranch && !preview && (
				<span className='text-xs text-white/50'>Updates as the branch changes</span>
			)}

			{state === 'disabled' && (
				<p
					className='flex items-start gap-1.5 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-xs leading-4 text-red-300'
					data-testid='plugin-node-status'
					role='status'
				>
					<Ban aria-hidden className='mt-px size-3.5 shrink-0' />

					{`Turned off by Shiko: ${asSentence(loaded?.disabledReason ?? '')} This is its last saved view.`}
				</p>
			)}

			{(state === 'off' || state === 'missing' || state === 'failed') && (
				<span
					className='flex items-center gap-1.5 self-start rounded-sm bg-zinc-700/50 px-2 py-0.5 text-xs leading-[18px] text-white/60'
					data-testid='plugin-node-status'
					title={state === 'failed' ? (loaded?.error ?? undefined) : undefined}
				>
					<Info aria-hidden className='size-3 shrink-0' />

					{state === 'off'
						? `${pluginName} is off on this map`
						: state === 'failed'
							? `${pluginName} couldn't load`
							: `Needs the ${label} plugin (${extension.pluginId})`}
				</span>
			)}
		</div>
	);
}
