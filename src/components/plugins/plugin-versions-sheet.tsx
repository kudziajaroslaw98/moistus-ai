'use client';

import { SideSheet } from '@/components/dashboard/side-sheet';
import {
	DeveloperModeSetting,
	useDeveloperMode,
} from '@/components/plugins/developer-mode-switch';
import type { MyPluginRow } from '@/components/plugins/my-plugin-rows';
import { formatTimeAgo } from '@/components/plugins/plugin-update-details';
import { Button } from '@/components/ui/button';
import {
	PanelBadge,
	PanelFooterActions,
	PanelFooterNote,
	PanelRow,
	PanelSection,
	panelButtonClass,
	panelButtonSmClass,
} from '@/components/ui/panel';
import { playgroundHref } from '@/lib/plugins/drafts-client';
import { PLUGIN_ICONS } from '@/lib/plugins/plugin-icons';
import {
	PLUGIN_POWER_HUES,
	powerKindOfPermissions,
} from '@/lib/plugins/powers';
import type { PluginDraftSummary } from '@/types/plugin-drafts';
import type { MyPluginVersion } from '@/types/plugin-library';
import { Ban, Pencil, Puzzle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export const VERSION_STATUS: Record<
	MyPluginVersion['status'],
	{ label: string; tone: 'warn' | 'ok' | 'error' }
> = {
	in_review: { label: 'In review', tone: 'warn' },
	published: { label: 'Published', tone: 'ok' },
	changes_requested: { label: 'Changes requested', tone: 'error' },
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
		<PanelRow
			align='top'
			as='li'
			trailing={when(version)}
			title={
				<span className='font-mono text-sm font-medium'>{version.version}</span>
			}
			badge={<PanelBadge tone={status.tone}>{status.label}</PanelBadge>}
			description={
				<>
					{version.notes && <span className='block'>{version.notes}</span>}

					{version.reviewMessage && version.status !== 'published' && (
						<span className='mt-2 block border-l-2 border-white/14 pl-3'>
							{`“${version.reviewMessage}”`}

							<span className='mt-0.5 block text-xs text-text-tertiary'>
								Shiko review
							</span>
						</span>
					)}

					{version.disabledReason && (
						<span className='mt-2 flex items-start gap-1.5 text-xs text-error-300'>
							<Ban aria-hidden className='mt-px size-3.5 shrink-0' />

							{`Turned off by Shiko: ${version.disabledReason}`}
						</span>
					)}

					{editAsDraft && (
						<Button
							className={`${panelButtonSmClass} mt-2.5 gap-1.5 border-white/12 bg-white/[0.03] text-text-primary hover:bg-white/[0.07]`}
							disabled={editAsDraft.disabled}
							onClick={editAsDraft.onClick}
							type='button'
							variant='outline'
						>
							<Pencil aria-hidden className='size-3' />

							{editAsDraft.busy ? 'Opening…' : 'Edit as new draft'}
						</Button>
					)}
				</>
			}
		/>
	);
}

/** "All 5 pass" / "2 checks failing" for a draft, from the checks its author's browser last ran. */
function DraftChecks({ draft }: { draft: PluginDraftSummary }) {
	const summary = draft.checkSummary;
	if (!summary || summary.total === 0) return null;
	const failing = summary.total - summary.passed;

	return (
		<PanelBadge tone={failing === 0 ? 'ok' : 'error'}>
			{failing === 0
				? `All ${summary.total} pass`
				: `${failing} ${failing === 1 ? 'check' : 'checks'} failing`}
		</PanelBadge>
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
		<PanelRow
			as='li'
			badge={<DraftChecks draft={draft} />}
			description={`Edited ${formatTimeAgo(draft.updatedAt)}`}
			title={draft.baseVersion ? `Draft from ${draft.baseVersion}` : 'Draft'}
			trailing={
				<span className='-mr-2 flex items-center gap-1'>
					<Link
						className='inline-flex h-8 items-center rounded-[9px] border border-white/12 bg-white/[0.03] px-3 text-[13px] text-text-primary transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 [@media(hover:hover)]:hover:bg-white/[0.07]'
						href={playgroundHref(draft.id)}
					>
						Open
					</Link>

					<Button
						aria-label='Delete draft'
						className='size-8 text-text-secondary hover:bg-error-500/10 hover:text-error-300'
						onClick={onDelete}
						size='icon'
						variant='ghost'
					>
						<Trash2 aria-hidden className='size-4' />
					</Button>
				</span>
			}
		/>
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
					<div className='flex w-full items-center justify-between gap-3'>
						<PanelFooterNote>
							{inReview
								? 'One version can be in review at a time.'
								: 'Shiko reviews every version before map owners can use it.'}
						</PanelFooterNote>

						<PanelFooterActions>
							<Button
								className={panelButtonClass}
								disabled={inReview}
								onClick={onSubmitVersion}
								type='button'
							>
								Submit a version
							</Button>
						</PanelFooterActions>
					</div>
				) : (
					<PanelFooterNote>
						Nothing here is in the library until you submit it.
					</PanelFooterNote>
				)
			}
		>
			{row && (
				<>
					{plugin ? (
						<PanelSection>
							<div className='grid grid-cols-3'>
								{stats.map((stat) => (
									<div
										className='border-l border-white/8 px-4 first:border-l-0 first:pl-0'
										key={stat.label}
									>
										<p className='text-xs text-text-tertiary'>{stat.label}</p>

										<p className='mt-0.5 text-xl font-semibold tracking-[-0.03em] tabular-nums text-text-primary'>
											{stat.value}
										</p>
									</div>
								))}
							</div>
						</PanelSection>
					) : (
						<p className='rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3 text-[13px] leading-[19px] text-text-secondary'>
							Not submitted yet. When its checks pass, submit it from the
							playground.
						</p>
					)}

					{plugin?.disabledReason && (
						<p className='flex items-start gap-1.5 rounded-xl border border-error-500/25 bg-error-500/10 px-3 py-2.5 text-xs leading-4 text-error-300'>
							<Ban aria-hidden className='mt-px size-3.5 shrink-0' />

							{`Turned off everywhere by Shiko: ${plugin.disabledReason}`}
						</p>
					)}

					{row.drafts.length > 0 && (
						<PanelSection
							className='mt-0'
							description='Only you see these.'
							label='Drafts'
							meta={row.drafts.length}
							metaAlign='icon'
						>
							<ul>
								{row.drafts.map((draft) => (
									<DraftRow
										draft={draft}
										key={draft.id}
										onDelete={() => onDeleteDraft?.(draft)}
									/>
								))}
							</ul>
						</PanelSection>
					)}

					{plugin && (
						<PanelSection
							className='mt-0'
							label='Versions'
							meta={plugin.versions.length}
						>
							{onEditAsDraft && !developerMode && (
								<div className='mb-2 flex flex-col gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3'>
									<p className='text-[13px] leading-5 text-text-secondary'>
										Turn on Developer mode to edit a version here as a draft.
									</p>

									<DeveloperModeSetting id='versions-sheet-developer-mode' />
								</div>
							)}

							<ul>
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
						</PanelSection>
					)}
				</>
			)}
		</SideSheet>
	);
}
