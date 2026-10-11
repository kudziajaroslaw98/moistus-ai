'use client';

import {
	DashboardPage,
	PRIMARY_BUTTON_CLASS,
} from '@/components/dashboard/dashboard-page';
import { SideSheet } from '@/components/dashboard/side-sheet';
import { PluginSubmitSheet } from '@/components/plugins/plugin-submit-sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { draftManifestUrl } from '@/lib/plugins/drafts-client';
import {
	MAX_DRAFT_SAMPLE_BYTES,
	MAX_PLUGIN_CODE_BYTES,
} from '@/lib/plugins/limits';
import { networkHostsOf } from '@/lib/plugins/manifest-schema';
import { requestPluginJson } from '@/lib/plugins/network-client';
import {
	mockFetchAll,
	type FetchAll,
} from '@/lib/plugins/playground/mock-network';
import {
	defaultMockAnswer,
	fitSample,
	seedSampleData,
	type PlaygroundSample,
} from '@/lib/plugins/playground/sample-data';
import { type PluginData } from '@/lib/plugins/plugin-fields';
import { PLUGIN_ICONS } from '@/lib/plugins/plugin-icons';
import { cn } from '@/utils/cn';
import { downloadTextFile } from '@/utils/download-text-file';
import { ArrowLeft, Download, Puzzle, Send } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChecksPanel } from './checks-panel';
import { DeveloperModeGate } from './developer-mode-gate';
import { NetworkPanel } from './network-panel';
import {
	PANEL_CLASS,
	PANEL_TITLE_CLASS,
	QUIET_BUTTON_CLASS,
} from './playground-styles';
import { PreviewPane } from './preview-pane';
import { SampleDataForm } from './sample-data-form';
import { TryOnMapPopover } from './try-on-map-popover';
import { useDraft, type DraftSaveState } from './use-draft';
import {
	useDraftChecks,
	useDraftProgram,
	usePlaygroundHost,
	usePlaygroundNode,
} from './use-playground';

// CodeMirror only loads on this page.
const CodeEditor = dynamic(
	() => import('./code-editor').then((module) => module.CodeEditor),
	{
		ssr: false,
		loading: () => <div aria-busy className='h-full' />,
	}
);

/** The manifest's `"id"` line: Shiko sets it, so the editor won't let it change. */
const ID_LINE = /^\s*"id"\s*:/;

type FileTab = 'plugin' | 'manifest';

const SAVE_LABEL: Record<DraftSaveState, string> = {
	saved: 'Saved',
	saving: 'Saving…',
	unsaved: 'Unsaved changes',
	error: 'Couldn’t save. Trying again…',
};

const SAVE_DOT: Record<DraftSaveState, string> = {
	saved: 'bg-emerald-400',
	saving: 'bg-amber-300',
	unsaved: 'bg-amber-300',
	error: 'bg-red-400',
};

const byteLength = (text: string) => new Blob([text]).size;

const formatKb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

function DraftMessage({
	title,
	children,
}: {
	title: string;
	children?: React.ReactNode;
}) {
	return (
		<div className='mx-auto mt-14 flex max-w-[560px] flex-col gap-3 rounded-2xl border border-[#1d1f24] bg-[#0e0f12] p-7'>
			<h1 className='text-xl font-semibold text-white'>{title}</h1>

			{children}

			<Link
				className='text-sm text-sky-400 [@media(hover:hover)]:hover:underline'
				href='/dashboard/plugins/mine'
			>
				Back to My plugins
			</Link>
		</div>
	);
}

function PlaygroundWorkspace({ draftId }: { draftId: string }) {
	const draft = useDraft(draftId);
	const host = usePlaygroundHost();
	const { program } = useDraftProgram(host, draft.manifestText, draft.code);
	const { checks, summary } = useDraftChecks(
		host,
		draft.manifestText,
		draft.code,
		undefined
	);

	const [tab, setTab] = useState<FileTab>('plugin');
	const [wide, setWide] = useState(false);
	const [canEdit, setCanEdit] = useState(true);
	const [kindName, setKindName] = useState<string | null>(null);
	const [realRequests, setRealRequests] = useState(false);
	const [submitOpen, setSubmitOpen] = useState(false);

	const { setCheckSummary, checkSummary } = draft;
	useEffect(() => {
		if (!summary) return;
		if (
			summary.passed === checkSummary?.passed &&
			summary.total === checkSummary?.total
		) {
			return;
		}
		setCheckSummary(summary);
	}, [summary, checkSummary, setCheckSummary]);

	const manifest = program?.ok ? program.manifest : null;
	const kind = useMemo(
		() =>
			manifest
				? (manifest.nodeKinds.find(
						(candidate) => candidate.kind === kindName
					) ?? manifest.nodeKinds[0])
				: null,
		[manifest, kindName]
	);

	const sample = draft.sample as PlaygroundSample;
	const seeded = useMemo(() => (kind ? seedSampleData(kind) : {}), [kind]);
	const data: PluginData = (kind && sample.kinds?.[kind.kind]) || seeded;
	const mock = sample.mock ?? (kind ? defaultMockAnswer(kind) : '{}');
	const hosts = useMemo(
		() => (manifest ? networkHostsOf(manifest.permissions) : []),
		[manifest]
	);
	const hostsKey = hosts.join(',');

	const { setSample } = draft;
	const kindKey = kind?.kind;
	const updateSample = useCallback(
		(next: PlaygroundSample) =>
			setSample(
				fitSample(next, kindKey ?? '', MAX_DRAFT_SAMPLE_BYTES) as Record<
					string,
					unknown
				>
			),
		[setSample, kindKey]
	);
	const onData = useCallback(
		(next: PluginData) => {
			if (!kindKey) return;
			updateSample({ ...sample, kinds: { ...sample.kinds, [kindKey]: next } });
		},
		[sample, kindKey, updateSample]
	);

	const fetchAll = useMemo<FetchAll>(
		() =>
			realRequests
				? (urls) =>
						requestPluginJson(urls, {
							kind: 'developer',
							hosts: hostsKey.split(','),
						})
				: mockFetchAll(mock, hostsKey ? hostsKey.split(',') : []),
		[realRequests, mock, hostsKey]
	);

	const node = usePlaygroundNode({
		host,
		manifest,
		kind,
		data,
		canEdit,
		onData,
		fetchAll,
	});

	if (draft.status === 'loading') {
		return <Skeleton className='mt-9 h-[560px] rounded-2xl' />;
	}
	if (draft.status === 'error') {
		return draft.error?.status === 404 ? (
			<DraftMessage title='This draft doesn’t exist'>
				<p className='text-sm text-zinc-400'>
					It may have been deleted, or it belongs to someone else.
				</p>
			</DraftMessage>
		) : (
			<DraftMessage title='The draft couldn’t be opened'>
				<p className='text-sm text-zinc-400'>{draft.error?.message}</p>
			</DraftMessage>
		);
	}

	let title = draft.draft?.name || 'Untitled plugin';
	let version = '';
	try {
		const raw = JSON.parse(draft.manifestText) as {
			name?: unknown;
			version?: unknown;
		};
		if (typeof raw.name === 'string' && raw.name) title = raw.name;
		if (typeof raw.version === 'string') version = raw.version;
	} catch {
		// Half-typed JSON: keep the name the server last saw.
	}
	const pluginBytes = byteLength(draft.code);
	// The review copies what the server has, so save first and only then open the sheet.
	const openSubmit = async () => {
		if (!(await draft.flush())) {
			toast.error('Couldn’t save the draft first. Try again.');
			return;
		}
		setSubmitOpen(true);
	};
	const refresh =
		node.canRefresh && hosts.length > 0
			? { hosts, busy: node.refreshing, onRefresh: () => void node.refresh() }
			: null;

	return (
		<>
			<Link
				className='mt-1 inline-flex items-center gap-0.5 text-sm text-zinc-400 [@media(hover:hover)]:hover:text-white'
				href='/dashboard/plugins/mine'
			>
				<ArrowLeft aria-hidden className='size-4' />
				My plugins
			</Link>

			<div className='mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-4'>
				<div className='min-w-0'>
					<h1 className='flex flex-wrap items-center gap-3 text-3xl font-bold leading-tight tracking-[-0.02em] text-white'>
						{title}

						<span className='rounded-full border border-[#2a2c33] bg-[#0e0f12] px-2 py-0.5 text-[11px] font-normal leading-4 tracking-normal text-zinc-300'>
							Draft
						</span>
					</h1>

					<p className='mt-2 text-sm text-zinc-400'>
						<code className='font-mono text-[13px] text-zinc-300'>
							{draft.draft?.pluginId}
						</code>

						{version && ` · v${version}`}

						{' · Only you see this draft.'}
					</p>
				</div>

				<div className='flex flex-wrap gap-2'>
					<button
						className={QUIET_BUTTON_CLASS}
						type='button'
						onClick={() => {
							downloadTextFile(
								'manifest.json',
								draft.manifestText,
								'application/json'
							);
							downloadTextFile('plugin.js', draft.code, 'text/javascript');
						}}
					>
						<Download aria-hidden className='size-3.5' />
						Export files
					</button>

					<TryOnMapPopover draftId={draftId} saveFirst={draft.flush} />

					<button
						className={PRIMARY_BUTTON_CLASS}
						onClick={() => void openSubmit()}
						type='button'
					>
						<Send aria-hidden className='size-3.5' />
						Submit for review
					</button>
				</div>
			</div>

			{draft.conflict && (
				<div
					className='mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/30 bg-amber-300/[0.06] px-4 py-3'
					role='alert'
				>
					<p className='text-sm text-amber-100'>
						This draft was changed somewhere else, maybe in another tab.
					</p>

					<div className='flex gap-2'>
						<button
							className={QUIET_BUTTON_CLASS}
							onClick={draft.loadNewer}
							type='button'
						>
							Load the newer version
						</button>

						<button
							className={QUIET_BUTTON_CLASS}
							onClick={draft.keepMine}
							type='button'
						>
							Keep mine
						</button>
					</div>
				</div>
			)}

			<div className='mt-9 flex flex-wrap items-start gap-4 border-t border-[#1d1f24] pt-6'>
				<div className='flex min-w-0 flex-[999_1_640px] flex-col gap-4'>
					<section aria-label='Plugin files' className={PANEL_CLASS}>
						<div className='flex flex-wrap items-stretch justify-between gap-x-3 border-b border-[#1d1f24] pr-4'>
							<div aria-label='Files' className='flex h-11' role='tablist'>
								{(
									[
										['plugin', 'plugin.js'],
										['manifest', 'manifest.json'],
									] as const
								).map(([id, label]) => (
									<button
										aria-selected={tab === id}
										key={id}
										onClick={() => setTab(id)}
										role='tab'
										type='button'
										className={cn(
											'flex items-center px-3.5 font-mono text-[13px] transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500',
											tab === id
												? 'bg-white/[0.03] text-white shadow-[inset_0_-2px_0_#fafafa]'
												: 'text-zinc-400 [@media(hover:hover)]:hover:text-white'
										)}
									>
										{label}
									</button>
								))}
							</div>

							<span className='flex items-center font-mono text-xs text-zinc-500'>
								{tab === 'plugin'
									? `${formatKb(pluginBytes)} of ${formatKb(MAX_PLUGIN_CODE_BYTES)}`
									: formatKb(byteLength(draft.manifestText))}
							</span>
						</div>

						<div className='h-[460px] bg-[#0b0b0d]'>
							<div className={cn('h-full', tab !== 'plugin' && 'hidden')}>
								<CodeEditor
									className='h-full'
									label='plugin.js'
									language='javascript'
									onChange={draft.setCode}
									value={draft.code}
								/>
							</div>

							<div className={cn('h-full', tab !== 'manifest' && 'hidden')}>
								<CodeEditor
									className='h-full'
									label='manifest.json'
									language='json'
									lockedLine={ID_LINE}
									onChange={draft.setManifestText}
									value={draft.manifestText}
								/>
							</div>
						</div>

						<div className='flex h-[38px] items-center justify-between gap-3 border-t border-[#1d1f24] px-4 text-xs text-zinc-500'>
							<span className='flex items-center gap-1.5' role='status'>
								<span
									aria-hidden
									className={cn(
										'size-1.5 rounded-full',
										SAVE_DOT[draft.saveState]
									)}
								/>

								{SAVE_LABEL[draft.saveState]}
							</span>

							<span className='font-mono'>
								{tab === 'plugin'
									? 'JavaScript'
									: 'JSON · the id line is set by Shiko'}
							</span>
						</div>
					</section>

					<ChecksPanel checks={checks} summary={summary} />
				</div>

				<div className='flex min-w-0 max-w-[760px] flex-[1_1_420px] flex-col gap-4'>
					<PreviewPane
						canEdit={canEdit}
						kind={kind}
						last={node.last}
						manifest={manifest}
						needsSampleData={Object.keys(node.fieldErrors).length > 0}
						onAction={(action, payload) => void node.runAction(action, payload)}
						onCanEditChange={setCanEdit}
						onKindChange={setKindName}
						onWideChange={setWide}
						problem={program && !program.ok ? program.message : null}
						refresh={refresh}
						renderError={node.error}
						starting={!program}
						view={node.view}
						wide={wide}
					/>

					{kind && (
						<section
							aria-label='Sample data'
							className={cn(PANEL_CLASS, 'p-4')}
						>
							<div className='mb-3.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1'>
								<h2 className={PANEL_TITLE_CLASS}>Sample data</h2>

								<span className='text-xs text-zinc-500'>
									The fields come from manifest.json
								</span>
							</div>

							<SampleDataForm
								data={data}
								errors={node.fieldErrors}
								kind={kind}
								onChange={onData}
							/>
						</section>
					)}

					{kind && hosts.length > 0 && (
						<NetworkPanel
							hosts={hosts}
							mock={mock}
							onMockChange={(text) => updateSample({ ...sample, mock: text })}
							onRealChange={setRealRequests}
							real={realRequests}
						/>
					)}
				</div>
			</div>

			<SideSheet
				icon={PLUGIN_ICONS[manifest?.icon ?? 'puzzle'] ?? Puzzle}
				onOpenChange={setSubmitOpen}
				open={submitOpen}
				subtitle={draft.draft?.pluginId}
				title={`Submit ${title}`}
			>
				{submitOpen && (
					<PluginSubmitSheet
						manifestUrl={draftManifestUrl(draftId)}
						onClose={() => setSubmitOpen(false)}
					/>
				)}
			</SideSheet>
		</>
	);
}

/**
 * The plugin playground: write manifest.json and plugin.js, watch the node draw, run its
 * actions and the checks, all in the browser. Behind Developer mode.
 */
export function PlaygroundPage({ draftId }: { draftId: string }) {
	return (
		<DashboardPage className='pt-8'>
			<DeveloperModeGate>
				<PlaygroundWorkspace draftId={draftId} key={draftId} />
			</DeveloperModeGate>
		</DashboardPage>
	);
}
