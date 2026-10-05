'use client';

import { PluginUiTree } from '@/components/plugins/plugin-ui-tree';
import {
	pluginRenderKey,
	rememberPluginRender,
	usePluginRender,
} from '@/components/plugins/use-plugin-render';
import { applyGraphOps } from '@/lib/extensions/graph-ops';
import {
	findActivePluginKind,
	humanizeKind,
} from '@/lib/plugins/active-plugins';
import { findCatalogPlugin } from '@/lib/plugins/catalog';
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
import { Info, Loader2, Puzzle, TriangleAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

/** How a plugin node can be shown right now. */
type PluginNodeState = 'live' | 'loading' | 'off' | 'failed' | 'missing';

export interface PluginNodeContentProps {
	/** Null in the node editor preview, where nothing is saved. */
	nodeId: string | null;
	extension: NodeExtensionData;
	/** Plain-text fallback (the node's content) when there's no saved view. */
	fallbackText?: string;
	canEdit: boolean;
	/** Renders draft data live, without actions (node editor preview). */
	preview?: boolean;
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
	const isCatalogPlugin = Boolean(findCatalogPlugin(extension.pluginId));
	const isEnabled = mapPlugins.some(
		(record) => record.pluginId === extension.pluginId
	);

	const state: PluginNodeState = active
		? 'live'
		: loaded?.status === 'error'
			? 'failed'
			: loaded?.status === 'loading' ||
				  (isCatalogPlugin && (!mapPluginsLoaded || isEnabled))
				? 'loading'
				: isCatalogPlugin
					? 'off'
					: 'missing';

	// A collaborator may have just turned this plugin on.
	useEffect(() => {
		if (state === 'off' && !preview) refreshMapPluginsSoon();
	}, [state, preview, refreshMapPluginsSoon]);

	const data = useMemo<PluginData | null>(() => {
		if (!active) return null;
		const checked = validatePluginData(active.kind, extension.data);
		return checked.ok ? checked.data : null;
	}, [active, extension.data]);

	const render = usePluginRender({
		active,
		data,
		canEdit: canEdit && !preview,
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
		? `${label} data on this node isn't valid`
		: (render.error ?? null);

	const handleAction = async (action: string, payload: unknown) => {
		if (!active || !data || !nodeId || busy) return;
		setBusy(true);
		try {
			const host = await loadPluginHost();
			const ctx = { canEdit: true };
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
			rememberPluginRender(pluginRenderKey(active, nextData, true), rendered);

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

	const dimmed = state === 'off' || state === 'missing' || state === 'failed';

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
