'use client';

import type { PluginMapSummary } from '@/app/api/plugins/maps/route';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useCatalogManifests } from '@/components/plugins/use-catalog-manifests';
import { Button, buttonVariants } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import {
	FIRST_PARTY_PLUGINS,
	type PluginCatalogEntry,
} from '@/lib/plugins/catalog';
import type { PluginManifest } from '@/lib/plugins/manifest-schema';
import { PLUGIN_ICONS } from '@/lib/plugins/plugin-icons';
import { cn } from '@/utils/cn';
import {
	ArrowRight,
	Check,
	ChevronDown,
	Code2,
	Loader2,
	ShieldCheck,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
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
	maps: PluginMapSummary[] | undefined;
	isLoading: boolean;
	busyMapIds: string[];
	onToggle: (map: PluginMapSummary, enabled: boolean) => void;
}

/** "On in 2 maps" button with the user's own maps as checkboxes. */
function MapPicker({
	name,
	pluginId,
	maps,
	isLoading,
	busyMapIds,
	onToggle,
}: MapPickerProps) {
	const count = maps?.filter((map) => map.pluginIds.includes(pluginId)).length ?? 0;
	const label = isLoading
		? 'Loading maps…'
		: count === 0
			? 'Turn on for a map'
			: `On in ${count} ${count === 1 ? 'map' : 'maps'}`;

	return (
		<Popover>
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
							const isOn = map.pluginIds.includes(pluginId);
							const isBusy = busyMapIds.includes(map.id);
							return (
								<li key={map.id}>
									<button
										aria-checked={isOn}
										className='flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm text-text-primary transition-colors duration-200 ease hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 disabled:cursor-wait'
										disabled={isBusy}
										onClick={() => onToggle(map, !isOn)}
										role='checkbox'
										type='button'
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

				<div aria-hidden className='mx-1 my-1.5 h-px bg-zinc-800' />

				<p className='px-2.5 pb-2 pt-1 text-xs leading-4 text-zinc-500'>
					Only maps you own are listed. Changes save right away.
				</p>
			</PopoverContent>
		</Popover>
	);
}

interface PluginCardProps {
	entry: PluginCatalogEntry;
	manifest: PluginManifest | null | undefined;
	index: number;
	children: React.ReactNode;
}

function PluginCard({ entry, manifest, index, children }: PluginCardProps) {
	const shouldReduceMotion = useReducedMotion();
	const Icon = manifest ? PLUGIN_ICONS[manifest.icon] : null;

	return (
		<motion.article
			animate={{ opacity: 1, y: 0 }}
			className='flex flex-col gap-3 rounded-lg border border-zinc-800 bg-base p-3.5'
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
							: `v${entry.version}`}
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
			</div>

			<p className='flex items-start gap-2 text-xs text-text-secondary'>
				<ShieldCheck
					aria-hidden
					className='size-3.5 shrink-0 text-emerald-400/90'
				/>
				Sees and changes only its own nodes. No internet access.
			</p>
		</motion.article>
	);
}

/** Dashboard Plugins page: Shiko plugins, which of your maps use them, and how to build one. */
export function PluginsContent() {
	const manifests = useCatalogManifests(FIRST_PARTY_PLUGINS, true);
	const { data: maps, error, isLoading, mutate } = useSWR(MAPS_KEY, fetchMaps);
	const [busy, setBusy] = useState<string[]>([]);

	const setPluginOnMap = async (
		pluginId: string,
		name: string,
		map: PluginMapSummary,
		enabled: boolean
	) => {
		const busyKey = `${pluginId}:${map.id}`;
		setBusy((current) => [...current, busyKey]);
		const withChange = (current: PluginMapSummary[] = []) =>
			current.map((candidate) =>
				candidate.id !== map.id
					? candidate
					: {
							...candidate,
							pluginIds: enabled
								? [...new Set([...candidate.pluginIds, pluginId])]
								: candidate.pluginIds.filter((id) => id !== pluginId),
						}
			);
		try {
			await mutate(
				async (current) => {
					const response = await fetch(
						`/api/maps/${map.id}/plugins/${encodeURIComponent(pluginId)}`,
						{ method: enabled ? 'PUT' : 'DELETE' }
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

	return (
		<SidebarProvider>
			<DashboardLayout>
				<div className='p-6 md:p-8'>
					<div className='mx-auto flex max-w-3xl flex-col gap-6'>
						<div className='space-y-2'>
							<h1 className='text-3xl font-bold tracking-tight text-white'>
								Plugins
							</h1>

							<p className='text-zinc-400'>
								New kinds of nodes for your maps. Turn a plugin on for a map and
								everyone who can edit it can add those nodes.
							</p>
						</div>

						<section
							aria-label='Shiko plugins'
							className='flex flex-col gap-3 rounded-xl border border-zinc-800 bg-base p-4'
						>
							<GroupHeader count={FIRST_PARTY_PLUGINS.length} label='Shiko plugins' />

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

							{FIRST_PARTY_PLUGINS.map((entry, index) => {
								const manifest = manifests[entry.id];
								const name = manifest?.name ?? entry.id;
								return (
									<PluginCard
										entry={entry}
										index={index}
										key={entry.id}
										manifest={manifest}
									>
										{manifest === undefined ? (
											<Skeleton className='h-9 w-36 rounded-md' />
										) : (
											<MapPicker
												isLoading={isLoading}
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
							})}
						</section>

						<section className='flex flex-wrap items-center gap-4 rounded-xl border border-zinc-800 bg-base p-5'>
							<span className='flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-white/6 text-zinc-300'>
								<Code2 aria-hidden className='size-5' />
							</span>

							<div className='flex min-w-60 flex-1 flex-col gap-1'>
								<h2 className='text-base font-semibold text-white'>Build a plugin</h2>

								<p className='text-sm text-zinc-400'>
									Write one in plain JavaScript and load it from localhost while
									you work on it. Only you see it until it ships with Shiko.
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
