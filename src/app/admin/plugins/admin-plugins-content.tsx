'use client';

import {
	CatalogCard,
	CatalogCardSkeleton,
	CatalogGrid,
	type CatalogChip,
} from '@/components/dashboard/catalog-card';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import {
	CARD_BUTTON_CLASS,
	DashboardPage,
	PageHeading,
} from '@/components/dashboard/dashboard-page';
import {
	UnderlineTab,
	UnderlineTabsBar,
	UnderlineTabsList,
} from '@/components/dashboard/underline-tabs';
import { formatTimeAgo } from '@/components/plugins/plugin-update-details';
import { ReportsReview } from '@/components/plugins/review/reports-review';
import { SubmissionReview } from '@/components/plugins/review/submission-review';
import { Button } from '@/components/ui/button';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Tabs } from '@/components/ui/tabs';
import { permissionChanges } from '@/lib/plugins/catalog';
import type { PluginPermission } from '@/lib/plugins/manifest-schema';
import { PLUGIN_ICONS } from '@/lib/plugins/plugin-icons';
import {
	describePowerKind,
	PLUGIN_POWER_HUES,
	powerKindOfPermissions,
} from '@/lib/plugins/powers';
import type {
	PluginReportGroup,
	PluginSubmission,
} from '@/types/plugin-library';
import { Puzzle } from 'lucide-react';
import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';

const SUBMISSIONS_KEY = '/api/admin/plugins/submissions';
/** Also read by the dashboard sidebar's Plugin review badge. */
const SUMMARY_KEY = '/api/admin/plugins/summary';
const REPORTS_KEY = '/api/admin/plugins/reports';

async function fetchData<T>(url: string): Promise<T> {
	const response = await fetch(url, { cache: 'no-store' });
	const body = (await response.json().catch(() => null)) as {
		data?: T;
		error?: string;
	} | null;
	if (!response.ok || !body?.data)
		throw new Error(body?.error ?? `Request failed (${response.status})`);
	return body.data;
}

function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
	return (
		<div
			className='mt-6 flex items-center justify-between gap-3 rounded-xl border border-error-500/30 bg-error-500/10 px-3 py-2 text-sm text-error-200'
			role='alert'
		>
			{`Couldn't load ${what}.`}
			<Button onClick={onRetry} size='sm' variant='outline'>
				Try again
			</Button>
		</div>
	);
}

const keyOf = (submission: PluginSubmission) =>
	`${submission.pluginId}@${submission.version}`;

/** Submissions as cards; Review opens the submission's sheet (checks, code changes, decision). */
function SubmissionsTab() {
	const { data, error, isLoading, mutate } = useSWR(
		SUBMISSIONS_KEY,
		(url: string) => fetchData<{ submissions: PluginSubmission[] }>(url)
	);
	const { mutate: mutateKey } = useSWRConfig();
	const [selected, setSelected] = useState<string | null>(null);
	const submissions = data?.submissions ?? [];
	const current = submissions.find(
		(submission) => keyOf(submission) === selected
	);

	if (error)
		return <LoadError onRetry={() => void mutate()} what='submissions' />;
	if (!isLoading && submissions.length === 0) {
		return (
			<p className='mt-6 text-sm text-zinc-400'>
				Nothing is waiting for review.
			</p>
		);
	}

	return (
		<>
			<CatalogGrid className='mt-6' viewMode='grid'>
				{isLoading && <CatalogCardSkeleton count={3} viewMode='grid' />}

				{submissions.map((submission) => {
					const added = submission.previous
						? permissionChanges(
								submission.previous.permissions as PluginPermission[],
								submission.permissions as PluginPermission[]
							).added
						: [];
					const chips: CatalogChip[] = [
						{
							label: submission.previous
								? `Update from ${submission.previous.version}`
								: 'New plugin',
						},
						...(added.length > 0
							? [{ label: 'New power', tone: 'amber' as const }]
							: []),
					];
					const icon = submission.manifest.icon;
					return (
						<CatalogCard
							chips={chips}
							description={
								submission.notes ||
								submission.submitterNote ||
								'No notes from the author.'
							}
							hue={
								PLUGIN_POWER_HUES[
									powerKindOfPermissions(submission.permissions)
								]
							}
							icon={
								(typeof icon === 'string' &&
									PLUGIN_ICONS[icon as keyof typeof PLUGIN_ICONS]) ||
								Puzzle
							}
							key={keyOf(submission)}
							meta={`by ${submission.author} · ${formatTimeAgo(submission.submittedAt)}`}
							onOpen={() => setSelected(keyOf(submission))}
							title={`${submission.name} ${submission.version}`}
							viewMode='grid'
							action={
								<button
									className={CARD_BUTTON_CLASS}
									onClick={() => setSelected(keyOf(submission))}
									type='button'
								>
									Review
								</button>
							}
							detail={
								<span
									className={
										added.length > 0 ? 'truncate text-amber-300' : 'truncate'
									}
								>
									{describePowerKind(submission.permissions)}
								</span>
							}
						/>
					);
				})}
			</CatalogGrid>

			{current && (
				<SubmissionReview
					key={keyOf(current)}
					onOpenChange={(open) => !open && setSelected(null)}
					submission={current}
					onDecided={() => {
						setSelected(null);
						void mutate();
						void mutateKey(SUMMARY_KEY);
					}}
				/>
			)}
		</>
	);
}

function ReportsTab() {
	const { mutate: mutateKey } = useSWRConfig();
	const { data, error, isLoading, mutate } = useSWR(
		REPORTS_KEY,
		(url: string) => fetchData<{ groups: PluginReportGroup[] }>(url)
	);

	if (error) return <LoadError onRetry={() => void mutate()} what='reports' />;
	if (isLoading) {
		return (
			<CatalogGrid className='mt-6' viewMode='grid'>
				<CatalogCardSkeleton count={3} viewMode='grid' />
			</CatalogGrid>
		);
	}
	return (
		<ReportsReview
			groups={data?.groups ?? []}
			onChanged={() => {
				void mutate();
				void mutateKey(SUMMARY_KEY);
			}}
		/>
	);
}

const TABS = [
	{ id: 'submissions', label: 'Submissions' },
	{ id: 'reports', label: 'Reports' },
] as const;

type ReviewTab = (typeof TABS)[number]['id'];

/** /admin/plugins: Shiko's reviewers approve submissions and act on reports. */
export function AdminPluginsContent() {
	const { data: summary } = useSWR(SUMMARY_KEY, (url: string) =>
		fetchData<{ submissions: number; reports: number }>(url)
	);
	const [tab, setTab] = useState<ReviewTab>('submissions');

	return (
		<SidebarProvider>
			<DashboardLayout title='Plugin review'>
				<DashboardPage>
					<PageHeading
						intro='Approve new plugins and versions, and act on what people report.'
						title='Plugin review'
					/>

					<Tabs
						className='mt-9 gap-0'
						onValueChange={(value) => setTab(value as ReviewTab)}
						value={tab}
					>
						<UnderlineTabsBar>
							<UnderlineTabsList aria-label='Plugin review'>
								{TABS.map((item) => (
									<UnderlineTab
										count={summary?.[item.id]}
										key={item.id}
										value={item.id}
									>
										{item.label}
									</UnderlineTab>
								))}
							</UnderlineTabsList>
						</UnderlineTabsBar>
					</Tabs>

					<div>
						{tab === 'submissions' ? <SubmissionsTab /> : <ReportsTab />}
					</div>
				</DashboardPage>
			</DashboardLayout>
		</SidebarProvider>
	);
}
