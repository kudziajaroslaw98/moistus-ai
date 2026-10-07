'use client';

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { PluginSubmitSheet } from '@/components/plugins/plugin-submit-sheet';
import { formatTimeAgo } from '@/components/plugins/plugin-update-details';
import { PluginsPageTabs } from '@/components/plugins/plugins-page-tabs';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { isLocalDevPluginUrl } from '@/lib/plugins/catalog';
import type { MyPlugin, MyPluginVersion } from '@/types/plugin-library';
import { cn } from '@/utils/cn';
import { Ban } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';

const MINE_KEY = '/api/plugins/mine';

async function fetchMine(url: string): Promise<MyPlugin[]> {
	const response = await fetch(url);
	const body = (await response.json().catch(() => null)) as {
		data?: { plugins: MyPlugin[] };
		error?: string;
	} | null;
	if (!response.ok || !body?.data)
		throw new Error(body?.error ?? 'Could not load your plugins');
	return body.data.plugins;
}

const STATUS: Record<
	MyPluginVersion['status'],
	{ label: string; className: string }
> = {
	in_review: {
		label: 'In review',
		className: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
	},
	published: {
		label: 'Published',
		className: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
	},
	changes_requested: {
		label: 'Changes requested',
		className: 'border-red-500/20 bg-red-500/10 text-red-300',
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
	const status = STATUS[version.status];
	return (
		<li className='flex flex-col gap-1.5 border-t border-zinc-800 pt-2.5 first:border-t-0 first:pt-0'>
			<div className='flex flex-wrap items-center gap-2'>
				<span className='w-12 text-sm font-medium tabular-nums text-text-primary'>
					{version.version}
				</span>

				<span
					className={cn(
						'rounded-lg border px-1.5 py-0.5 text-[11px] font-medium leading-4',
						status.className
					)}
				>
					{status.label}
				</span>

				<span className='text-xs text-text-secondary'>{when(version)}</span>
			</div>

			{version.reviewMessage && version.status !== 'published' && (
				<blockquote className='ml-14 border-l-2 border-zinc-700 pl-3 text-[13px] leading-[19px] text-zinc-300'>
					{`“${version.reviewMessage}”`}

					<span className='block text-xs text-text-secondary'>
						Shiko review
					</span>
				</blockquote>
			)}

			{version.disabledReason && (
				<p className='ml-14 flex items-start gap-1.5 text-xs text-red-300'>
					<Ban aria-hidden className='mt-px size-3.5 shrink-0' />

					{`Turned off by Shiko: ${version.disabledReason}`}
				</p>
			)}
		</li>
	);
}

/** Asks for the developer plugin's localhost manifest URL, then shows the submit sheet. */
function SubmitDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [url, setUrl] = useState('');
	const [chosen, setChosen] = useState<string | null>(null);
	const valid = isLocalDevPluginUrl(url.trim());

	const close = (next: boolean) => {
		if (!next) {
			setChosen(null);
			setUrl('');
		}
		onOpenChange(next);
	};

	return (
		<Dialog onOpenChange={close} open={open}>
			<DialogContent className='max-h-[85dvh] overflow-y-auto border border-zinc-800 bg-zinc-950 p-5 sm:max-w-[480px]'>
				<DialogHeader>
					<DialogTitle>Submit a version</DialogTitle>

					<DialogDescription>
						Load it from where you&apos;re building it, the same address you use
						in Developer mode.
					</DialogDescription>
				</DialogHeader>

				{chosen ? (
					<PluginSubmitSheet
						manifestUrl={chosen}
						onClose={() => close(false)}
					/>
				) : (
					<form
						className='flex flex-col gap-3'
						onSubmit={(event) => {
							event.preventDefault();
							if (valid) setChosen(url.trim());
						}}
					>
						<label
							className='flex flex-col gap-1 text-xs text-text-secondary'
							htmlFor='submit-url'
						>
							Plugin manifest URL
							<Input
								id='submit-url'
								onChange={(event) => setUrl(event.target.value)}
								placeholder='http://localhost:5173/manifest.json'
								value={url}
							/>
						</label>

						<Button className='self-end' disabled={!valid} type='submit'>
							Check it
						</Button>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}

/** Dashboard › Plugins › My plugins: what you submitted and what Shiko said. */
export function MyPluginsContent() {
	const {
		data: plugins,
		error,
		isLoading,
		mutate,
	} = useSWR(MINE_KEY, fetchMine);
	const [submitOpen, setSubmitOpen] = useState(false);

	return (
		<SidebarProvider>
			<DashboardLayout title='Plugins'>
				<div className='p-6 md:p-8'>
					<div className='mx-auto flex max-w-3xl flex-col gap-6'>
						<div className='flex flex-col gap-4'>
							<h1 className='text-3xl font-bold tracking-tight text-white'>
								Plugins
							</h1>

							<PluginsPageTabs current='mine' />
						</div>

						<div className='flex flex-wrap items-center justify-between gap-3'>
							<p className='text-sm text-zinc-400'>
								Plugins you submitted to the library. Shiko reviews every
								version before map owners can turn it on.
							</p>

							<Button onClick={() => setSubmitOpen(true)} variant='outline'>
								Submit a version
							</Button>
						</div>

						{error && (
							<div
								className='flex items-center justify-between gap-3 rounded-lg border border-error-500/30 bg-error-500/10 px-3 py-2 text-sm text-error-200'
								role='alert'
							>
								Couldn&apos;t load your plugins.
								<Button
									onClick={() => void mutate()}
									size='sm'
									variant='outline'
								>
									Try again
								</Button>
							</div>
						)}

						{isLoading && <Skeleton className='h-32 w-full rounded-xl' />}

						{plugins && plugins.length === 0 && (
							<p className='rounded-xl border border-zinc-800 bg-base p-5 text-sm text-zinc-400'>
								You haven&apos;t submitted a plugin yet. Build one, load it in
								Developer mode, then choose Submit to the library in a
								map&apos;s Plugins panel.{' '}

								<Link
									className='font-medium text-primary-400 hover:text-primary-300'
									href='/dashboard/plugins/build'
								>
									How to build a plugin
								</Link>
							</p>
						)}

						{plugins?.map((plugin) => {
							const published = plugin.versions.some(
								(version) => version.status === 'published'
							);
							return (
								<article
									className='flex flex-col gap-3 rounded-xl border border-zinc-800 bg-base p-4'
									data-testid={`my-plugin-${plugin.id}`}
									key={plugin.id}
								>
									<div className='flex items-start gap-3'>
										<span
											aria-hidden
											className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/15 text-sm font-semibold text-primary-300'
										>
											{plugin.name.charAt(0).toUpperCase()}
										</span>

										<div className='flex min-w-0 flex-col gap-0.5'>
											<h2 className='text-[15px] font-medium leading-5 text-text-primary'>
												{plugin.name}
											</h2>

											<span className='text-xs text-text-secondary'>
												{published
													? `${plugin.id} · on in ${plugin.mapCount} ${plugin.mapCount === 1 ? 'map' : 'maps'} · ${plugin.openReports} ${plugin.openReports === 1 ? 'report' : 'reports'}`
													: `${plugin.id} · not published yet`}
											</span>
										</div>
									</div>

									{plugin.disabledReason && (
										<p className='flex items-start gap-1.5 rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1.5 text-xs leading-4 text-red-300'>
											<Ban aria-hidden className='mt-px size-3.5 shrink-0' />

											{`Turned off everywhere by Shiko: ${plugin.disabledReason}`}
										</p>
									)}

									<ul className='flex flex-col gap-2.5'>
										{plugin.versions.map((version) => (
											<VersionRow key={version.version} version={version} />
										))}
									</ul>
								</article>
							);
						})}
					</div>
				</div>

				<SubmitDialog
					open={submitOpen}
					onOpenChange={(open) => {
						setSubmitOpen(open);
						if (!open) void mutate();
					}}
				/>
			</DashboardLayout>
		</SidebarProvider>
	);
}
