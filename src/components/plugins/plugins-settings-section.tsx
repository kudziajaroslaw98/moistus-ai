'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
	FIRST_PARTY_PLUGINS,
	type PluginCatalogEntry,
} from '@/lib/plugins/catalog';
import {
	pluginManifestSchema,
	type PluginManifest,
} from '@/lib/plugins/manifest-schema';
import { PLUGIN_ICONS } from '@/lib/plugins/plugin-icons';
import useAppStore from '@/store/mind-map-store';
import { Loader2, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { motion, type MotionProps } from 'motion/react';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

const manifestCache = new Map<string, Promise<PluginManifest | null>>();

/** Catalog manifests for the list, fetched once per session. */
function useCatalogManifests(
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
			const url = `${entry.baseUrl}manifest.json`;
			if (!manifestCache.has(url)) {
				manifestCache.set(
					url,
					fetch(url)
						.then((response) => (response.ok ? response.json() : null))
						.then((json) => {
							const parsed = pluginManifestSchema.safeParse(json);
							return parsed.success ? parsed.data : null;
						})
						.catch(() => null)
				);
			}
			void manifestCache.get(url)!.then((manifest) => {
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

interface PluginsSettingsSectionProps {
	motionProps: Pick<MotionProps, 'initial' | 'animate' | 'transition'>;
}

/**
 * Map Settings section where the owner turns plugins on for the map, and loads
 * plugins they're building from localhost (this browser only).
 */
export function PluginsSettingsSection({
	motionProps,
}: PluginsSettingsSectionProps) {
	const {
		isOwner,
		mapPlugins,
		loadedPlugins,
		devPluginUrls,
		nodes,
		setMapPluginEnabled,
		addDevPlugin,
		removeDevPlugin,
		reloadDevPlugin,
	} = useAppStore(
		useShallow((state) => ({
			isOwner: Boolean(
				state.mindMap &&
				state.currentUser &&
				!state.currentUser.is_anonymous &&
				state.mindMap.user_id === state.currentUser.id
			),
			mapPlugins: state.mapPlugins,
			loadedPlugins: state.loadedPlugins,
			devPluginUrls: state.devPluginUrls,
			nodes: state.nodes,
			setMapPluginEnabled: state.setMapPluginEnabled,
			addDevPlugin: state.addDevPlugin,
			removeDevPlugin: state.removeDevPlugin,
			reloadDevPlugin: state.reloadDevPlugin,
		}))
	);
	const manifests = useCatalogManifests(FIRST_PARTY_PLUGINS, isOwner);
	const [busyPluginId, setBusyPluginId] = useState<string | null>(null);
	const [confirmingOff, setConfirmingOff] = useState<string | null>(null);
	const [devUrl, setDevUrl] = useState('');
	const [devError, setDevError] = useState<string | null>(null);
	const [isLoadingDev, setIsLoadingDev] = useState(false);

	if (!isOwner) return null;

	const nodeCountFor = (pluginId: string) =>
		nodes.filter(
			(node) =>
				node.data.node_type === 'extensionNode' &&
				node.data.metadata?.extension?.pluginId === pluginId
		).length;

	const setEnabled = async (pluginId: string, enabled: boolean) => {
		setConfirmingOff(null);
		setBusyPluginId(pluginId);
		await setMapPluginEnabled(pluginId, enabled);
		setBusyPluginId(null);
	};

	const requestToggle = (pluginId: string, enabled: boolean) => {
		if (!enabled && nodeCountFor(pluginId) > 0) {
			setConfirmingOff(pluginId);
			return;
		}
		void setEnabled(pluginId, enabled);
	};

	const loadDevPlugin = async () => {
		setIsLoadingDev(true);
		setDevError(null);
		const result = await addDevPlugin(devUrl);
		setIsLoadingDev(false);
		if (result.ok) setDevUrl('');
		else setDevError(result.error ?? 'The plugin could not be loaded');
	};

	return (
		<motion.section
			{...motionProps}
			className='space-y-4 rounded-lg border border-border-subtle bg-base/60 p-4'
			data-testid='plugins-settings-section'
		>
			<div className='space-y-1'>
				<h3 className='text-lg font-semibold text-text-primary'>Plugins</h3>

				<p className='text-xs text-text-secondary'>
					Add new kinds of nodes to this map. Plugins run in a sandbox and
					everyone on the map sees them.
				</p>
			</div>

			{FIRST_PARTY_PLUGINS.map((entry) => {
				const manifest = manifests[entry.id];
				const isEnabled = mapPlugins.some(
					(record) => record.pluginId === entry.id
				);
				const loaded = loadedPlugins[entry.id];
				const Icon = manifest ? PLUGIN_ICONS[manifest.icon] : null;
				const switchId = `plugin-switch-${entry.id}`;
				const nodeCount = nodeCountFor(entry.id);
				const name = manifest?.name ?? entry.id;

				return (
					<div
						className='space-y-3 rounded-lg border border-zinc-800 bg-base p-3'
						key={entry.id}
					>
						<div className='flex items-start gap-3'>
							<span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/15 text-primary-400'>
								{Icon ? <Icon aria-hidden className='size-[18px]' /> : null}
							</span>

							<div className='flex min-w-0 flex-1 flex-col gap-0.5'>
								<label
									className='text-sm font-medium text-text-primary'
									htmlFor={switchId}
								>
									{name}
								</label>

								<span className='text-xs text-text-secondary'>
									{manifest
										? `by ${manifest.author} · v${manifest.version}`
										: `v${entry.version}`}
								</span>

								{manifest?.description && (
									<span className='mt-1 text-[13px] leading-[18px] text-zinc-300'>
										{manifest.description}
									</span>
								)}
							</div>

							{busyPluginId === entry.id ? (
								<Loader2
									aria-label={`Saving ${name}`}
									className='mt-1 size-5 animate-spin text-text-secondary'
								/>
							) : (
								// The Switch is a hidden checkbox; the label makes its track clickable.
								<label
									className='mt-0.5 shrink-0 cursor-pointer'
									htmlFor={switchId}
								>
									<Switch
										checked={isEnabled}
										disabled={!manifest}
										id={switchId}
										onCheckedChange={(checked) =>
											requestToggle(entry.id, checked)
										}
									/>
								</label>
							)}
						</div>

						<p className='flex items-start gap-2 text-xs text-text-secondary'>
							<ShieldCheck
								aria-hidden
								className='size-3.5 shrink-0 text-emerald-400/90'
							/>
							Sees and changes only its own nodes. No internet access.
						</p>

						{isEnabled && loaded?.status === 'error' && (
							<p className='text-xs text-error-500' role='alert'>
								{`${name} couldn't load: ${loaded.error ?? 'unknown error'}`}
							</p>
						)}

						{confirmingOff === entry.id && (
							<div className='space-y-2.5 rounded-lg border border-amber-400/20 bg-amber-400/8 p-3'>
								<p className='text-[13px] leading-[18px] text-amber-200'>
									{`${nodeCount} ${name} ${nodeCount === 1 ? 'node' : 'nodes'} on this map will show ${nodeCount === 1 ? 'its' : 'their'} last saved view until you turn ${name} back on.`}
								</p>

								<div className='flex justify-end gap-2'>
									<Button
										onClick={() => setConfirmingOff(null)}
										variant='outline'
									>
										Keep on
									</Button>

									<Button onClick={() => void setEnabled(entry.id, false)}>
										Turn off
									</Button>
								</div>
							</div>
						)}
					</div>
				);
			})}

			<div className='space-y-2 border-t border-border-subtle pt-4'>
				<h4 className='text-sm font-medium text-text-primary'>Developer</h4>

				<p className='text-xs text-text-secondary'>
					Load a plugin you&apos;re building from localhost. Only you see it, in
					this browser.
				</p>

				<form
					className='flex gap-2'
					onSubmit={(event) => {
						event.preventDefault();
						void loadDevPlugin();
					}}
				>
					<label className='sr-only' htmlFor='dev-plugin-url'>
						Plugin manifest URL
					</label>

					<Input
						disabled={isLoadingDev}
						error={Boolean(devError)}
						id='dev-plugin-url'
						onChange={(event) => setDevUrl(event.target.value)}
						placeholder='http://localhost:5173/manifest.json'
						value={devUrl}
					/>

					<Button
						disabled={!devUrl.trim() || isLoadingDev}
						type='submit'
						variant='outline'
					>
						{isLoadingDev ? (
							<Loader2 className='size-4 animate-spin' />
						) : (
							'Load'
						)}
					</Button>
				</form>

				{devError && (
					<p className='text-xs text-error-500' role='alert'>
						{devError}
					</p>
				)}

				{devPluginUrls.map((url) => {
					const loaded = loadedPlugins[url];
					const manifest = loaded?.manifest;
					const Icon = manifest ? PLUGIN_ICONS[manifest.icon] : null;
					let host = url;
					try {
						host = new URL(url).host;
					} catch {
						// Stored URLs are validated; keep the raw text if not.
					}
					return (
						<div
							className='flex items-center gap-3 rounded-lg border border-zinc-800 bg-base p-2.5'
							key={url}
						>
							<span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/6 text-zinc-300'>
								{loaded?.status === 'loading' ? (
									<Loader2 aria-hidden className='size-4 animate-spin' />
								) : Icon ? (
									<Icon aria-hidden className='size-[18px]' />
								) : null}
							</span>

							<div className='flex min-w-0 flex-1 flex-col gap-0.5'>
								<span className='flex items-center gap-1.5'>
									<span className='truncate text-sm font-medium text-text-primary'>
										{manifest?.name ?? 'Developer plugin'}
									</span>

									<span className='rounded px-1.5 text-[10px] font-semibold leading-4 tracking-[0.08em] text-blue-200 bg-blue-500/20'>
										DEV
									</span>
								</span>

								<span
									className={
										loaded?.status === 'error'
											? 'truncate text-xs text-error-500'
											: 'truncate text-xs text-text-secondary'
									}
								>
									{loaded?.status === 'error'
										? (loaded.error ?? 'Could not load')
										: `${manifest?.id ?? 'loading…'} · ${host}`}
								</span>
							</div>

							<Button
								aria-label={`Reload ${manifest?.name ?? 'developer plugin'}`}
								onClick={() => void reloadDevPlugin(url)}
								size='icon'
								variant='ghost'
							>
								<RefreshCw className='size-4' />
							</Button>

							<Button
								aria-label={`Remove ${manifest?.name ?? 'developer plugin'}`}
								onClick={() => removeDevPlugin(url)}
								size='icon'
								variant='ghost'
							>
								<X className='size-4' />
							</Button>
						</div>
					);
				})}
			</div>
		</motion.section>
	);
}
