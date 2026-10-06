'use client';

import type { PluginMapSummary } from '@/app/api/plugins/maps/route';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import {
	needsPowerApproval,
	PluginPowersConfirm,
	PluginPowersLine,
} from '@/components/plugins/plugin-powers';
import { PluginUpdateDetails } from '@/components/plugins/plugin-update-details';
import { useCatalogManifests } from '@/components/plugins/use-catalog-manifests';
import { PluginCardMenu } from '@/components/plugins/plugin-card-menu';
import { PluginsPageTabs } from '@/components/plugins/plugins-page-tabs';
import { usePluginLibrary } from '@/components/plugins/use-plugin-library';
import { Button, buttonVariants } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import {
	compareVersions,
	disabledReason,
	findCatalogPlugin,
	findCatalogVersion,
	latestCatalogVersion,
	mapPluginRequest,
	type PluginCatalogEntry,
} from '@/lib/plugins/catalog';
import type { PluginManifest } from '@/lib/plugins/manifest-schema';
import { PLUGIN_ICONS } from '@/lib/plugins/plugin-icons';
import { cn } from '@/utils/cn';
import {
	ArrowRight,
	Ban,
	Check,
	ChevronDown,
	Code2,
	Loader2,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';

const MAPS_KEY = '/api/plugins/maps';

/** The version a map has this plugin on at, or undefined when it's off. */
const pinnedVersion = (map: PluginMapSummary, pluginId: string) =>
	map.plugins.find((plugin) => plugin.pluginId === pluginId)?.version;

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
		<div className='flex items-center gap-2.5 px-1 pt-1'>
			<h2 className='text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55'>
				{label}
			</h2>

			<span aria-hidden className='h-px flex-1 bg-white/[0.08]' />

			<span className='text-[12px] tabular-nums text-white/55'>{count}</span>
		</div>
	);
}

interface MapPickerProps {
	name: string;
	pluginId: string;
	/** Plugins with powers ask before they're turned on for a map. */
	manifest: PluginManifest | null | undefined;
	/** Turned off by Shiko: maps can turn it off but not on. */
	offReason: string | null;
	maps: PluginMapSummary[] | undefined;
	isLoading: boolean;
	busyMapIds: string[];
	onToggle: (map: PluginMapSummary, enabled: boolean) => void;
}

/** "On in 2 maps" button with the user's own maps as checkboxes. */
function MapPicker({
	name,
	pluginId,
	manifest,
	offReason,
	maps,
	isLoading,
	busyMapIds,
	onToggle,
}: MapPickerProps) {
	const [pendingMap, setPendingMap] = useState<PluginMapSummary | null>(null);
	const count =
		maps?.filter((map) => pinnedVersion(map, pluginId) !== undefined).length ?? 0;
	const label = isLoading
		? 'Loading maps…'
		: count === 0
			? 'Turn on for a map'
			: `On in ${count} ${count === 1 ? 'map' : 'maps'}`;

	return (
		<Popover onOpenChange={(open) => !open && setPendingMap(null)}>
			<PopoverTrigger
				render={
					<Button
						className='shrink-0 gap-1.5'
						disabled={isLoading || !maps}
						variant='outline'
					/>
				}
			>
				{label}

				<ChevronDown aria-hidden className='size-3.5 text-zinc-400' />
			</PopoverTrigger>

			<PopoverContent
				align='end'
				aria-label={`Maps with ${name} on`}
				className='w-72 p-1.5'
				side='bottom'
			>
				<p className='px-2.5 pb-1.5 pt-2 text-xs text-text-secondary'>
					Turn {name} on for
				</p>

				{maps && maps.length > 0 ? (
					<ul className='max-h-72 overflow-y-auto'>
						{maps.map((map) => {
							const version = pinnedVersion(map, pluginId);
							const isOn = version !== undefined;
							const isBusy = busyMapIds.includes(map.id);
							return (
								<li key={map.id}>
									<button
										aria-checked={isOn}
										className='flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm text-text-primary transition-colors duration-200 ease hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 disabled:cursor-wait'
										disabled={isBusy || (Boolean(offReason) && !isOn)}
										role='checkbox'
										type='button'
										onClick={() =>
											!isOn && manifest && needsPowerApproval(manifest)
												? setPendingMap(map)
												: onToggle(map, !isOn)
										}
									>
										<span
											aria-hidden
											className={cn(
												'flex size-4 shrink-0 items-center justify-center rounded border transition-colors duration-200 ease',
												isOn
													? 'border-primary-500 bg-primary-500 text-white'
													: 'border-zinc-600 bg-zinc-800'
											)}
										>
											{isBusy ? (
												<Loader2 className='size-3 animate-spin' />
											) : isOn ? (
												<Check className='size-3' />
											) : null}
										</span>

										<span className='min-w-0 flex-1 truncate'>
											{map.title || 'Untitled map'}
										</span>

										{version && (
											<span className='shrink-0 text-xs tabular-nums text-zinc-500'>
												v{version}
											</span>
										)}
									</button>
								</li>
							);
						})}
					</ul>
				) : (
					<p className='px-2.5 py-2 text-sm text-text-secondary'>
						You don&apos;t own any maps yet.
					</p>
				)}

				{pendingMap && manifest && (
					<div className='px-1 pt-1.5'>
						<PluginPowersConfirm
							fromCatalog
							manifest={manifest}
							onCancel={() => setPendingMap(null)}
							authorHosts={
								findCatalogVersion(pluginId, manifest.version)?.authorHosts
							}
							onConfirm={() => {
								onToggle(pendingMap, true);
								setPendingMap(null);
							}}
						/>
					</div>
				)}

				<div aria-hidden className='mx-1 my-1.5 h-px bg-zinc-800' />

				<p className='px-2.5 pb-2 pt-1 text-xs leading-4 text-zinc-500'>
					Only maps you own are listed. Changes save right away.
				</p>
			</PopoverContent>
		</Popover>
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
			className='space-y-2 rounded-lg border border-primary-500/30 bg-primary-500/[0.07] p-3'
			data-testid='plugin-update'
		>
			<p className='flex items-center gap-2 text-[13px] font-semibold text-text-primary'>
				<span aria-hidden className='size-1.5 rounded-full bg-primary-500' />

				{`${latest} ready for ${count} of your maps`}
			</p>

			<PluginUpdateDetails entry={entry} fromVersion={oldest} />

			<p className='text-xs leading-[17px] text-text-secondary'>
				Nodes with data the new version doesn&apos;t accept keep their last saved
				view. You can roll back from each map&apos;s Plugins panel.
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

interface PluginCardProps {
	entry: PluginCatalogEntry;
	manifest: PluginManifest | null | undefined;
	index: number;
	/** Map picker, beside the name. */
	children: ReactNode;
	/** "Update available" box, under the description. */
	update?: ReactNode;
	offReason?: string | null;
}

function PluginCard({ entry, manifest, index, children, update, offReason }: PluginCardProps) {
	const shouldReduceMotion = useReducedMotion();
	const Icon = manifest ? PLUGIN_ICONS[manifest.icon] : null;

	return (
		<motion.article
			animate={{ opacity: 1, y: 0 }}
			className='flex scroll-mt-24 flex-col gap-3 rounded-lg border border-zinc-800 bg-base p-3.5'
			id={`plugin-${entry.id}`}
			initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
			transition={
				shouldReduceMotion
					? { duration: 0 }
					: { delay: Math.min(index, 8) * 0.03, duration: 0.2, ease: 'easeOut' }
			}
		>
			<div className='flex flex-wrap items-start gap-3 sm:flex-nowrap'>
				<span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/15 text-primary-400'>
					{Icon ? <Icon aria-hidden className='size-[18px]' /> : null}
				</span>

				<div className='flex min-w-0 flex-1 flex-col gap-0.5'>
					<h3 className='text-[15px] font-medium leading-5 text-text-primary'>
						{manifest?.name ?? entry.id}
					</h3>

					<span className='text-xs text-text-secondary'>
						{manifest
							? `by ${manifest.author} · v${manifest.version}`
							: `v${latestCatalogVersion(entry).version}`}
					</span>

					{manifest?.description && (
						<p className='mt-1 text-[13px] leading-[18px] text-zinc-300'>
							{manifest.description}
						</p>
					)}

					{manifest && (
						<p className='mt-1.5 text-xs text-text-secondary'>
							Adds{' '}

							{manifest.nodeKinds.map((kind, kindIndex) => (
								<span key={kind.kind}>
									{kindIndex > 0 && ', '}

									<code className='rounded bg-teal-500/15 px-1.5 py-px font-mono text-[11.5px] text-teal-300'>
										${kind.kind}
									</code>
								</span>
							))}{' '}
							to the node editor
						</p>
					)}
				</div>

				{children}

				<PluginCardMenu
					pluginId={entry.id}
					pluginName={manifest?.name ?? entry.name ?? entry.id}
					showAbout={false}
					version={latestCatalogVersion(entry).version}
				/>
			</div>

			{update}

			{manifest && <PluginPowersLine manifest={manifest} />}

			{offReason && (
				<p
					className='flex items-start gap-1.5 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-xs leading-4 text-red-300'
					role='status'
				>
					<Ban aria-hidden className='mt-px size-3.5 shrink-0' />

					{`Turned off by Shiko: ${offReason}`}
				</p>
			)}
		</motion.article>
	);
}

/** Dashboard Plugins page: Shiko plugins, which of your maps use them, and how to build one. */
export function PluginsContent() {
	const library = usePluginLibrary();
	const manifests = useCatalogManifests(library.plugins, true);
	const shikoEntries = library.plugins.filter((entry) => entry.source !== 'community');
	const libraryEntries = library.plugins.filter((entry) => entry.source === 'community');
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
					plugins: enabled ? [...others, { pluginId, version: latest }] : others,
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

	const renderEntry = (entry: PluginCatalogEntry, index: number) => {
		const manifest = manifests[entry.id];
		const name = manifest?.name ?? entry.id;
		const latest = latestCatalogVersion(entry).version;
		const offReason = disabledReason(entry.id, latest);
		const outdated = (maps ?? []).filter((map) => {
			const version = pinnedVersion(map, entry.id);
			return version !== undefined && compareVersions(version, latest) < 0;
		});
		return (
			<PluginCard
				entry={entry}
				index={index}
				key={entry.id}
				manifest={manifest}
				offReason={offReason}
				update={
					outdated.length > 0 ? (
						<UpdateBox
							entry={entry}
							isUpdating={updating.includes(entry.id)}
							outdated={outdated}
							onUpdate={() =>
								void updatePluginOnMaps(entry, name, outdated)
							}
						/>
					) : null
				}
			>
				{manifest === undefined ? (
					<Skeleton className='h-9 w-36 rounded-md' />
				) : (
					<MapPicker
						isLoading={isLoading}
						manifest={manifests[entry.id]}
						offReason={offReason}
						maps={maps}
						name={name}
						pluginId={entry.id}
						busyMapIds={busy
							.filter((key) => key.startsWith(`${entry.id}:`))
							.map((key) => key.slice(entry.id.length + 1))}
						onToggle={(map, enabled) =>
							void setPluginOnMap(entry.id, name, map, enabled)
						}
					/>
				)}
			</PluginCard>
		);
	};

	return (
		<SidebarProvider>
			<DashboardLayout>
				<div className='p-6 md:p-8'>
					<div className='mx-auto flex max-w-3xl flex-col gap-6'>
						<div className='flex flex-col gap-4'>
							<h1 className='text-3xl font-bold tracking-tight text-white'>
								Plugins
							</h1>

							<PluginsPageTabs current='library' />

							<p className='text-zinc-400'>
								New kinds of nodes for your maps. Turn a plugin on for a map and
								everyone who can edit it can add those nodes.
							</p>
						</div>

						<section
							aria-label='Shiko plugins'
							className='flex flex-col gap-3 rounded-xl border border-zinc-800 bg-base p-4'
						>
							<GroupHeader count={shikoEntries.length} label='Shiko plugins' />

							{error && (
								<div
									className='flex items-center justify-between gap-3 rounded-lg border border-error-500/30 bg-error-500/10 px-3 py-2 text-sm text-error-200'
									role='alert'
								>
									Couldn&apos;t load your maps.
									<Button onClick={() => void mutate()} size='sm' variant='outline'>
										Try again
									</Button>
								</div>
							)}

							{shikoEntries.map(renderEntry)}
						</section>

						{libraryEntries.length > 0 && (
							<section
								aria-label='Library'
								className='flex flex-col gap-3 rounded-xl border border-zinc-800 bg-base p-4'
							>
								<GroupHeader count={libraryEntries.length} label='Library' />

								<p className='text-sm text-zinc-400'>
									Made by other people and reviewed by Shiko before they&apos;re
									listed.
								</p>

								{libraryEntries.map(renderEntry)}
							</section>
						)}

						<section className='flex flex-wrap items-center gap-4 rounded-xl border border-zinc-800 bg-base p-5'>
							<span className='flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-white/6 text-zinc-300'>
								<Code2 aria-hidden className='size-5' />
							</span>

							<div className='flex min-w-60 flex-1 flex-col gap-1'>
								<h2 className='text-base font-semibold text-white'>Build a plugin</h2>

								<p className='text-sm text-zinc-400'>
									Write one in plain JavaScript and load it from localhost while
									you work on it. Only you see it until you submit it and Shiko
									publishes it in the library.
								</p>
							</div>

							<Link
								className={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')}
								href='/dashboard/plugins/build'
							>
								Read the guide
								<ArrowRight aria-hidden className='size-3.5' />
							</Link>
						</section>
					</div>
				</div>
			</DashboardLayout>
		</SidebarProvider>
	);
}
