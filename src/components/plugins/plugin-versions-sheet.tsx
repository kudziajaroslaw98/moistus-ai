'use client';

import { SideSheet } from '@/components/dashboard/side-sheet';
import { formatTimeAgo } from '@/components/plugins/plugin-update-details';
import { Button } from '@/components/ui/button';
import {
	PanelBadge,
	PanelFooterActions,
	PanelFooterNote,
	PanelRow,
	PanelSection,
	panelButtonClass,
} from '@/components/ui/panel';
import { PLUGIN_ICONS } from '@/lib/plugins/plugin-icons';
import {
	PLUGIN_POWER_HUES,
	powerKindOfPermissions,
} from '@/lib/plugins/powers';
import type { MyPlugin, MyPluginVersion } from '@/types/plugin-library';
import { Ban, Puzzle } from 'lucide-react';

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

function VersionRow({ version }: { version: MyPluginVersion }) {
	const status = VERSION_STATUS[version.status];

	return (
		<PanelRow
			align='top'
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
				</>
			}
		/>
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
			}
		>
			{plugin && (
				<>
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

					{plugin.disabledReason && (
						<p className='flex items-start gap-1.5 rounded-xl border border-error-500/25 bg-error-500/10 px-3 py-2.5 text-xs leading-4 text-error-300'>
							<Ban aria-hidden className='mt-px size-3.5 shrink-0' />

							{`Turned off everywhere by Shiko: ${plugin.disabledReason}`}
						</p>
					)}

					<PanelSection className='mt-0' label='Versions' meta={plugin.versions.length}>
						{plugin.versions.map((version) => (
							<VersionRow key={version.version} version={version} />
						))}
					</PanelSection>
				</>
			)}
		</SideSheet>
	);
}
