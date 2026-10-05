'use client';

import { SidePanel } from '@/components/side-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useIsMac } from '@/hooks/use-platform';
import { useTouchFirst } from '@/hooks/use-touch-first';
import {
	availableCatalogUpdate,
	FIRST_PARTY_PLUGINS,
	latestCatalogVersion,
	type PluginCatalogEntry,
} from '@/lib/plugins/catalog';
import type { PluginManifest } from '@/lib/plugins/manifest-schema';
import { PLUGIN_ICONS } from '@/lib/plugins/plugin-icons';
import useAppStore from '@/store/mind-map-store';
import type { NodeExtensionData } from '@/types/extensions';
import type { LoadedPlugin, MapPluginRecord } from '@/types/plugins';
import {
	ArrowUpRight,
	Loader2,
	Lock,
	RefreshCw,
	ShieldCheck,
	X,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { PluginVersionControls } from './plugin-version-controls';
import { useCatalogManifests } from './use-catalog-manifests';

const UPDATE_LATER_KEY = 'shiko_plugin_update_later_v1';

/** Updates the owner chose "Later" for on this map, by plugin id (this browser only). */
function readLaterVersions(userId: string, mapId: string): Record<string, string> {
	try {
		const raw = window.localStorage.getItem(`${UPDATE_LATER_KEY}:${userId}:${mapId}`);
		const parsed: unknown = raw ? JSON.parse(raw) : {};
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
			? Object.fromEntries(
					Object.entries(parsed).filter(
						(pair): pair is [string, string] => typeof pair[1] === 'string'
					)
				)
			: {};
	} catch {
		return {};
	}
}

function writeLaterVersions(
	userId: string,
	mapId: string,
	versions: Record<string, string>
) {
	try {
		window.localStorage.setItem(
			`${UPDATE_LATER_KEY}:${userId}:${mapId}`,
			JSON.stringify(versions)
		);
	} catch {
		// Blocked storage: "Later" lasts until reload.
	}
}

const subtleLinkClass =
	'inline-flex items-center gap-0.5 rounded-sm transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60';

function GroupHeader({
	label,
	count,
}: {
	label: string;
	count?: number | string;
}) {
	return (
		<div className='flex items-center gap-2.5 pt-1'>
			<h3 className='text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55'>
				{label}
			</h3>

			<span aria-hidden className='h-px flex-1 bg-white/[0.08]' />

			{count !== undefined && (
				<span className='text-[12px] tabular-nums text-white/55'>{count}</span>
			)}
		</div>
	);
}

/** "Add one by typing $metric …": where a running plugin's nodes come from. */
function AddHint({ manifest }: { manifest: PluginManifest }) {
	const isMac = useIsMac();
	const isTouchFirst = useTouchFirst();
	const kinds = manifest.nodeKinds;

	return (
		<p className='rounded-lg bg-white/[0.035] px-2.5 py-2 text-xs leading-[18px] text-zinc-300'>
			Add one by typing{' '}

			{kinds.map((kind, index) => (
				<Fragment key={kind.kind}>
					{index > 0 && (index === kinds.length - 1 ? ' or ' : ', ')}

					<code className='rounded bg-teal-500/15 px-1.5 py-px font-mono text-[11.5px] text-teal-300'>
						${kind.kind}
					</code>
				</Fragment>
			))}{' '}
			in the node editor

			{isTouchFirst ? (
				'.'
			) : (
				<>
					, or press{' '}

					<kbd className='rounded border border-zinc-700 px-1 font-sans text-[11px] text-zinc-200'>
						{isMac ? '⌘K' : 'Ctrl+K'}
					</kbd>{' '}

					and choose{' '}

					{kinds.length === 1 ? `Add ${kinds[0].label}` : `an Add ${manifest.name} entry`}
					.
				</>
			)}
		</p>
	);
}

interface PluginCardProps {
	entry: PluginCatalogEntry;
	manifest: PluginManifest | null | undefined;
	loaded: LoadedPlugin | undefined;
	/** The map's `map_plugins` row, when the plugin is on. */
	record: MapPluginRecord | undefined;
	/** This plugin's nodes on the map. */
	extensions: readonly NodeExtensionData[];
	isUpdateDismissed: boolean;
	isEnabled: boolean;
	isOwner: boolean;
	canEdit: boolean;
	isBusy: boolean;
	nodeCount: number;
	isConfirmingOff: boolean;
	onToggle: (enabled: boolean) => void;
	onConfirmOff: () => void;
	onKeepOn: () => void;
	onChangeVersion: (version: string) => Promise<boolean>;
	onUpdateLater: (version: string) => void;
	onUpdateReview: () => void;
}

function PluginCard({
	entry,
	manifest,
	loaded,
	record,
	extensions,
	isUpdateDismissed,
	isEnabled,
	isOwner,
	canEdit,
	isBusy,
	nodeCount,
	isConfirmingOff,
	onToggle,
	onConfirmOff,
	onKeepOn,
	onChangeVersion,
	onUpdateLater,
	onUpdateReview,
}: PluginCardProps) {
	const shouldReduceMotion = useReducedMotion();
	const Icon = manifest ? PLUGIN_ICONS[manifest.icon] : null;
	const switchId = `plugin-switch-${entry.id}`;
	const name = manifest?.name ?? entry.id;
	const isRunning = isEnabled && loaded?.status === 'ready' && loaded.manifest;

	return (
		// relative: version boxes that are leaving are positioned against the card.
		<div className='relative space-y-3 rounded-lg border border-zinc-800 bg-base p-3'>
			<div className='flex items-start gap-3'>
				<span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/15 text-primary-400'>
					{Icon ? <Icon aria-hidden className='size-[18px]' /> : null}
				</span>

				<div className='flex min-w-0 flex-1 flex-col gap-0.5'>
					{isOwner ? (
						<label
							className='text-sm font-medium text-text-primary'
							htmlFor={switchId}
						>
							{name}
						</label>
					) : (
						<span className='text-sm font-medium text-text-primary'>{name}</span>
					)}

					<span className='text-xs text-text-secondary'>
						{`${manifest ? `by ${manifest.author} · ` : ''}v${record?.version ?? latestCatalogVersion(entry).version}`}
					</span>

					{manifest?.description && (
						<span className='mt-1 text-[13px] leading-[18px] text-zinc-300'>
							{manifest.description}
						</span>
					)}
				</div>

				{!isOwner ? (
					<span className='mt-0.5 flex h-[22px] shrink-0 items-center rounded-full bg-emerald-400/12 px-2 text-xs font-medium text-emerald-300'>
						On
					</span>
				) : isBusy ? (
					<Loader2
						aria-label={`Saving ${name}`}
						className='mt-1 size-5 animate-spin text-text-secondary'
					/>
				) : (
					// The Switch is a hidden checkbox; the label makes its track clickable.
					<label className='mt-0.5 shrink-0 cursor-pointer' htmlFor={switchId}>
						<Switch
							checked={isEnabled}
							disabled={!manifest}
							id={switchId}
							onCheckedChange={onToggle}
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

			{isOwner && record && !isConfirmingOff && (
				<PluginVersionControls
					entry={entry}
					extensions={extensions}
					isUpdateDismissed={isUpdateDismissed}
					name={name}
					record={record}
					onChangeVersion={onChangeVersion}
					onLater={onUpdateLater}
					onReview={onUpdateReview}
				/>
			)}

			{isRunning && canEdit && !isConfirmingOff && (
				<AddHint manifest={loaded.manifest!} />
			)}

			<AnimatePresence initial={false}>
				{isConfirmingOff && (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className='space-y-2.5 rounded-lg border border-amber-400/20 bg-amber-400/8 p-3'
						exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -4 }}
						initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -4 }}
						transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: 'easeOut' }}
					>
						<p className='text-[13px] leading-[18px] text-amber-200'>
							{`${nodeCount} ${name} ${nodeCount === 1 ? 'node' : 'nodes'} on this map will show ${nodeCount === 1 ? 'its' : 'their'} last saved view until you turn ${name} back on.`}
						</p>

						<div className='flex justify-end gap-2'>
							<Button onClick={onKeepOn} variant='outline'>
								Keep on
							</Button>

							<Button onClick={onConfirmOff}>Turn off</Button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

/** Owner-only: load a plugin you're building from localhost (this browser only). */
function DeveloperSection() {
	const { devPluginUrls, loadedPlugins, addDevPlugin, removeDevPlugin, reloadDevPlugin } =
		useAppStore(
			useShallow((state) => ({
				devPluginUrls: state.devPluginUrls,
				loadedPlugins: state.loadedPlugins,
				addDevPlugin: state.addDevPlugin,
				removeDevPlugin: state.removeDevPlugin,
				reloadDevPlugin: state.reloadDevPlugin,
			}))
		);
	const [devUrl, setDevUrl] = useState('');
	const [devError, setDevError] = useState<string | null>(null);
	const [isLoadingDev, setIsLoadingDev] = useState(false);

	const loadDevPlugin = async () => {
		setIsLoadingDev(true);
		setDevError(null);
		const result = await addDevPlugin(devUrl);
		setIsLoadingDev(false);
		if (result.ok) setDevUrl('');
		else setDevError(result.error ?? 'The plugin could not be loaded');
	};

	return (
		<section aria-label='Developer' className='flex flex-col gap-2.5 pt-2'>
			<GroupHeader label='Developer' />

			<p className='text-xs text-text-secondary'>
				Load a plugin you&apos;re building from localhost. Only you see it, in
				this browser.
			</p>

			<Link
				className={`${subtleLinkClass} self-start text-[13px] font-medium text-primary-400 hover:text-primary-300`}
				href='/dashboard/plugins/build'
			>
				How to build a plugin
				<ArrowUpRight aria-hidden className='size-3.5' />
			</Link>

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
					{isLoadingDev ? <Loader2 className='size-4 animate-spin' /> : 'Load'}
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

								<span className='rounded bg-blue-500/20 px-1.5 text-[10px] font-semibold leading-4 tracking-[0.08em] text-blue-200'>
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
		</section>
	);
}

/**
 * Plugins side panel: the owner turns Shiko plugins on or off for the map and loads
 * plugins they're building; everyone else sees which plugins the map uses.
 * Non-modal, so plugin nodes stay visible while plugins change.
 */
export function PluginsPanel() {
	const {
		isOpen,
		isOwner,
		canEdit,
		mapId,
		userId,
		developerMode,
		mapPlugins,
		loadedPlugins,
		nodes,
		setPopoverOpen,
		setMapPluginEnabled,
		setMapPluginVersion,
	} = useAppStore(
		useShallow((state) => {
			const isOwner = Boolean(
				state.mindMap &&
				state.currentUser &&
				!state.currentUser.is_anonymous &&
				state.mindMap.user_id === state.currentUser.id
			);
			return {
				isOpen: state.popoverOpen.plugins,
				isOwner,
				canEdit: isOwner || Boolean(state.permissions?.can_edit),
				mapId: state.mapId,
				userId: state.currentUser?.id ?? null,
				developerMode: state.userProfile?.preferences?.developerMode === true,
				mapPlugins: state.mapPlugins,
				loadedPlugins: state.loadedPlugins,
				nodes: state.nodes,
				setPopoverOpen: state.setPopoverOpen,
				setMapPluginEnabled: state.setMapPluginEnabled,
				setMapPluginVersion: state.setMapPluginVersion,
			};
		})
	);
	const manifests = useCatalogManifests(FIRST_PARTY_PLUGINS, isOpen);
	const [busyPluginId, setBusyPluginId] = useState<string | null>(null);
	const [confirmingOff, setConfirmingOff] = useState<string | null>(null);
	const storedLater = useMemo(
		() => (isOpen && userId && mapId ? readLaterVersions(userId, mapId) : {}),
		[isOpen, userId, mapId]
	);
	// Later/Review choices made since the panel opened, by `<mapId>:<pluginId>`. They
	// win over stored ones and still work when storage is blocked.
	const [laterChoices, setLaterChoices] = useState<Record<string, string | null>>(
		{}
	);

	const recordFor = (pluginId: string) =>
		mapPlugins.find((record) => record.pluginId === pluginId);
	const isEnabled = (pluginId: string) => Boolean(recordFor(pluginId));
	const extensionsFor = (pluginId: string) =>
		nodes.flatMap((node) => {
			const extension = node.data.metadata?.extension;
			return node.data.node_type === 'extensionNode' &&
				extension?.pluginId === pluginId
				? [extension]
				: [];
		});
	const nodeCountFor = (pluginId: string) => extensionsFor(pluginId).length;

	const setLater = (pluginId: string, version: string | null) => {
		if (!mapId) return;
		setLaterChoices((current) => ({ ...current, [`${mapId}:${pluginId}`]: version }));
		if (!userId) return;
		const next = readLaterVersions(userId, mapId);
		if (version) next[pluginId] = version;
		else delete next[pluginId];
		writeLaterVersions(userId, mapId, next);
	};
	const isUpdateDismissed = (pluginId: string) => {
		const record = recordFor(pluginId);
		const update = record && availableCatalogUpdate(pluginId, record.version);
		const choiceKey = `${mapId}:${pluginId}`;
		const laterVersion =
			choiceKey in laterChoices ? laterChoices[choiceKey] : storedLater[pluginId];
		return Boolean(update && laterVersion === update.version);
	};
	const updateCount = isOwner
		? mapPlugins.filter((record) =>
				availableCatalogUpdate(record.pluginId, record.version)
			).length
		: 0;

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

	// Only the owner can change plugins, so others only see the ones that are on.
	const entries = isOwner
		? FIRST_PARTY_PLUGINS
		: FIRST_PARTY_PLUGINS.filter((entry) => isEnabled(entry.id));

	return (
		<SidePanel
			bodyClassName='p-0'
			data-testid='plugins-panel'
			isOpen={isOpen}
			modal={false}
			title='Plugins'
			onClose={() => {
				setConfirmingOff(null);
				setPopoverOpen({ plugins: false });
			}}
			subtitle={
				<Link
					className={`${subtleLinkClass} text-text-secondary hover:text-text-primary`}
					href='/dashboard/plugins'
				>
					Open Plugins page
					<ArrowUpRight aria-hidden className='size-3.5' />
				</Link>
			}
		>
			<div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4'>
				<p className='text-[13px] leading-[18px] text-text-secondary'>
					New kinds of nodes for this map. Everyone on the map sees them, and
					each plugin only touches its own nodes.
				</p>

				<section aria-label='Shiko plugins' className='flex flex-col gap-3'>
					<GroupHeader
						label='Shiko plugins'
						count={
							updateCount > 0
								? `${updateCount} ${updateCount === 1 ? 'update' : 'updates'}`
								: entries.length
						}
					/>

					{entries.length === 0 ? (
						<p className='text-sm text-text-secondary'>
							No plugins on this map.
						</p>
					) : (
						entries.map((entry) => (
							<PluginCard
								canEdit={canEdit}
								entry={entry}
								extensions={extensionsFor(entry.id)}
								isBusy={busyPluginId === entry.id}
								isConfirmingOff={confirmingOff === entry.id}
								isEnabled={isEnabled(entry.id)}
								isOwner={isOwner}
								isUpdateDismissed={isUpdateDismissed(entry.id)}
								key={entry.id}
								loaded={loadedPlugins[entry.id]}
								manifest={manifests[entry.id]}
								nodeCount={nodeCountFor(entry.id)}
								record={recordFor(entry.id)}
								onConfirmOff={() => void setEnabled(entry.id, false)}
								onKeepOn={() => setConfirmingOff(null)}
								onToggle={(checked) => requestToggle(entry.id, checked)}
								onUpdateLater={(version) => setLater(entry.id, version)}
								onUpdateReview={() => setLater(entry.id, null)}
								onChangeVersion={(version) =>
									setMapPluginVersion(entry.id, version)
								}
							/>
						))
					)}
				</section>

				{!isOwner && (
					<p className='flex items-center gap-2 text-xs text-text-secondary'>
						<Lock aria-hidden className='size-3.5 shrink-0' />
						Only the map owner can turn plugins on or off.
					</p>
				)}

				{isOwner && developerMode && <DeveloperSection />}

				{isOwner && !developerMode && (
					<p className='text-xs leading-[17px] text-text-secondary'>
						Building a plugin? Turn on Developer mode in Map Settings › Editor
						Preferences to load it from localhost.{' '}

						<Link
							className={`${subtleLinkClass} font-medium text-primary-400 hover:text-primary-300`}
							href='/dashboard/plugins/build'
						>
							How to build a plugin
							<ArrowUpRight aria-hidden className='size-3.5' />
						</Link>
					</p>
				)}
			</div>
		</SidePanel>
	);
}
