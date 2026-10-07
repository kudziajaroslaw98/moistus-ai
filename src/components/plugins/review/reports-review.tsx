'use client';

import { formatTimeAgo } from '@/components/plugins/plugin-update-details';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	PLUGIN_REPORT_REASON_LABELS,
	type PluginModerationAction,
	type PluginReportGroup,
	type PluginReportReason,
} from '@/types/plugin-library';
import { cn } from '@/utils/cn';
import { Ban, Loader2 } from 'lucide-react';
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

interface ReportGroupCardProps {
	group: PluginReportGroup;
	onChanged: () => void;
}

function ReportGroupCard({ group, onChanged }: ReportGroupCardProps) {
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

	return (
		<section
			aria-label={label}
			data-testid={`report-group-${group.pluginId}`}
			className={cn(
				'flex flex-col gap-3 rounded-xl border bg-base p-4',
				offReason ? 'border-red-500/35' : 'border-zinc-800'
			)}
		>
			<header className='flex flex-col gap-1'>
				<h2 className='text-lg font-semibold text-white'>{label}</h2>

				<p className='text-sm text-text-secondary'>
					{[
						group.pluginId,
						`by ${group.author}`,
						`on ${group.mapCount} ${group.mapCount === 1 ? 'map' : 'maps'}`,
						group.reports.length > 0
							? `${group.reports.length} ${group.reports.length === 1 ? 'report' : 'reports'} from ${group.reporters} ${group.reporters === 1 ? 'person' : 'people'}`
							: 'no open reports',
					].join(' · ')}
				</p>
			</header>

			{offReason && (
				<p
					className='flex items-start gap-1.5 text-sm text-red-300'
					role='status'
				>
					<Ban aria-hidden className='mt-0.5 size-4 shrink-0' />

					{`${group.pluginDisabledReason ? 'Turned off everywhere' : 'This version is turned off everywhere'}: ${offReason}`}
				</p>
			)}

			{Object.keys(group.counts).length > 0 && (
				<ul className='flex flex-wrap gap-2 text-xs'>
					{(
						Object.entries(group.counts) as Array<[PluginReportReason, number]>
					).map(([key, count]) => (
						<li
							className='rounded-lg border border-zinc-700 px-2 py-0.5 text-zinc-300'
							key={key}
						>
							{`${PLUGIN_REPORT_REASON_LABELS[key]} · ${count}`}
						</li>
					))}
				</ul>
			)}

			{group.reports.length > 0 && (
				<ul className='flex flex-col gap-2'>
					{group.reports.map((report) => (
						<li
							className='text-[13px] leading-[19px] text-zinc-300'
							key={report.id}
						>
							{report.details
								? `“${report.details}”`
								: PLUGIN_REPORT_REASON_LABELS[report.reason]}

							<span className='text-xs text-text-secondary'>{` · ${formatTimeAgo(report.createdAt)}`}</span>

							{report.nodeData !== null && report.nodeData !== undefined && (
								<details className='mt-1'>
									<summary className='cursor-pointer text-xs text-text-secondary'>
										Node data attached
									</summary>

									<pre className='mt-1 max-h-48 overflow-auto rounded-md bg-[#0b0b0b] p-2 font-mono text-xs text-zinc-300'>
										{JSON.stringify(report.nodeData, null, 2)}
									</pre>
								</details>
							)}
						</li>
					))}
				</ul>
			)}

			{offReason ? (
				<Button
					className='self-start'
					disabled={busy !== null}
					variant='outline'
					onClick={() =>
						void act('enable', {
							action: 'enable',
							pluginId: group.pluginId,
							version: group.pluginDisabledReason ? null : group.version,
						})
					}
				>
					{spinner('enable', 'Turn back on')}
				</Button>
			) : (
				<div className='flex flex-col gap-2'>
					<label
						className='flex flex-col gap-1 text-xs text-text-secondary'
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

					<div className='flex flex-wrap justify-end gap-2'>
						{group.reports.length > 0 && (
							<Button
								disabled={busy !== null}
								variant='outline'
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

					<p className='text-right text-xs text-text-secondary'>
						{`Nodes keep their last saved view. ${group.mapCount} ${group.mapCount === 1 ? 'map owner gets' : 'map owners get'} a notification. You can turn it back on.`}
					</p>
				</div>
			)}

			{error && (
				<p className='text-xs text-error-500' role='alert'>
					{error}
				</p>
			)}
		</section>
	);
}

/** The Reports tab: what people reported, and plugins Shiko turned off. */
export function ReportsReview({
	groups,
	onChanged,
}: {
	groups: PluginReportGroup[];
	onChanged: () => void;
}) {
	if (groups.length === 0) {
		return (
			<p className='text-sm text-zinc-400'>
				No open reports, and nothing is turned off.
			</p>
		);
	}
	return (
		<div className='flex max-w-3xl flex-col gap-4'>
			{groups.map((group) => (
				<ReportGroupCard
					group={group}
					key={`${group.pluginId}@${group.version ?? ''}`}
					onChanged={onChanged}
				/>
			))}
		</div>
	);
}
