'use client';

import {
	findCatalogVersion,
	newerCatalogVersions,
	permissionChanges,
	type PluginCatalogEntry,
} from '@/lib/plugins/catalog';
import { describePermission } from '@/lib/plugins/powers';
import { Check, TriangleAlert } from 'lucide-react';

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "just now", "5 minutes ago", "yesterday" for an ISO timestamp. */
export function formatTimeAgo(iso: string, now = Date.now()): string {
	const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
	if (Number.isNaN(seconds) || seconds > -45) return 'just now';
	const steps: Array<[Intl.RelativeTimeFormatUnit, number]> = [
		['minute', 60],
		['hour', 3600],
		['day', 86_400],
		['week', 604_800],
	];
	let unit: Intl.RelativeTimeFormatUnit = 'minute';
	let size = 60;
	for (const [candidate, candidateSize] of steps) {
		if (Math.abs(seconds) < candidateSize) break;
		unit = candidate;
		size = candidateSize;
	}
	return relativeTime.format(Math.round(seconds / size), unit);
}

interface PluginUpdateDetailsProps {
	entry: PluginCatalogEntry;
	/** The version the map is on now. */
	fromVersion: string;
}

/** What an update brings: each newer version's notes and any change in powers. */
export function PluginUpdateDetails({
	entry,
	fromVersion,
}: PluginUpdateDetailsProps) {
	const newer = newerCatalogVersions(entry, fromVersion);
	const current = findCatalogVersion(entry.id, fromVersion);
	if (newer.length === 0) return null;
	const { added } = permissionChanges(
		current?.permissions ?? [],
		newer[0].permissions
	);

	return (
		<>
			{newer.length === 1 ? (
				<p className='text-[13px] leading-[18px] text-zinc-200'>
					{newer[0].notes}
				</p>
			) : (
				<ul className='space-y-1 text-[13px] leading-[18px] text-zinc-200'>
					{newer.map((version) => (
						<li key={version.version}>
							<span className='font-medium text-text-primary'>
								{version.version}
							</span>

							{` · ${version.notes}`}
						</li>
					))}
				</ul>
			)}

			{added.length === 0 ? (
				<p className='flex items-center gap-1.5 text-xs text-text-secondary'>
					<Check aria-hidden className='size-3 shrink-0 text-emerald-400/90' />
					No new powers
				</p>
			) : (
				<p className='flex items-start gap-1.5 text-xs leading-[17px] text-amber-200'>
					<TriangleAlert aria-hidden className='mt-0.5 size-3 shrink-0' />

					{`New powers: ${added.map(describePermission).join(', ')}`}
				</p>
			)}
		</>
	);
}
