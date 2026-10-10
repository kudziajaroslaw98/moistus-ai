'use client';

import type { PluginMapSummary } from '@/app/api/plugins/maps/route';
import {
	CARD_MENU_TRIGGER_CLASS,
	CatalogCard,
	CatalogCardSkeleton,
	CatalogEmptyState,
	CatalogGrid,
	OFF_HUE,
	type CatalogChip,
} from '@/components/dashboard/catalog-card';
import { CreateTile } from '@/components/dashboard/create-tile';
import { useDashboardSearch } from '@/components/dashboard/dashboard-shell-context';
import { ViewToggle } from '@/components/dashboard/view-toggle';
import {
	ChooseMapsPopover,
	pinnedVersion,
} from '@/components/plugins/choose-maps-popover';
import { PluginCardMenu } from '@/components/plugins/plugin-card-menu';
import { PluginUpdateDetails } from '@/components/plugins/plugin-update-details';
import { PluginsSlot } from '@/components/plugins/plugins-page-tabs';
import { useCatalogManifests } from '@/components/plugins/use-catalog-manifests';
import { usePluginLibrary } from '@/components/plugins/use-plugin-library';
import { Button } from '@/components/ui/button';
import {
	compareVersions,
	disabledReason,
	findCatalogPlugin,
	latestCatalogVersion,
	mapPluginRequest,
	type PluginCatalogEntry,
} from '@/lib/plugins/catalog';
import type { PluginManifest } from '@/lib/plugins/manifest-schema';
import { PLUGIN_ICONS } from '@/lib/plugins/plugin-icons';
import {
	describePowerKind,
	PLUGIN_POWER_HUES,
	powerKindOfPermissions,
} from '@/lib/plugins/powers';
import type { DashboardViewMode } from '@/types/dashboard-map';
import { Globe, ListTree, Loader2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';

const MAPS_KEY = '/api/plugins/maps';

const fetchMaps = async (url: string): Promise<PluginMapSummary[]> => {
	const response = await fetch(url);
	if (!response.ok) throw new Error('Failed to load your maps');
	const { data } = (await response.json()) as {
		data: { maps: PluginMapSummary[] };
	};
	return data.maps;
};

function GroupHeader({ label, count }: { label: string; count: number }) {
	return (
		<div className='mb-4 mt-8 flex items-center gap-3 first:mt-6'>
			<h2 className='text-sm font-semibold text-white'>{label}</h2>

			<span className='font-mono text-xs text-zinc-500'>{count}</span>

			<span aria-hidden className='h-px flex-1 bg-[#1d1f24]' />
		</div>
	);
}

const POWER_ICONS = {
	own: ShieldCheck,
	branch: ListTree,
	network: Globe,
} as const;

/** Detail row of a plugin card: its `$kind` words and what it can reach. */
function PluginDetail({ manifest }: { manifest: PluginManifest }) {
	const kind = powerKindOfPermissions(manifest.permissions);
	const PowerIcon = POWER_ICONS[kind];

	return (
		<>
			{manifest.nodeKinds.slice(0, 2).map((nodeKind) => (
				<code
					className='shrink-0 rounded bg-teal-500/15 px-1.5 py-px font-mono text-[11.5px] text-teal-300'
					key={nodeKind.kind}
				>
					${nodeKind.kind}
				</code>
			))}

			<span className='flex min-w-0 items-center gap-1.5'>
				<PowerIcon aria-hidden className='size-3.5 shrink-0' />

				<span className='truncate'>
					{describePowerKind(manifest.permissions)}
				</span>
			</span>
		</>
	);
}

interface UpdateBoxProps {
	entry: PluginCatalogEntry;
	/** The user's maps on an older version. */
	outdated: PluginMapSummary[];
	isUpdating: boolean;
	onUpdate: () => void;
}

/** "0.2.0 ready for 2 of your maps": notes, power changes and one button for all of them. */
function UpdateBox({ entry, outdated, isUpdating, onUpdate }: UpdateBoxProps) {
	const latest = latestCatalogVersion(entry).version;
	const oldest = outdated
		.map((map) => pinnedVersion(map, entry.id) ?? latest)
		.sort(compareVersions)[0];
	const count = outdated.length;
	const maps = `${count} ${count === 1 ? 'map' : 'maps'}`;

	return (
		<div
			className='space-y-2 rounded-2xl border border-[#1d1f24] bg-[#0e0f12] p-4'
			data-testid='plugin-update'
		>
			<p className='flex items-center gap-2 text-[13px] font-semibold text-text-primary'>
				<span aria-hidden className='size-1.5 rounded-full bg-sky-400' />

				{`${latest} ready for ${count} of your maps`}
			</p>

			<PluginUpdateDetails entry={entry} fromVersion={oldest} />

			<p className='text-xs leading-[17px] text-text-secondary'>
				Nodes with data the new version doesn&apos;t accept keep their last
				saved view. You can roll back from each map&apos;s Plugins panel.
			</p>

			<div className='flex justify-end'>
				<Button disabled={isUpdating} onClick={onUpdate}>
					{isUpdating ? (
						<Loader2 aria-label='Updating' className='size-4 animate-spin' />
					) : (
						`Update ${maps}`
					)}
				</Button>
			</div>
		</div>
	);
}

/** Dashboard Plugins › Library: Shiko and community plugins, and which of your maps use them. */
export function PluginsContent() {
	const library = usePluginLibrary();
	const manifests = useCatalogManifests(library.plugins, true);
	const { query, setQuery } = useDashboardSearch();
	const [viewMode, setViewMode] = useState<DashboardViewMode>('grid');
	const needle = query.trim().toLowerCase();
	const filtered = library.plugins.filter((entry) => {
		if (!needle) return true;
		const manifest = manifests[entry.id];
		return `${manifest?.name ?? entry.id} ${manifest?.description ?? ''}`
			.toLowerCase()
			.includes(needle);
	});
	const shikoEntries = filtered.filter((entry) => entry.source !== 'community');
	const libraryEntries = filtered.filter(
		(entry) => entry.source === 'community'
	);
	const { data: maps, error, isLoading, mutate } = useSWR(MAPS_KEY, fetchMaps);
	const [busy, setBusy] = useState<string[]>([]);
	const [updating, setUpdating] = useState<string[]>([]);

	const setPluginOnMap = async (
		pluginId: string,
		name: string,
		map: PluginMapSummary,
		enabled: boolean
	) => {
		const busyKey = `${pluginId}:${map.id}`;
		setBusy((current) => [...current, busyKey]);
		const latest = latestCatalogVersion(findCatalogPlugin(pluginId)!).version;
		const withChange = (current: PluginMapSummary[] = []) =>
			current.map((candidate) => {
				if (candidate.id !== map.id) return candidate;
				const others = candidate.plugins.filter(
					(plugin) => plugin.pluginId !== pluginId
				);
				return {
					...candidate,
					plugins: enabled
						? [...others, { pluginId, version: latest }]
						: others,
				};
			});
		try {
			await mutate(
				async (current) => {
					const response = await fetch(
						...mapPluginRequest(map.id, pluginId, { enabled })
					);
					if (!response.ok) throw new Error('Request failed');
					return withChange(current);
				},
				{
					optimisticData: (current) => withChange(current),
					rollbackOnError: true,
					revalidate: false,
				}
			);
		} catch {
			toast.error(
				`Couldn’t turn ${name} ${enabled ? 'on' : 'off'} for “${map.title || 'Untitled map'}”`
			);
		} finally {
			setBusy((current) => current.filter((key) => key !== busyKey));
		}
	};

	/** Moves every outdated map to the latest version, one request per map. */
	const updatePluginOnMaps = async (
		entry: PluginCatalogEntry,
		name: string,
		targets: PluginMapSummary[]
	) => {
		const version = latestCatalogVersion(entry).version;
		setUpdating((current) => [...current, entry.id]);
		const updatedIds: string[] = [];
		for (const map of targets) {
			try {
				const response = await fetch(
					...mapPluginRequest(map.id, entry.id, { version })
				);
				if (response.ok) updatedIds.push(map.id);
			} catch {
				// Counted as not updated below.
			}
		}
		await mutate(
			(current) =>
				current?.map((map) =>
					updatedIds.includes(map.id)
						? {
								...map,
								plugins: map.plugins.map((plugin) =>
									plugin.pluginId === entry.id ? { ...plugin, version } : plugin
								),
							}
						: map
				),
			{ revalidate: false }
		);
		setUpdating((current) => current.filter((id) => id !== entry.id));

		const failed = targets.length - updatedIds.length;
		if (failed > 0) {
			toast.error(
				`Couldn’t update ${name} on ${failed} of your ${targets.length === 1 ? 'map' : 'maps'}`
			);
		} else {
			toast.success(
				`${name} is on ${version} in ${targets.length} ${targets.length === 1 ? 'map' : 'maps'}`
			);
		}
	};

	const renderEntry = (entry: PluginCatalogEntry) => {
		const manifest = manifests[entry.id];
		const name = manifest?.name ?? entry.id;
		const latest = latestCatalogVersion(entry).version;
		const offReason = disabledReason(entry.id, latest);
		const onCount = (maps ?? []).filter(
			(map) => pinnedVersion(map, entry.id) !== undefined
		).length;
		const hasUpdate = (maps ?? []).some((map) => {
			const version = pinnedVersion(map, entry.id);
			return version !== undefined && compareVersions(version, latest) < 0;
		});

		if (!manifest) {
			// Still loading its manifest (or it failed): keep the card's place in the grid.
			return (
				<CatalogCardSkeleton count={1} key={entry.id} viewMode={viewMode} />
			);
		}

		const chips: CatalogChip[] = [
			...(offReason ? [{ label: 'Turned off', tone: 'red' as const }] : []),
			...(hasUpdate
				? [{ label: `Update ${latest}`, tone: 'amber' as const }]
				: []),
			{ label: entry.source === 'community' ? 'Community' : 'Shiko' },
		];
		const mapsText = isLoading
			? 'Loading maps…'
			: onCount === 0
				? 'Not on a map'
				: `On in ${onCount} ${onCount === 1 ? 'map' : 'maps'}`;

		return (
			<CatalogCard
				anchorId={`plugin-${entry.id}`}
				chips={chips}
				detail={<PluginDetail manifest={manifest} />}
				hue={
					offReason
						? OFF_HUE
						: PLUGIN_POWER_HUES[powerKindOfPermissions(manifest.permissions)]
				}
				icon={PLUGIN_ICONS[manifest.icon]}
				key={entry.id}
				meta={`v${manifest.version} · ${mapsText}`}
				title={name}
				viewMode={viewMode}
				description={
					offReason
						? `Turned off by Shiko: ${offReason}`
						: (manifest.description ?? '')
				}
				action={
					<ChooseMapsPopover
						busyMapIds={busy
							.filter((key) => key.startsWith(`${entry.id}:`))
							.map((key) => key.slice(entry.id.length + 1))}
						isLoading={isLoading}
						manifest={manifest}
						maps={maps}
						name={name}
						offReason={offReason}
						pluginId={entry.id}
						onToggle={(map, enabled) =>
							void setPluginOnMap(entry.id, name, map, enabled)
						}
					/>
				}
				menu={
					<PluginCardMenu
						pluginId={entry.id}
						pluginName={name}
						showAbout={false}
						triggerClassName={CARD_MENU_TRIGGER_CLASS}
						version={latest}
					/>
				}
			/>
		);
	};

	const updates = filtered.flatMap((entry) => {
		const latest = latestCatalogVersion(entry).version;
		const outdated = (maps ?? []).filter((map) => {
			const version = pinnedVersion(map, entry.id);
			return version !== undefined && compareVersions(version, latest) < 0;
		});
		return outdated.length > 0 ? [{ entry, outdated }] : [];
	});

	// Title, tabs and the page width come from the plugins layout (PluginsPageFrame).
	return (
		<>
			<PluginsSlot slot='controls'>
				<ViewToggle onChange={setViewMode} value={viewMode} />
			</PluginsSlot>

			{error && (
				<div
					className='mt-6 flex items-center justify-between gap-3 rounded-xl border border-error-500/30 bg-error-500/10 px-3 py-2 text-sm text-error-200'
					role='alert'
				>
					Couldn&apos;t load your maps.
					<Button onClick={() => void mutate()} size='sm' variant='outline'>
						Try again
					</Button>
				</div>
			)}

			{updates.length > 0 && (
				<div className='mt-6 flex flex-col gap-3'>
					{updates.map(({ entry, outdated }) => (
						<UpdateBox
							entry={entry}
							isUpdating={updating.includes(entry.id)}
							key={entry.id}
							outdated={outdated}
							onUpdate={() =>
								void updatePluginOnMaps(
									entry,
									manifests[entry.id]?.name ?? entry.id,
									outdated
								)
							}
						/>
					))}
				</div>
			)}

			{filtered.length === 0 ? (
				<CatalogEmptyState
					actionLabel='Show all plugins'
					hint='Try another search term.'
					onAction={() => setQuery('')}
					title='No plugins found'
				/>
			) : (
				<>
					{shikoEntries.length > 0 && (
						<section aria-label='Shiko plugins'>
							<GroupHeader count={shikoEntries.length} label='Shiko plugins' />

							<CatalogGrid viewMode={viewMode}>
								{shikoEntries.map(renderEntry)}
							</CatalogGrid>
						</section>
					)}

					{libraryEntries.length > 0 && (
						<section aria-label='Community'>
							<GroupHeader count={libraryEntries.length} label='Community' />

							<CatalogGrid viewMode={viewMode}>
								{libraryEntries.map(renderEntry)}
							</CatalogGrid>
						</section>
					)}
				</>
			)}

			<div className='mt-8'>
				<CreateTile
					hint='Write one in plain JavaScript, try it from localhost, then submit it.'
					href='/dashboard/plugins/build'
					title='Build a plugin'
					viewMode='list'
				/>
			</div>
		</>
	);
}
