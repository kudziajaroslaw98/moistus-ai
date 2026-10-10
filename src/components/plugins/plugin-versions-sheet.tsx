'use client';

import { PRIMARY_BUTTON_CLASS } from '@/components/dashboard/dashboard-page';
import { SideSheet } from '@/components/dashboard/side-sheet';
import { formatTimeAgo } from '@/components/plugins/plugin-update-details';
import { PLUGIN_ICONS } from '@/lib/plugins/plugin-icons';
import {
	PLUGIN_POWER_HUES,
	powerKindOfPermissions,
} from '@/lib/plugins/powers';
import type { MyPlugin, MyPluginVersion } from '@/types/plugin-library';
import { cn } from '@/utils/cn';
import { Ban, Puzzle } from 'lucide-react';

export const VERSION_STATUS: Record<
	MyPluginVersion['status'],
	{ label: string; className: string }
> = {
	in_review: {
		label: 'In review',
		className: 'border-amber-400/30 text-amber-300',
	},
	published: {
		label: 'Published',
		className: 'border-emerald-500/30 text-emerald-300',
	},
	changes_requested: {
		label: 'Changes requested',
		className: 'border-red-500/35 text-red-300',
	},
};

function when(version: MyPluginVersion): string {
	if (version.status === 'published' && version.publishedAt)
		return `Approved ${formatTimeAgo(version.publishedAt)}`;
	if (version.status === 'changes_requested' && version.reviewedAt)
		return `Reviewed ${formatTimeAgo(version.reviewedAt)}`;
	return `Submitted ${formatTimeAgo(version.submittedAt)}`;
}

function VersionRow({ version }: { version: MyPluginVersion }) {
	const status = VERSION_STATUS[version.status];
	return (
		<li className='flex flex-col gap-2 border-t border-[#16171b] px-4 py-3 first:border-t-0'>
			<div className='flex flex-wrap items-center gap-2.5'>
				<span className='font-mono text-sm font-medium text-white'>
					{version.version}
				</span>

				<span
					className={cn(
						'rounded-full border bg-[#0e0f12] px-2 py-0.5 text-[11px] leading-4',
						status.className
					)}
				>
					{status.label}
				</span>

				<span className='ml-auto text-xs text-zinc-500'>{when(version)}</span>
			</div>

			{version.notes && (
				<p className='text-[13px] leading-5 text-zinc-300'>{version.notes}</p>
			)}

			{version.reviewMessage && version.status !== 'published' && (
				<blockquote className='border-l-2 border-[#2a2c33] pl-3 text-[13px] leading-5 text-zinc-300'>
					{`“${version.reviewMessage}”`}

					<span className='block text-xs text-zinc-500'>Shiko review</span>
				</blockquote>
			)}

			{version.disabledReason && (
				<p className='flex items-start gap-1.5 text-xs text-red-300'>
					<Ban aria-hidden className='mt-px size-3.5 shrink-0' />

					{`Turned off by Shiko: ${version.disabledReason}`}
				</p>
			)}
		</li>
	);
}

interface PluginVersionsSheetProps {
	plugin: MyPlugin | null;
	onOpenChange: (open: boolean) => void;
	onSubmitVersion: () => void;
}

/** Side sheet of one of your plugins: how it's doing, and every version with Shiko's messages. */
export function PluginVersionsSheet({
	plugin,
	onOpenChange,
	onSubmitVersion,
}: PluginVersionsSheetProps) {
	const live = plugin?.versions.find(
		(version) => version.status === 'published'
	);
	const inReview = plugin?.versions.some(
		(version) => version.status === 'in_review'
	);
	const stats = plugin
		? [
				{ label: 'Live version', value: live?.version ?? 'None yet' },
				{ label: 'On maps', value: String(plugin.mapCount) },
				{ label: 'Open reports', value: String(plugin.openReports) },
			]
		: [];

	return (
		<SideSheet
			icon={
				plugin
					? (PLUGIN_ICONS[plugin.icon as keyof typeof PLUGIN_ICONS] ?? Puzzle)
					: undefined
			}
			onOpenChange={onOpenChange}
			open={plugin !== null}
			subtitle={plugin?.id}
			title={plugin?.name ?? 'Plugin'}
			hue={
				plugin
					? PLUGIN_POWER_HUES[powerKindOfPermissions(plugin.permissions)]
					: undefined
			}
			footer={
				<div className='flex flex-wrap items-center justify-between gap-3'>
					<span className='flex-1 basis-56 text-xs leading-[17px] text-zinc-500'>
						{inReview
							? 'One version can be in review at a time.'
							: 'Shiko reviews every version before map owners can use it.'}
					</span>

					<button
						className={PRIMARY_BUTTON_CLASS}
						disabled={inReview}
						onClick={onSubmitVersion}
						type='button'
					>
						Submit a version
					</button>
				</div>
			}
		>
			{plugin && (
				<>
					<div className='grid grid-cols-3 gap-2'>
						{stats.map((stat) => (
							<div
								className='rounded-xl border border-[#1d1f24] bg-[#0b0b0d] px-3.5 py-3'
								key={stat.label}
							>
								<p className='text-xs text-zinc-500'>{stat.label}</p>

								<p className='mt-1 text-lg font-semibold tabular-nums text-white'>
									{stat.value}
								</p>
							</div>
						))}
					</div>

					{plugin.disabledReason && (
						<p className='flex items-start gap-1.5 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs leading-4 text-red-300'>
							<Ban aria-hidden className='mt-px size-3.5 shrink-0' />

							{`Turned off everywhere by Shiko: ${plugin.disabledReason}`}
						</p>
					)}

					<section className='flex flex-col gap-2'>
						<h3 className='text-[13px] font-semibold text-white'>Versions</h3>

						<ul className='overflow-hidden rounded-xl border border-[#1d1f24]'>
							{plugin.versions.map((version) => (
								<VersionRow key={version.version} version={version} />
							))}
						</ul>
					</section>
				</>
			)}
		</SideSheet>
	);
}
