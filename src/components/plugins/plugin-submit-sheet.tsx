'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
	catalogManifestUrl,
	findCatalogPlugin,
	latestCatalogVersion,
} from '@/lib/plugins/catalog';
import type { PluginCheckResult } from '@/lib/plugins/plugin-checks';
import { PLUGIN_ICONS } from '@/lib/plugins/plugin-icons';
import { refreshPluginLibrary } from '@/lib/plugins/plugin-library-client';
import { loadPluginHost } from '@/lib/plugins/runtime/load-plugin-host';
import type { PluginSubmissionResult } from '@/types/plugin-library';
import { ArrowUpRight, Check, CircleCheck, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { PluginPowersLine } from './plugin-powers';

type Stage =
	| { kind: 'loading' }
	| { kind: 'failed'; message: string }
	| {
			kind: 'ready';
			raw: Record<string, unknown>;
			code: string;
			result: PluginCheckResult;
			/** The newest published version, when this is an update. */
			previousVersion: string | null;
	  }
	| { kind: 'sent'; name: string; version: string };

async function fetchJson(url: string): Promise<unknown> {
	const response = await fetch(url, { cache: 'no-store' });
	if (!response.ok)
		throw new Error(`Couldn't load ${url} (${response.status})`);
	return response.json();
}

/**
 * Loads a developer plugin from localhost, runs the automatic checks in the sandbox and
 * sends it to Shiko's review. The same checks run again for the reviewer.
 */
async function prepare(
	manifestUrl: string
): Promise<Extract<Stage, { kind: 'ready' }>> {
	const raw = (await fetchJson(manifestUrl)) as Record<string, unknown>;
	const main = typeof raw.main === 'string' ? raw.main : 'plugin.js';
	const codeResponse = await fetch(
		new URL(main, new URL(manifestUrl, window.location.href)),
		{
			cache: 'no-store',
		}
	);
	if (!codeResponse.ok)
		throw new Error(`Couldn't load ${main} (${codeResponse.status})`);
	const code = await codeResponse.text();

	await refreshPluginLibrary({ force: true });
	const id = typeof raw.id === 'string' ? raw.id : '';
	const published = findCatalogPlugin(id);
	const previousVersion =
		published?.source === 'community'
			? latestCatalogVersion(published).version
			: null;
	const previousManifest = previousVersion
		? await fetchJson(catalogManifestUrl(id, previousVersion)).catch(
				() => undefined
			)
		: undefined;

	const host = await loadPluginHost();
	const result = await host.check({ manifest: raw, code, previousManifest });
	return { kind: 'ready', raw, code, result, previousVersion };
}

interface PluginSubmitSheetProps {
	/** The developer plugin's manifest.json on localhost. */
	manifestUrl: string;
	onClose: () => void;
}

export function PluginSubmitSheet({
	manifestUrl,
	onClose,
}: PluginSubmitSheetProps) {
	const [stage, setStage] = useState<Stage>({ kind: 'loading' });
	const [notes, setNotes] = useState('');
	const [reviewerNote, setReviewerNote] = useState('');
	const [agreed, setAgreed] = useState(false);
	const [sending, setSending] = useState(false);
	const [sendError, setSendError] = useState<string | null>(null);
	const ids = useId();

	useEffect(() => {
		let cancelled = false;
		prepare(manifestUrl)
			.then((ready) => {
				if (!cancelled) setStage(ready);
			})
			.catch((error: unknown) => {
				if (!cancelled)
					setStage({
						kind: 'failed',
						message:
							error instanceof Error
								? error.message
								: 'The plugin could not be loaded',
					});
			});
		return () => {
			cancelled = true;
		};
	}, [manifestUrl]);

	if (stage.kind === 'loading') {
		return (
			<p
				className='flex items-center gap-2 text-sm text-text-secondary'
				role='status'
			>
				<Loader2 aria-hidden className='size-4 animate-spin' />
				Loading the plugin and running its checks…
			</p>
		);
	}

	if (stage.kind === 'failed') {
		return (
			<div className='flex flex-col gap-3'>
				<p className='text-sm text-error-500' role='alert'>
					{stage.message}
				</p>

				<Button className='self-start' onClick={onClose} variant='outline'>
					Back
				</Button>
			</div>
		);
	}

	if (stage.kind === 'sent') {
		return (
			<div className='flex flex-col gap-3' role='status'>
				<CircleCheck aria-hidden className='size-8 text-emerald-400' />

				<p className='text-base font-semibold text-text-primary'>
					{`${stage.name} ${stage.version} is in review`}
				</p>

				<p className='text-[13px] leading-[19px] text-text-secondary'>
					You&apos;ll get a notification when Shiko approves it or asks for
					changes. Until then it keeps working for you in Developer mode.
				</p>

				<Link
					className='inline-flex items-center gap-0.5 self-start rounded-sm text-sm font-medium text-primary-400 hover:text-primary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60'
					href='/dashboard/plugins/mine'
				>
					See My plugins
					<ArrowUpRight aria-hidden className='size-3.5' />
				</Link>
			</div>
		);
	}

	const { result, raw, code, previousVersion } = stage;
	const manifest = result.manifest;
	const Icon = manifest ? PLUGIN_ICONS[manifest.icon] : null;
	const needsNotes = previousVersion !== null;
	const canSend =
		result.ok && agreed && !sending && (!needsNotes || notes.trim().length > 0);
	let host = manifestUrl;
	try {
		host = new URL(manifestUrl).host;
	} catch {
		// Keep the raw text.
	}

	const submit = async () => {
		setSending(true);
		setSendError(null);
		try {
			const response = await fetch('/api/plugins/submissions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					manifest: raw,
					code,
					notes: notes.trim() || undefined,
					submitterNote: reviewerNote.trim() || undefined,
					agreed: true,
				}),
			});
			const body = (await response.json().catch(() => null)) as {
				data?: PluginSubmissionResult;
				error?: string;
			} | null;
			if (!response.ok || !body?.data) {
				throw new Error(body?.error ?? 'The plugin could not be submitted');
			}
			setStage({
				kind: 'sent',
				name: manifest?.name ?? body.data.pluginId,
				version: body.data.version,
			});
		} catch (error) {
			setSendError(
				error instanceof Error
					? error.message
					: 'The plugin could not be submitted'
			);
		} finally {
			setSending(false);
		}
	};

	return (
		<div className='flex flex-col gap-4' data-testid='plugin-submit-sheet'>
			{manifest && (
				<div className='flex items-start gap-3'>
					<span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/15 text-primary-400'>
						{Icon && <Icon aria-hidden className='size-[18px]' />}
					</span>

					<div className='flex min-w-0 flex-col gap-0.5'>
						<span className='text-sm font-medium text-text-primary'>
							{manifest.name}
						</span>

						<span className='text-xs text-text-secondary'>
							{`${manifest.id} · v${manifest.version}${previousVersion ? ` · update from ${previousVersion}` : ''}`}
						</span>

						<span className='mt-1 text-[13px] leading-[18px] text-zinc-300'>
							{manifest.description}
						</span>
					</div>
				</div>
			)}

			{manifest && (
				<section className='flex flex-col gap-1.5'>
					<h3 className='text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55'>
						What it can do
					</h3>

					<PluginPowersLine manifest={manifest} />
				</section>
			)}

			<section className='flex flex-col gap-1.5' aria-label='Checks'>
				<h3 className='text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55'>
					Checks
				</h3>

				<ul className='flex flex-col gap-1.5'>
					{result.checks.map((check) => (
						<li
							className='flex items-start gap-2 text-[13px] leading-[18px]'
							key={check.label}
						>
							{check.ok ? (
								<Check
									aria-label='Passed'
									className='mt-0.5 size-3.5 shrink-0 text-emerald-400'
								/>
							) : (
								<X
									aria-label='Failed'
									className='mt-0.5 size-3.5 shrink-0 text-error-500'
								/>
							)}

							<span className={check.ok ? 'text-zinc-200' : 'text-error-200'}>
								{check.label}

								{check.detail && (
									<span className='block text-xs text-text-secondary'>
										{check.detail}
									</span>
								)}
							</span>
						</li>
					))}
				</ul>
			</section>

			{result.ok && (
				<>
					{needsNotes && (
						<label
							className='flex flex-col gap-1 text-xs text-text-secondary'
							htmlFor={`${ids}-notes`}
						>
							{`What's new in ${manifest?.version} (map owners read this before they update)`}

							<Textarea
								id={`${ids}-notes`}
								maxLength={500}
								onChange={(event) => setNotes(event.target.value)}
								placeholder='Adds a trend arrow next to the value.'
								rows={2}
								value={notes}
							/>
						</label>
					)}

					<label
						className='flex flex-col gap-1 text-xs text-text-secondary'
						htmlFor={`${ids}-review`}
					>
						Notes for the reviewer (optional)
						<Textarea
							id={`${ids}-review`}
							maxLength={1000}
							onChange={(event) => setReviewerNote(event.target.value)}
							placeholder='What it’s for, anything we should try first'
							rows={3}
							value={reviewerNote}
						/>
					</label>

					<label className='flex items-start gap-2 text-[13px] leading-[18px] text-zinc-200'>
						<input
							checked={agreed}
							className='mt-0.5 size-4 shrink-0 accent-primary-500'
							onChange={(event) => setAgreed(event.target.checked)}
							type='checkbox'
						/>
						I wrote this plugin or have the right to publish it, and I&apos;ll
						keep it working.
					</label>

					<p className='text-xs leading-[17px] text-text-secondary'>
						{`We copy manifest.json and ${manifest?.main ?? 'plugin.js'} from ${host} now. Later changes need a new version, which is reviewed again. Your name is shown as the author.`}
					</p>
				</>
			)}

			{sendError && (
				<p className='text-xs text-error-500' role='alert'>
					{sendError}
				</p>
			)}

			<div className='flex justify-end gap-2'>
				<Button onClick={onClose} variant='outline'>
					Cancel
				</Button>

				{result.ok && (
					<Button disabled={!canSend} onClick={() => void submit()}>
						{sending ? (
							<Loader2 aria-label='Sending' className='size-4 animate-spin' />
						) : (
							'Submit for review'
						)}
					</Button>
				)}
			</div>
		</div>
	);
}
