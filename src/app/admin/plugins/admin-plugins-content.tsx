'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { formatTimeAgo } from '@/components/plugins/plugin-update-details';
import { SubmissionReview } from '@/components/plugins/review/submission-review';
import { Button } from '@/components/ui/button';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { networkHostsOf } from '@/lib/plugins/manifest-schema';
import type { PluginSubmission } from '@/types/plugin-library';
import { cn } from '@/utils/cn';
import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';

const SUBMISSIONS_KEY = '/api/admin/plugins/submissions';
/** Also read by the dashboard sidebar's Plugin review badge. */
const SUMMARY_KEY = '/api/admin/plugins/summary';

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

function submissionLine(submission: PluginSubmission): string {
	const hosts = networkHostsOf(submission.permissions);
	return [
		submission.author,
		submission.previous ? 'update' : 'new',
		hosts.length > 0
			? `reaches ${hosts.join(', ')}`
			: formatTimeAgo(submission.submittedAt),
	].join(' · ');
}

function SubmissionsTab() {
	const { data, error, isLoading, mutate } = useSWR(
		SUBMISSIONS_KEY,
		(url: string) => fetchData<{ submissions: PluginSubmission[] }>(url)
	);
	const { mutate: mutateKey } = useSWRConfig();
	const [selected, setSelected] = useState<string | null>(null);
	const submissions = data?.submissions ?? [];
	const keyOf = (submission: PluginSubmission) =>
		`${submission.pluginId}@${submission.version}`;
	const current =
		submissions.find((submission) => keyOf(submission) === selected) ??
		submissions[0];

	if (isLoading) return <Skeleton className='h-40 w-full rounded-xl' />;
	if (error) {
		return (
			<div
				className='flex items-center justify-between gap-3 rounded-lg border border-error-500/30 bg-error-500/10 px-3 py-2 text-sm text-error-200'
				role='alert'
			>
				Couldn&apos;t load submissions.
				<Button onClick={() => void mutate()} size='sm' variant='outline'>
					Try again
				</Button>
			</div>
		);
	}
	if (submissions.length === 0) {
		return (
			<p className='text-sm text-zinc-400'>Nothing is waiting for review.</p>
		);
	}

	return (
		<div className='flex flex-col gap-6 lg:flex-row lg:items-start'>
			<ul
				aria-label='Submissions'
				className='flex shrink-0 flex-col gap-1 lg:w-72'
			>
				{submissions.map((submission) => {
					const isCurrent = current && keyOf(submission) === keyOf(current);
					return (
						<li key={keyOf(submission)}>
							<button
								aria-current={isCurrent ? 'true' : undefined}
								onClick={() => setSelected(keyOf(submission))}
								type='button'
								className={cn(
									'flex w-full flex-col gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60',
									isCurrent
										? 'border-primary-500/40 bg-primary-500/10'
										: 'border-transparent hover:bg-white/[0.04]'
								)}
							>
								<span className='text-sm font-medium text-text-primary'>
									{`${submission.name} ${submission.version}`}
								</span>

								<span className='text-xs text-text-secondary'>
									{submissionLine(submission)}
								</span>
							</button>
						</li>
					);
				})}
			</ul>

			{current && (
				<SubmissionReview
					key={keyOf(current)}
					submission={current}
					onDecided={() => {
						setSelected(null);
						void mutate();
						void mutateKey(SUMMARY_KEY);
					}}
				/>
			)}
		</div>
	);
}

/** /admin/plugins: Shiko's reviewers approve submissions and act on reports. */
export function AdminPluginsContent() {
	const { data: summary } = useSWR(
		SUMMARY_KEY,
		(url: string) => fetchData<{ submissions: number; reports: number }>(url)
	);

	return (
		<SidebarProvider>
			<DashboardLayout>
				<div className='p-6 md:p-8'>
					<div className='mx-auto flex max-w-6xl flex-col gap-6'>
						<div className='flex flex-col gap-4'>
							<h1 className='text-3xl font-bold tracking-tight text-white'>
								Plugin review
							</h1>

							<nav
								aria-label='Plugin review'
								className='flex gap-1 border-b border-zinc-800'
							>
								<span
									aria-current='page'
									className='-mb-px border-b-2 border-primary-500 px-3 py-2 text-sm font-medium text-white'
								>
									{`Submissions${summary ? ` ${summary.submissions}` : ''}`}
								</span>
							</nav>
						</div>

						<SubmissionsTab />
					</div>
				</div>
			</DashboardLayout>
		</SidebarProvider>
	);
}
