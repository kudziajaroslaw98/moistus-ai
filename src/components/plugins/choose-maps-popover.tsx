'use client';

import type { PluginMapSummary } from '@/app/api/plugins/maps/route';
import { CARD_BUTTON_CLASS } from '@/components/dashboard/dashboard-page';
import {
	needsPowerApproval,
	PluginPowersConfirm,
	PluginPowersLine,
} from '@/components/plugins/plugin-powers';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { findCatalogVersion } from '@/lib/plugins/catalog';
import type { PluginManifest } from '@/lib/plugins/manifest-schema';
import { cn } from '@/utils/cn';
import { Loader2, Search } from 'lucide-react';
import { useState } from 'react';

/** The version a map has this plugin on at, or undefined when it's off. */
export const pinnedVersion = (map: PluginMapSummary, pluginId: string) =>
	map.plugins.find((plugin) => plugin.pluginId === pluginId)?.version;

interface ChooseMapsPopoverProps {
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

/**
 * The plugin card's one button, "Choose maps": a popover with a switch for each map
 * you own. How many maps use the plugin is shown on the card, not in the button.
 */
export function ChooseMapsPopover({
	name,
	pluginId,
	manifest,
	offReason,
	maps,
	isLoading,
	busyMapIds,
	onToggle,
}: ChooseMapsPopoverProps) {
	const [pendingMap, setPendingMap] = useState<PluginMapSummary | null>(null);
	const [query, setQuery] = useState('');
	const total = maps?.length ?? 0;
	const onCount =
		maps?.filter((map) => pinnedVersion(map, pluginId) !== undefined).length ??
		0;
	const needle = query.trim().toLowerCase();
	const shown = (maps ?? []).filter(
		(map) =>
			!needle || (map.title || 'Untitled map').toLowerCase().includes(needle)
	);

	return (
		<Popover
			onOpenChange={(open) => {
				if (!open) {
					setPendingMap(null);
					setQuery('');
				}
			}}
		>
			<PopoverTrigger
				render={
					<button
						className={CARD_BUTTON_CLASS}
						disabled={isLoading || !maps}
						type='button'
					/>
				}
			>
				Choose maps
			</PopoverTrigger>

			<PopoverContent
				align='end'
				aria-label={`Maps with ${name} on`}
				className='w-[360px] max-w-[calc(100vw-2rem)] gap-0 p-0'
				side='bottom'
			>
				<div className='border-b border-[#1d1f24] px-4 pb-3 pt-3.5'>
					<p className='text-sm font-semibold text-white'>Use {name} on</p>

					<p className='mt-0.5 text-xs text-zinc-500'>
						Everyone who can edit a map can add its nodes.
					</p>

					{manifest && needsPowerApproval(manifest) && (
						<div className='mt-2.5'>
							<PluginPowersLine manifest={manifest} />
						</div>
					)}

					{total > 5 && (
						<label className='relative mt-3 block'>
							<span className='sr-only'>Search your maps</span>

							<Search
								aria-hidden
								className='pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-zinc-500'
							/>

							<input
								className='h-8 w-full rounded-lg border border-[#1d1f24] bg-[#0b0b0d] pl-8 pr-2.5 text-[13px] text-white placeholder:text-zinc-500 focus:border-[#34363e] focus:outline-none'
								onChange={(event) => setQuery(event.target.value)}
								placeholder='Search your maps'
								type='search'
								value={query}
							/>
						</label>
					)}
				</div>

				{shown.length > 0 ? (
					<ul className='max-h-72 overflow-y-auto p-1.5'>
						{shown.map((map) => {
							const version = pinnedVersion(map, pluginId);
							const isOn = version !== undefined;
							const isBusy = busyMapIds.includes(map.id);
							return (
								<li key={map.id}>
									<button
										aria-checked={isOn}
										className='flex h-10 w-full items-center gap-3 rounded-lg px-2.5 text-left text-sm text-white transition-colors duration-200 ease [@media(hover:hover)]:hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-wait'
										disabled={isBusy || (Boolean(offReason) && !isOn)}
										role='switch'
										type='button'
										onClick={() =>
											!isOn && manifest && needsPowerApproval(manifest)
												? setPendingMap(map)
												: onToggle(map, !isOn)
										}
									>
										<span className='min-w-0 flex-1 truncate'>
											{map.title || 'Untitled map'}
										</span>

										{version && (
											<span className='shrink-0 font-mono text-xs text-zinc-500'>
												{version}
											</span>
										)}

										<span
											aria-hidden
											className={cn(
												'flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition-colors duration-200 ease',
												isOn
													? 'border-[#fafafa] bg-[#fafafa]'
													: 'border-[#2a2c33] bg-[#131418]'
											)}
										>
											{isBusy ? (
												<Loader2 className='mx-auto size-3 animate-spin text-zinc-500' />
											) : (
												<span
													className={cn(
														'size-3.5 rounded-full transition-transform duration-200 ease-out',
														isOn
															? 'translate-x-4 bg-[#0b0b0d]'
															: 'translate-x-0 bg-zinc-500'
													)}
												/>
											)}
										</span>
									</button>
								</li>
							);
						})}
					</ul>
				) : (
					<p className='px-4 py-4 text-sm text-zinc-400'>
						{total === 0
							? 'You don’t own any maps yet.'
							: 'No maps match your search.'}
					</p>
				)}

				{pendingMap && manifest && (
					<div className='border-t border-[#1d1f24] p-2.5'>
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

				<p className='border-t border-[#1d1f24] px-4 py-2.5 text-xs text-zinc-500'>
					{`On in ${onCount} of ${total} ${total === 1 ? 'map' : 'maps'} · only maps you own · saves right away`}
				</p>
			</PopoverContent>
		</Popover>
	);
}
