'use client';

import { commandRegistry } from '@/components/node-editor/core/commands/command-registry';
import { PLUGIN_ICONS } from '@/lib/plugins/plugin-icons';
import type { AppState } from '@/store/app-state';
import useAppStore from '@/store/mind-map-store';
import type { ActivePluginKind, PluginKindRef } from '@/types/plugins';
import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

/** Opens the node editor for a new plugin node in the middle of the viewport. */
export function openPluginNodeEditor(
	state: AppState,
	extensionKind: PluginKindRef
) {
	const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
	const position = state.reactFlowInstance?.screenToFlowPosition(center) ?? {
		x: 0,
		y: 0,
	};
	state.openNodeEditor({
		mode: 'create',
		position,
		screenPosition: center,
		parentNode: null,
		suggestedType: 'extensionNode',
		extensionKind,
	});
}

/**
 * Makes every running plugin kind available where nodes are created: its `$kind`
 * trigger in the node editor and "Add <kind>" in Ctrl/Cmd+K. (Never the right-click
 * menu, which stays editing-only.)
 */
export function PluginRegistrar() {
	const { loadedPlugins, registerContribution, ownerMapId } = useAppStore(
		useShallow((state) => ({
			loadedPlugins: state.loadedPlugins,
			registerContribution: state.registerContribution,
			ownerMapId:
				state.mapId &&
				state.currentUser &&
				!state.currentUser.is_anonymous &&
				state.mindMap?.user_id === state.currentUser.id
					? state.mapId
					: null,
		}))
	);

	const readyKinds = useMemo<ActivePluginKind[]>(
		() =>
			Object.values(loadedPlugins).flatMap((plugin) =>
				plugin.status === 'ready' && plugin.manifest
					? plugin.manifest.nodeKinds.map((kind) => ({
							manifest: plugin.manifest!,
							kind,
							source: plugin.source,
							generation: plugin.generation,
						}))
					: []
			),
		[loadedPlugins]
	);

	useEffect(() => {
		const cleanups: Array<() => void> = [];
		for (const active of readyKinds) {
			const ref = { pluginId: active.manifest.id, kind: active.kind.kind };
			const icon = PLUGIN_ICONS[active.kind.icon];
			try {
				cleanups.push(
					commandRegistry.register({
						id: `plugin:${ref.pluginId}:${ref.kind}`,
						trigger: `$${ref.kind}`,
						label: active.kind.label,
						description: `${active.kind.description} (${active.manifest.name} plugin)`,
						icon,
						category: 'interactive',
						triggerType: 'node-type',
						nodeType: 'extensionNode',
						extension: ref,
						priority: 50,
					})
				);
			} catch (error) {
				// Another plugin already uses this trigger; the first one keeps it.
				console.warn(
					'[plugins]',
					error instanceof Error ? error.message : error
				);
			}
			cleanups.push(
				registerContribution({
					id: `plugin:${ref.pluginId}:${ref.kind}:add`,
					title: `Add ${active.kind.label}`,
					description: `Plugin · ${active.kind.description}`,
					icon,
					keywords: ['plugin', 'add', ref.kind, active.manifest.name],
					owner: ref.pluginId,
					scopes: ['map'],
					placements: ['commandPalette'],
					requiresEdit: true,
					when: (ctx) => ctx.isMapReady,
					run: (ctx) => openPluginNodeEditor(ctx.getState(), ref),
				})
			);
		}
		return () => cleanups.forEach((cleanup) => cleanup());
	}, [readyKinds, registerContribution]);

	// Developer plugins load for the owner, whose identity can arrive after the map.
	useEffect(() => {
		if (ownerMapId) void useAppStore.getState().fetchMapPlugins(ownerMapId);
	}, [ownerMapId]);

	return null;
}
