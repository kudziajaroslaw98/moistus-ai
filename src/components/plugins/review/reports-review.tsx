'use client';

import {
	CatalogCard,
	CatalogGrid,
	OFF_HUE,
	type CatalogChip,
} from '@/components/dashboard/catalog-card';
import { CARD_BUTTON_CLASS } from '@/components/dashboard/dashboard-page';
import { SideSheet } from '@/components/dashboard/side-sheet';
import { formatTimeAgo } from '@/components/plugins/plugin-update-details';
import { useCatalogManifests } from '@/components/plugins/use-catalog-manifests';
import { usePluginLibrary } from '@/components/plugins/use-plugin-library';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PLUGIN_ICONS } from '@/lib/plugins/plugin-icons';
import { PLUGIN_POWER_HUES, pluginPowers } from '@/lib/plugins/powers';
import {
	PLUGIN_REPORT_REASON_LABELS,
	type PluginModerationAction,
	type PluginReportGroup,
	type PluginReportReason,
} from '@/types/plugin-library';
import type { LucideIcon } from 'lucide-react';
import { Ban, Loader2, Puzzle } from 'lucide-react';
import { useState } from 'react';

const REASON_SUMMARY: Record<PluginReportReason, string> = {
	broken: 'it doesn’t work',
	misleading: 'misleading or harmful content',
	overreach: 'asking for more than it needs',
	security: 'a possible security problem',
	other: 'a problem',
};

function topReason(group: PluginReportGroup): PluginReportReason | null {
	const entries = Object.entries(group.counts) as Array<
		[PluginReportReason, number]
	>;
	return entries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

interface ReportSheetProps {
	group: PluginReportGroup;
	icon: LucideIcon;
	hue: number;
	onChanged: () => void;
	onOpenChange: (open: boolean) => void;
}

/** Side sheet for one plugin version's reports: why people reported it and what to do. */
function ReportSheet({
	group,
	icon,
	hue,
	onChanged,
	onOpenChange,
}: ReportSheetProps) {
	const top = topReason(group);
	const [reason, setReason] = useState(
		top ? `Reported for ${REASON_SUMMARY[top]}. Shiko is checking it.` : ''
	);
	const [busy, setBusy] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const offReason = group.pluginDisabledReason ?? group.versionDisabledReason;
	const label = group.version ? `${group.name} ${group.version}` : group.name;

	const act = async (key: string, action: PluginModerationAction) => {
		setBusy(key);
		setError(null);
		try {
			const response = await fetch('/api/admin/plugins/moderate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(action),
			});
			const body = (await response.json().catch(() => null)) as {
				error?: string;
			} | null;
			if (!response.ok) throw new Error(body?.error ?? 'That didn’t work');
			onChanged();
		} catch (actError) {
			setError(
				actError instanceof Error ? actError.message : 'That didn’t work'
			);
		} finally {
			setBusy(null);
		}
	};
	const spinner = (key: string, text: string) =>
		busy === key ? (
			<Loader2 aria-label='Working' className='size-4 animate-spin' />
		) : (
			text
		);
	const stats = [
		{ label: 'Open reports', value: String(group.reports.length) },
		{
			label: 'From',
			value: `${group.reporters} ${group.reporters === 1 ? 'person' : 'people'}`,
		},
		{
			label: 'On',
			value: `${group.mapCount} ${group.mapCount === 1 ? 'map' : 'maps'}`,
		},
	];

	return (
		<SideSheet
			hue={hue}
			icon={icon}
			onOpenChange={onOpenChange}
			open
			subtitle={`${group.pluginId} · by ${group.author}`}
			title={label}
			footer={
				offReason ? (
					<div className='flex justify-end'>
						<button
							className={CARD_BUTTON_CLASS}
							disabled={busy !== null}
							type='button'
							onClick={() =>
								void act('enable', {
									action: 'enable',
									pluginId: group.pluginId,
									version: group.pluginDisabledReason ? null : group.version,
								})
							}
						>
							{spinner('enable', 'Turn back on')}
						</button>
					</div>
				) : (
					<>
						<label
							className='flex flex-col gap-1.5 text-xs text-zinc-400'
							htmlFor={`off-${group.pluginId}-${group.version ?? 'all'}`}
						>
							Reason shown on affected maps
							<Input
								id={`off-${group.pluginId}-${group.version ?? 'all'}`}
								maxLength={300}
								onChange={(event) => setReason(event.target.value)}
								value={reason}
							/>
						</label>

						<span className='text-xs leading-[17px] text-zinc-500'>
							{`Nodes keep their last saved view. ${group.mapCount} ${group.mapCount === 1 ? 'map owner gets' : 'map owners get'} a notification. You can turn it back on.`}
						</span>

						<div className='flex flex-wrap justify-end gap-2'>
							{group.reports.length > 0 && (
								<Button
									disabled={busy !== null}
									variant='ghost'
									onClick={() =>
										void act('dismiss', {
											action: 'dismiss',
											pluginId: group.pluginId,
											version: group.version,
										})
									}
								>
									{spinner('dismiss', 'Dismiss reports')}
								</Button>
							)}

							{group.version && !group.isShiko && (
								<Button
									disabled={busy !== null || !reason.trim()}
									variant='outline'
									onClick={() =>
										void act('version', {
											action: 'disable',
											pluginId: group.pluginId,
											version: group.version,
											reason: reason.trim(),
										})
									}
								>
									{spinner('version', `Turn off ${group.version} everywhere`)}
								</Button>
							)}

							<Button
								className='border border-red-500/35 bg-red-500/12 text-red-300 hover:bg-red-500/20'
								disabled={busy !== null || !reason.trim()}
								onClick={() =>
									void act('plugin', {
										action: 'disable',
										pluginId: group.pluginId,
										version: null,
										reason: reason.trim(),
									})
								}
							>
								{spinner('plugin', `Turn off ${group.name} everywhere`)}
							</Button>
						</div>
					</>
				)
			}
		>
			<div
				data-testid={`report-group-${group.pluginId}`}
				className='flex flex-col gap-5'
			>
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

				{offReason && (
					<p
						className='flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-3 text-[13px] text-red-300'
						role='status'
					>
						<Ban aria-hidden className='mt-0.5 size-4 shrink-0' />

						{`${group.pluginDisabledReason ? 'Turned off everywhere' : 'This version is turned off everywhere'}: ${offReason}`}
					</p>
				)}

				{Object.keys(group.counts).length > 0 && (
					<section className='flex flex-col gap-2.5'>
						<h3 className='text-[13px] font-semibold text-white'>
							Why people reported it
						</h3>

						<ul className='flex flex-wrap gap-1.5'>
							{(
								Object.entries(group.counts) as Array<
									[PluginReportReason, number]
								>
							).map(([key, count]) => (
								<li
									className='rounded-full border border-[#2a2c33] px-2.5 py-0.5 text-xs text-zinc-300'
									key={key}
								>
									{`${PLUGIN_REPORT_REASON_LABELS[key]} · ${count}`}
								</li>
							))}
						</ul>
					</section>
				)}

				{group.reports.length > 0 && (
					<section className='flex flex-col gap-2.5'>
						<h3 className='text-[13px] font-semibold text-white'>Reports</h3>

						<ul className='overflow-hidden rounded-xl border border-[#1d1f24]'>
							{group.reports.map((report) => (
								<li
									className='flex flex-col gap-1 border-t border-[#16171b] px-3.5 py-3 first:border-t-0'
									key={report.id}
								>
									<div className='flex items-center gap-2 text-xs'>
										<span className='text-zinc-400'>
											{PLUGIN_REPORT_REASON_LABELS[report.reason]}
										</span>

										<span className='ml-auto text-zinc-500'>
											{formatTimeAgo(report.createdAt)}
										</span>
									</div>

									<p className='text-[13px] leading-[19px] text-zinc-200'>
										{report.details || 'No details given.'}
									</p>

									{report.nodeData !== null &&
										report.nodeData !== undefined && (
											<details className='mt-0.5'>
												<summary className='cursor-pointer text-xs text-zinc-400'>
													Node data attached
												</summary>

												<pre className='mt-1 max-h-48 overflow-auto rounded-md bg-[#0b0b0d] p-2 font-mono text-xs text-zinc-300'>
													{JSON.stringify(report.nodeData, null, 2)}
												</pre>
											</details>
										)}
								</li>
							))}
						</ul>
					</section>
				)}

				{error && (
					<p className='text-xs text-error-500' role='alert'>
						{error}
					</p>
				)}
			</div>
		</SideSheet>
	);
}

const groupKey = (group: PluginReportGroup) =>
	`${group.pluginId}@${group.version ?? ''}`;

/** The Reports tab: a card per reported (or turned-off) plugin version; Review opens its sheet. */
export function ReportsReview({
	groups,
	onChanged,
}: {
	groups: PluginReportGroup[];
	onChanged: () => void;
}) {
	const library = usePluginLibrary();
	const manifests = useCatalogManifests(library.plugins, true);
	const [openKey, setOpenKey] = useState<string | null>(null);
	const open = groups.find((group) => groupKey(group) === openKey) ?? null;

	if (groups.length === 0) {
		return (
			<p className='mt-6 text-sm text-zinc-400'>
				No open reports, and nothing is turned off.
			</p>
		);
	}

	const look = (group: PluginReportGroup) => {
		const manifest = manifests[group.pluginId];
		const off = group.pluginDisabledReason ?? group.versionDisabledReason;
		return {
			icon: manifest ? PLUGIN_ICONS[manifest.icon] : Puzzle,
			hue: off
				? OFF_HUE
				: PLUGIN_POWER_HUES[manifest ? pluginPowers(manifest).kind : 'own'],
		};
	};

	return (
		<>
			<CatalogGrid className='mt-6' viewMode='grid'>
				{groups.map((group) => {
					const off = group.pluginDisabledReason ?? group.versionDisabledReason;
					const count = group.reports.length;
					const chips: CatalogChip[] = off
						? [{ label: 'Turned off', tone: 'red' }]
						: [
								{
									label: `${count} ${count === 1 ? 'report' : 'reports'}`,
									tone: 'amber',
								},
							];
					const top = topReason(group);
					return (
						<CatalogCard
							chips={chips}
							key={groupKey(group)}
							onOpen={() => setOpenKey(groupKey(group))}
							viewMode='grid'
							title={
								group.version ? `${group.name} ${group.version}` : group.name
							}
							description={
								off
									? off
									: top
										? `Mostly reported for ${REASON_SUMMARY[top]}.`
										: 'No open reports.'
							}
							detail={`${group.reporters} ${group.reporters === 1 ? 'person' : 'people'} · on ${group.mapCount} ${group.mapCount === 1 ? 'map' : 'maps'}`}
							meta={`${group.pluginId} · by ${group.author}`}
							{...look(group)}
							action={
								<button
									className={CARD_BUTTON_CLASS}
									onClick={() => setOpenKey(groupKey(group))}
									type='button'
								>
									Review
								</button>
							}
						/>
					);
				})}
			</CatalogGrid>

			{open && (
				<ReportSheet
					group={open}
					key={groupKey(open)}
					onChanged={onChanged}
					onOpenChange={(next) => !next && setOpenKey(null)}
					{...look(open)}
				/>
			)}
		</>
	);
}
