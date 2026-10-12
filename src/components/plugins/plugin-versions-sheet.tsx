'use client';

import { PRIMARY_BUTTON_CLASS } from '@/components/dashboard/dashboard-page';
import { SideSheet } from '@/components/dashboard/side-sheet';
import {
	DeveloperModeSetting,
	useDeveloperMode,
} from '@/components/plugins/developer-mode-switch';
import type { MyPluginRow } from '@/components/plugins/my-plugin-rows';
import { formatTimeAgo } from '@/components/plugins/plugin-update-details';
import { playgroundHref } from '@/lib/plugins/drafts-client';
import { PLUGIN_ICONS } from '@/lib/plugins/plugin-icons';
import {
	PLUGIN_POWER_HUES,
	powerKindOfPermissions,
} from '@/lib/plugins/powers';
import type { PluginDraftSummary } from '@/types/plugin-drafts';
import type { MyPluginVersion } from '@/types/plugin-library';
import { cn } from '@/utils/cn';
import { Ban, Pencil, Puzzle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

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

function VersionRow({
	version,
	editAsDraft,
}: {
	version: MyPluginVersion;
	/** Absent when drafts aren't offered here. */
	editAsDraft?: { disabled: boolean; busy: boolean; onClick: () => void };
}) {
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

			{editAsDraft && (
				<div>
					<button
						className='inline-flex h-7 items-center gap-1.5 rounded-[9px] border border-[#2a2c33] bg-[#131418] px-2.5 text-xs text-white transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50 [@media(hover:hover)]:hover:bg-[#1a1b20]'
						disabled={editAsDraft.disabled}
						onClick={editAsDraft.onClick}
						type='button'
					>
						<Pencil aria-hidden className='size-3' />

						{editAsDraft.busy ? 'Opening…' : 'Edit as new draft'}
					</button>
				</div>
			)}
		</li>
	);
}

/** "All 5 pass" / "2 checks failing" for a draft, from the checks its author's browser last ran. */
function DraftChecks({ draft }: { draft: PluginDraftSummary }) {
	const summary = draft.checkSummary;
	if (!summary || summary.total === 0) return null;
	const failing = summary.total - summary.passed;
	return (
		<span
			className={cn(
				'rounded-full border bg-[#0e0f12] px-2 py-0.5 text-[11px] leading-4',
				failing === 0
					? 'border-emerald-500/30 text-emerald-300'
					: 'border-red-500/35 text-red-300'
			)}
		>
			{failing === 0
				? `All ${summary.total} pass`
				: `${failing} ${failing === 1 ? 'check' : 'checks'} failing`}
		</span>
	);
}

function DraftRow({
	draft,
	onDelete,
}: {
	draft: PluginDraftSummary;
	onDelete: () => void;
}) {
	return (
		<li className='flex items-center gap-3 border-t border-[#1d1f24] px-4 py-3 first:border-t-0'>
			<div className='flex min-w-0 flex-1 flex-col gap-1'>
				<div className='flex flex-wrap items-center gap-2'>
					<span className='text-sm font-medium text-white'>
						{draft.baseVersion ? `Draft from ${draft.baseVersion}` : 'Draft'}
					</span>

					<DraftChecks draft={draft} />
				</div>

				<span className='text-xs text-zinc-500'>
					{`Edited ${formatTimeAgo(draft.updatedAt)}`}
				</span>
			</div>

			<Link
				className='inline-flex h-8 shrink-0 items-center rounded-[9px] border border-[#2a2c33] bg-[#131418] px-3 text-[13px] text-white transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 [@media(hover:hover)]:hover:bg-[#1a1b20]'
				href={playgroundHref(draft.id)}
			>
				Open
			</Link>

			<button
				aria-label='Delete draft'
				className='flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#2a2c33] bg-[#0e0f12] text-zinc-400 transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 [@media(hover:hover)]:hover:text-white'
				onClick={onDelete}
				type='button'
			>
				<Trash2 aria-hidden className='size-3.5' />
			</button>
		</li>
	);
}

interface PluginVersionsSheetProps {
	/** The plugin to show: its drafts and, if it was ever submitted, its versions. */
	row: MyPluginRow | null;
	onOpenChange: (open: boolean) => void;
	onSubmitVersion: () => void;
	/** Copies that version into a draft in the playground. Leave out to hide the buttons. */
	onEditAsDraft?: (version: string) => Promise<void>;
	/** Asks to delete one of the plugin's drafts. Leave out to hide the buttons. */
	onDeleteDraft?: (draft: PluginDraftSummary) => void;
}

/**
 * Side sheet of one of your plugins: how it's doing, your drafts of it, and every
 * version with Shiko's messages. A plugin that was never submitted shows only drafts.
 */
export function PluginVersionsSheet({
	row,
	onOpenChange,
	onSubmitVersion,
	onEditAsDraft,
	onDeleteDraft,
}: PluginVersionsSheetProps) {
	const { enabled: developerMode } = useDeveloperMode();
	const [opening, setOpening] = useState<string | null>(null);
	const plugin = row?.plugin ?? null;
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
			onOpenChange={onOpenChange}
			open={row !== null}
			subtitle={row?.pluginId}
			title={row?.name ?? 'Plugin'}
			hue={
				plugin
					? PLUGIN_POWER_HUES[powerKindOfPermissions(plugin.permissions)]
					: PLUGIN_POWER_HUES.own
			}
			icon={
				row
					? (PLUGIN_ICONS[row.icon as keyof typeof PLUGIN_ICONS] ?? Puzzle)
					: undefined
			}
			footer={
				plugin ? (
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
				) : (
					<span className='text-xs leading-[17px] text-zinc-500'>
						Nothing here is in the library until you submit it.
					</span>
				)
			}
		>
			{row && (
				<>
					{plugin ? (
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
					) : (
						<p className='rounded-xl border border-[#1d1f24] bg-[#0b0b0d] px-3.5 py-3 text-[13px] leading-[19px] text-zinc-400'>
							Not submitted yet. When its checks pass, submit it from the
							playground.
						</p>
					)}

					{plugin?.disabledReason && (
						<p className='flex items-start gap-1.5 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs leading-4 text-red-300'>
							<Ban aria-hidden className='mt-px size-3.5 shrink-0' />

							{`Turned off everywhere by Shiko: ${plugin.disabledReason}`}
						</p>
					)}

					{row.drafts.length > 0 && (
						<section className='flex flex-col gap-2'>
							<div className='flex items-baseline gap-2'>
								<h3 className='text-[13px] font-semibold text-white'>Drafts</h3>

								<span className='font-mono text-xs text-zinc-500'>
									{row.drafts.length}
								</span>

								<span className='text-xs text-zinc-500'>Only you see these.</span>
							</div>

							<ul className='overflow-hidden rounded-xl border border-[#1d1f24]'>
								{row.drafts.map((draft) => (
									<DraftRow
										draft={draft}
										key={draft.id}
										onDelete={() => onDeleteDraft?.(draft)}
									/>
								))}
							</ul>
						</section>
					)}

					{plugin && (
						<section className='flex flex-col gap-2'>
							<h3 className='text-[13px] font-semibold text-white'>Versions</h3>

							{onEditAsDraft && !developerMode && (
								<div className='flex flex-col gap-2.5 rounded-xl border border-[#1d1f24] bg-[#0b0b0d] px-3.5 py-3'>
									<p className='text-[13px] leading-5 text-zinc-300'>
										Turn on Developer mode to edit a version here as a draft.
									</p>

									<DeveloperModeSetting id='versions-sheet-developer-mode' />
								</div>
							)}

							<ul className='overflow-hidden rounded-xl border border-[#1d1f24]'>
								{plugin.versions.map((version) => (
									<VersionRow
										key={version.version}
										version={version}
										editAsDraft={
											onEditAsDraft
												? {
														disabled: !developerMode || opening !== null,
														busy: opening === version.version,
														onClick: () => {
															setOpening(version.version);
															void onEditAsDraft(version.version).finally(() =>
																setOpening(null)
															);
														},
													}
												: undefined
										}
									/>
								))}
							</ul>
						</section>
					)}
				</>
			)}
		</SideSheet>
	);
}
