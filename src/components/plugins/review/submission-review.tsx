'use client';

import { PluginChecksList } from '@/components/plugins/plugin-checks-list';
import { PluginPowersLine } from '@/components/plugins/plugin-powers';
import { PluginUiTree } from '@/components/plugins/plugin-ui-tree';
import { formatTimeAgo } from '@/components/plugins/plugin-update-details';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { communityFileUrl, permissionChanges } from '@/lib/plugins/catalog';
import { diffLines, type DiffHunk } from '@/lib/plugins/line-diff';
import {
	pluginManifestSchema,
	type PluginManifest,
	type PluginPermission,
} from '@/lib/plugins/manifest-schema';
import type { PluginCheckResult } from '@/lib/plugins/plugin-checks';
import { describePermission, pluginPowers } from '@/lib/plugins/powers';
import { loadPluginHost } from '@/lib/plugins/runtime/load-plugin-host';
import type {
	PluginReviewDecision,
	PluginSubmission,
} from '@/types/plugin-library';
import { cn } from '@/utils/cn';
import { Check, Loader2, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Loaded {
	manifest: PluginManifest | null;
	result: PluginCheckResult;
	/** Null for a new plugin, or when the diff would be too large. */
	diff: DiffHunk[] | null;
	code: string;
}

async function fetchText(url: string): Promise<string> {
	const response = await fetch(url, { cache: 'no-store' });
	if (!response.ok)
		throw new Error(`Couldn't load ${url} (${response.status})`);
	return response.text();
}

/** Loads the submitted code (reviewers can read versions in review) and runs the checks. */
async function load(submission: PluginSubmission): Promise<Loaded> {
	const main = String(submission.manifest.main ?? 'plugin.js');
	const code = await fetchText(
		communityFileUrl(submission.pluginId, submission.version, main)
	);
	let previousManifest: unknown;
	let previousCode: string | null = null;
	if (submission.previous) {
		const raw = await fetchText(
			communityFileUrl(
				submission.pluginId,
				submission.previous.version,
				'manifest.json'
			)
		);
		previousManifest = JSON.parse(raw) as unknown;
		const previousMain = String(
			(previousManifest as { main?: unknown }).main ?? 'plugin.js'
		);
		previousCode = await fetchText(
			communityFileUrl(
				submission.pluginId,
				submission.previous.version,
				previousMain
			)
		);
	}
	const host = await loadPluginHost();
	const result = await host.check({
		manifest: submission.manifest,
		code,
		previousManifest,
	});
	const parsed = pluginManifestSchema.safeParse(submission.manifest);
	return {
		manifest: parsed.success ? parsed.data : null,
		result,
		diff: previousCode === null ? null : diffLines(previousCode, code),
		code,
	};
}

function PowerChanges({
	submission,
	manifest,
}: {
	submission: PluginSubmission;
	manifest: PluginManifest | null;
}) {
	if (!submission.previous) {
		return manifest ? <PluginPowersLine manifest={manifest} /> : null;
	}
	const { added, removed } = permissionChanges(
		submission.previous.permissions as PluginPermission[],
		submission.permissions as PluginPermission[]
	);
	if (added.length === 0 && removed.length === 0) {
		return (
			<p className='flex items-center gap-1.5 text-xs text-text-secondary'>
				<Check aria-hidden className='size-3 shrink-0 text-emerald-400/90' />
				No new powers
			</p>
		);
	}
	return (
		<p className='flex items-start gap-1.5 text-xs leading-[17px] text-amber-200'>
			<TriangleAlert aria-hidden className='mt-0.5 size-3 shrink-0' />

			{[
				added.length
					? `New powers: ${added.map(describePermission).join(', ')}`
					: '',
				removed.length
					? `Drops: ${removed.map(describePermission).join(', ')}`
					: '',
			]
				.filter(Boolean)
				.join('. ')}
		</p>
	);
}

function CodeChanges({
	loaded,
	previousVersion,
}: {
	loaded: Loaded;
	previousVersion: string | null;
}) {
	if (!previousVersion) {
		return (
			<details className='rounded-lg border border-zinc-800 bg-[#0b0b0b]'>
				<summary className='cursor-pointer px-3 py-2 text-xs text-text-secondary'>
					{`Show the code (${loaded.code.split('\n').length} lines)`}
				</summary>

				<pre className='max-h-96 overflow-auto px-3 pb-3 font-mono text-xs leading-5 text-zinc-300'>
					{loaded.code}
				</pre>
			</details>
		);
	}
	if (!loaded.diff) {
		return (
			<p className='text-xs text-text-secondary'>
				The files are too large to compare here.
			</p>
		);
	}
	if (loaded.diff.length === 0) {
		return (
			<p className='text-xs text-text-secondary'>{`The code is the same as ${previousVersion}.`}</p>
		);
	}
	return (
		<div className='overflow-auto rounded-lg border border-zinc-800 bg-[#0b0b0b] py-2 font-mono text-xs leading-5'>
			{loaded.diff.map((hunk, hunkIndex) => (
				<div key={hunkIndex}>
					{hunkIndex > 0 && <div className='px-3 text-zinc-600'>…</div>}

					{hunk.lines.map((line, lineIndex) => (
						<div
							key={lineIndex}
							className={cn(
								'whitespace-pre px-3',
								line.type === 'add' && 'bg-emerald-500/10 text-emerald-300',
								line.type === 'remove' && 'bg-red-500/10 text-red-300',
								line.type === 'same' && 'text-zinc-500'
							)}
						>
							{`${line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '} ${line.text}`}
						</div>
					))}
				</div>
			))}
		</div>
	);
}

interface SubmissionReviewProps {
	submission: PluginSubmission;
	onDecided: () => void;
}

/**
 * One submission for Shiko's reviewer: the checks again (run here, on the stored code),
 * previews of its examples, power changes, who runs each site, code changes since the
 * published version, and Approve or Request changes.
 */
export function SubmissionReview({
	submission,
	onDecided,
}: SubmissionReviewProps) {
	const [loaded, setLoaded] = useState<Loaded | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [message, setMessage] = useState('');
	const [authorHosts, setAuthorHosts] = useState<string[]>([]);
	const [deciding, setDeciding] = useState<
		PluginReviewDecision['decision'] | null
	>(null);
	const [decideError, setDecideError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		load(submission)
			.then((next) => {
				if (!cancelled) setLoaded(next);
			})
			.catch((error: unknown) => {
				if (!cancelled)
					setLoadError(error instanceof Error ? error.message : String(error));
			});
		return () => {
			cancelled = true;
		};
	}, [submission]);

	const decide = async (decision: PluginReviewDecision['decision']) => {
		setDeciding(decision);
		setDecideError(null);
		try {
			const body: PluginReviewDecision = {
				pluginId: submission.pluginId,
				version: submission.version,
				decision,
				message: message.trim() || undefined,
				authorHosts,
			};
			const response = await fetch('/api/admin/plugins/review', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const result = (await response.json().catch(() => null)) as {
				error?: string;
			} | null;
			if (!response.ok)
				throw new Error(result?.error ?? 'The review could not be saved');
			onDecided();
		} catch (error) {
			setDecideError(
				error instanceof Error ? error.message : 'The review could not be saved'
			);
		} finally {
			setDeciding(null);
		}
	};

	const manifest = loaded?.manifest ?? null;
	const powers = manifest ? pluginPowers(manifest) : null;
	const sites = powers?.kind === 'network' ? powers.sites : [];

	return (
		<section
			aria-label={`${submission.name} ${submission.version}`}
			className='flex min-w-0 flex-1 flex-col gap-5'
			data-testid='submission-review'
		>
			<header className='flex flex-col gap-1'>
				<h2 className='text-xl font-semibold text-white'>
					{`${submission.name} ${submission.version}`}
				</h2>

				<p className='text-sm text-text-secondary'>
					{`${submission.pluginId} · by ${submission.author} · ${
						submission.previous
							? `update from ${submission.previous.version} (on ${submission.mapCount} ${submission.mapCount === 1 ? 'map' : 'maps'})`
							: 'new plugin'
					} · submitted ${formatTimeAgo(submission.submittedAt)}`}
				</p>
			</header>

			<PowerChanges manifest={manifest} submission={submission} />

			{sites.length > 0 && (
				<fieldset className='flex flex-col gap-2 rounded-lg border border-zinc-800 p-3'>
					<legend className='px-1 text-xs text-text-secondary'>
						Sites it reaches
					</legend>

					{sites.map((site) => (
						<div className='flex flex-col gap-1' key={site.host}>
							<p className='text-[13px] text-zinc-200'>
								<strong className='font-semibold'>{site.host}</strong>

								{` · run by ${site.operator} · sends ${site.sends} · `}

								<a
									className='underline decoration-white/30 underline-offset-2'
									href={site.privacyPolicy}
									rel='noopener noreferrer'
									target='_blank'
								>
									privacy policy
								</a>
							</p>

							<label className='flex items-center gap-2 text-xs text-text-secondary'>
								<input
									checked={authorHosts.includes(site.host)}
									className='size-3.5 accent-primary-500'
									type='checkbox'
									onChange={(event) =>
										setAuthorHosts((current) =>
											event.target.checked
												? [...current, site.host]
												: current.filter((host) => host !== site.host)
										)
									}
								/>
								The plugin&apos;s author runs this site (they receive
								what&apos;s sent)
							</label>
						</div>
					))}
				</fieldset>
			)}

			{(submission.notes || submission.submitterNote) && (
				<div className='flex flex-col gap-2 text-[13px] leading-[19px] text-zinc-300'>
					{submission.notes && (
						<p>
							<span className='text-text-secondary'>What&apos;s new: </span>

							{submission.notes}
						</p>
					)}

					{submission.submitterNote && (
						<p>
							<span className='text-text-secondary'>
								Notes for the reviewer:{' '}
							</span>

							{submission.submitterNote}
						</p>
					)}
				</div>
			)}

			{loadError && (
				<p className='text-sm text-error-500' role='alert'>
					{loadError}
				</p>
			)}

			{!loaded && !loadError && (
				<p
					className='flex items-center gap-2 text-sm text-text-secondary'
					role='status'
				>
					<Loader2 aria-hidden className='size-4 animate-spin' />
					Running the checks on the submitted code…
				</p>
			)}

			{loaded && (
				<>
					<PluginChecksList
						checks={loaded.result.checks}
						title='Automatic checks'
					/>

					{loaded.result.previews.map((preview) => (
						<div
							className='flex flex-col gap-1.5'
							key={`${preview.kind}:${preview.example}`}
						>
							<span className='text-xs text-text-secondary'>{`Preview · “${preview.example}”`}</span>

							<div className='max-w-[320px] rounded-[10px] border border-white/6 bg-elevation-1 p-4'>
								<PluginUiTree disabled tree={preview.tree} />
							</div>
						</div>
					))}

					<section className='flex flex-col gap-1.5'>
						<h3 className='text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55'>
							{submission.previous
								? `Code changes since ${submission.previous.version}`
								: 'Code'}
						</h3>

						<CodeChanges
							loaded={loaded}
							previousVersion={submission.previous?.version ?? null}
						/>
					</section>
				</>
			)}

			<label
				className='flex flex-col gap-1 text-xs text-text-secondary'
				htmlFor='review-message'
			>
				Message to the author
				<Textarea
					id='review-message'
					maxLength={2000}
					onChange={(event) => setMessage(event.target.value)}
					placeholder='Needed if you ask for changes'
					rows={3}
					value={message}
				/>
			</label>

			{decideError && (
				<p className='text-xs text-error-500' role='alert'>
					{decideError}
				</p>
			)}

			<div className='flex flex-wrap items-center justify-end gap-2'>
				<Button
					disabled={deciding !== null || !message.trim()}
					onClick={() => void decide('changes')}
					variant='outline'
				>
					{deciding === 'changes' ? (
						<Loader2 aria-label='Saving' className='size-4 animate-spin' />
					) : (
						'Request changes'
					)}
				</Button>

				<Button
					disabled={deciding !== null || !loaded?.result.ok}
					onClick={() => void decide('approve')}
				>
					{deciding === 'approve' ? (
						<Loader2 aria-label='Publishing' className='size-4 animate-spin' />
					) : (
						`Approve and publish ${submission.version}`
					)}
				</Button>
			</div>

			<p className='text-right text-xs text-text-secondary'>
				{`Publishing stores this exact code (sha256 ${submission.sha256.slice(0, 4)}…${submission.sha256.slice(-4)}).${
					submission.previous
						? ` Map owners on ${submission.previous.version} see “Update available”.`
						: ''
				}`}
			</p>
		</section>
	);
}
