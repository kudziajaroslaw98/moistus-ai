'use client';

import { SideSheet } from '@/components/dashboard/side-sheet';
import { findCatalogPlugin, latestCatalogVersion } from '@/lib/plugins/catalog';
import { PLUGIN_ICONS } from '@/lib/plugins/plugin-icons';
import {
	fetchPluginSource,
	type FingerprintCheck,
} from '@/lib/plugins/plugin-source';
import {
	PLUGIN_POWER_HUES,
	powerKindOfPermissions,
} from '@/lib/plugins/powers';
import { cn } from '@/utils/cn';
import { Check, ChevronDown, Copy, Puzzle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';

// CodeMirror is heavy and only this sheet and the playground use it.
const CodeEditor = dynamic(
	() =>
		import('@/components/plugins/playground/code-editor').then(
			(module) => module.CodeEditor
		),
	{
		ssr: false,
		loading: () => (
			<div aria-hidden className='h-full animate-pulse bg-[#0b0b0d]' />
		),
	}
);

const FINGERPRINT_NOTE: Record<
	FingerprintCheck,
	{ label: string; className: string }
> = {
	match: {
		label: 'Matches the reviewed fingerprint',
		className: 'border-emerald-500/30 text-emerald-300',
	},
	mismatch: {
		label: 'Doesn’t match the reviewed fingerprint. Shiko won’t run it.',
		className: 'border-red-500/35 text-red-300',
	},
	unavailable: {
		label: 'This browser can’t check the fingerprint',
		className: 'border-[#2a2c33] text-zinc-400',
	},
};

interface PluginCodeSheetProps {
	pluginId: string;
	pluginName: string;
	/** The version to open on; the newest when it isn't given or isn't in the library. */
	version?: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

/**
 * Read-only view of a library plugin's code: its published versions, the exact
 * `plugin.js` and `manifest.json` Shiko serves, and whether the code still matches the
 * fingerprint it was reviewed with. It's the same file the map loader runs, so there
 * is nothing here that isn't already public to anyone signed in.
 */
export function PluginCodeSheet({
	pluginId,
	pluginName,
	version: openOn,
	open,
	onOpenChange,
}: PluginCodeSheetProps) {
	const entry = findCatalogPlugin(pluginId);
	const versions = [...(entry?.versions ?? [])].reverse();
	const newest = entry ? latestCatalogVersion(entry).version : undefined;
	const [picked, setPicked] = useState<string | null>(null);
	const version =
		picked ??
		(versions.some((candidate) => candidate.version === openOn)
			? openOn
			: newest);
	const [file, setFile] = useState<'code' | 'manifest'>('code');
	const [copied, setCopied] = useState(false);
	const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const selectId = useId();

	const {
		data: source,
		error,
		isLoading,
		mutate,
	} = useSWR(
		open && version ? ['plugin-source', pluginId, version] : null,
		() => fetchPluginSource(pluginId, version as string),
		// A published version never changes, so there's nothing to refresh.
		{ revalidateOnFocus: false, revalidateIfStale: false }
	);

	useEffect(
		() => () => {
			if (copyTimer.current) clearTimeout(copyTimer.current);
		},
		[]
	);

	const text = source
		? file === 'code'
			? source.code
			: source.manifestText
		: '';
	const fileName = source
		? file === 'code'
			? source.mainName
			: 'manifest.json'
		: '';
	const lines = text ? text.split('\n').length : 0;
	const size =
		text.length < 1024
			? `${text.length} B`
			: `${(text.length / 1024).toFixed(1)} KB`;

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			if (copyTimer.current) clearTimeout(copyTimer.current);
			copyTimer.current = setTimeout(() => setCopied(false), 1500);
		} catch {
			toast.error('Couldn’t copy. Select the text and copy it yourself.');
		}
	};

	const fingerprint = source ? FINGERPRINT_NOTE[source.fingerprint] : null;
	const Icon =
		(source?.icon && PLUGIN_ICONS[source.icon as keyof typeof PLUGIN_ICONS]) ||
		Puzzle;

	return (
		<SideSheet
			raised
			hue={PLUGIN_POWER_HUES[powerKindOfPermissions(source?.permissions ?? [])]}
			icon={Icon}
			onOpenChange={onOpenChange}
			open={open}
			subtitle={pluginId}
			title={`${pluginName} · code`}
			width='lg'
			footer={
				<div className='flex flex-wrap items-center justify-between gap-x-3 gap-y-1'>
					<span className='text-xs leading-[17px] text-zinc-500'>
						{entry?.source === 'community'
							? `Read-only. Reviewed by Shiko before it was published${entry.author ? `, by ${entry.author}` : ''}.`
							: 'Read-only. One of Shiko’s own plugins.'}
					</span>

					{source && (
						<span className='text-xs text-zinc-500'>
							{`${lines} ${lines === 1 ? 'line' : 'lines'} · ${size}`}
						</span>
					)}
				</div>
			}
		>
			<p className='text-[13px] leading-[19px] text-zinc-400'>
				This is the exact code that runs when a map uses this plugin. Shiko
				checks its fingerprint every time it loads, and it can only do what its
				powers allow.
			</p>

			{!entry && (
				<p className='text-sm text-zinc-300' role='alert'>
					Couldn’t find this plugin in the library.
				</p>
			)}

			{entry && (
				<div className='flex min-h-0 flex-1 flex-col gap-4'>
					<div className='flex flex-wrap items-center gap-x-3.5 gap-y-2.5'>
						<label
							className='flex items-center gap-2 text-[13px] text-zinc-400'
							htmlFor={selectId}
						>
							Version
							<span className='relative inline-flex'>
								<select
									className='h-8 appearance-none rounded-[9px] border border-[#2a2c33] bg-[#131418] py-0 pl-2.5 pr-8 font-mono text-[13px] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500'
									id={selectId}
									value={version}
									onChange={(event) => {
										setPicked(event.target.value);
										setCopied(false);
									}}
								>
									{versions.map((candidate) => (
										<option key={candidate.version} value={candidate.version}>
											{candidate.version}
										</option>
									))}
								</select>

								<ChevronDown
									aria-hidden
									className='pointer-events-none absolute right-2.5 top-2.5 size-3.5 text-zinc-400'
								/>
							</span>
						</label>

						{fingerprint && (
							<span
								className={cn(
									'rounded-full border bg-[#0e0f12] px-2.5 py-[3px] text-xs',
									fingerprint.className
								)}
							>
								{fingerprint.label}
							</span>
						)}

						{source?.sha256 && (
							<code
								className='font-mono text-[11.5px] text-zinc-500'
								title={`SHA-256 of ${source.mainName}: ${source.sha256}`}
							>
								{`sha256 ${source.sha256.slice(0, 12)}…${source.sha256.slice(-4)}`}
							</code>
						)}
					</div>

					<div className='flex items-center justify-between gap-3 border-b border-[#1d1f24]'>
						<div aria-label='Files' className='flex gap-1' role='tablist'>
							{(
								[
									['code', source?.mainName ?? 'plugin.js'],
									['manifest', 'manifest.json'],
								] as const
							).map(([id, name]) => (
								<button
									aria-selected={file === id}
									key={id}
									role='tab'
									type='button'
									onClick={() => {
										setFile(id);
										// "Copied" was about the other file.
										setCopied(false);
									}}
									className={cn(
										'h-9 px-3 font-mono text-[13px] transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500',
										file === id
											? 'text-white shadow-[inset_0_-2px_0_#fafafa]'
											: 'text-zinc-400 [@media(hover:hover)]:hover:text-white'
									)}
								>
									{name}
								</button>
							))}
						</div>

						<button
							className='mb-1 inline-flex h-7 items-center gap-1.5 rounded-lg border border-[#2a2c33] bg-[#131418] px-2.5 text-xs text-white transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50 [@media(hover:hover)]:hover:bg-[#1a1b20]'
							disabled={!source}
							onClick={() => void copy()}
							type='button'
						>
							{copied ? (
								<Check aria-hidden className='size-3.5 text-emerald-400' />
							) : (
								<Copy aria-hidden className='size-3.5' />
							)}

							{copied ? 'Copied' : 'Copy'}
						</button>
					</div>

					<div
						aria-label={fileName || 'Plugin file'}
						className='min-h-64 flex-1 overflow-hidden rounded-xl border border-[#1d1f24] bg-[#0b0b0d]'
						role='tabpanel'
					>
						{isLoading && (
							<div
								aria-label='Loading the code'
								className='h-full animate-pulse bg-[#0b0b0d]'
								role='status'
							/>
						)}

						{error && !isLoading && (
							<div
								className='flex h-full flex-col items-start justify-center gap-3 p-5 text-sm text-red-300'
								role='alert'
							>
								{error instanceof Error
									? error.message
									: 'Couldn’t load the code'}

								<button
									className='h-8 rounded-[9px] border border-[#2a2c33] bg-[#131418] px-3 text-[13px] text-white [@media(hover:hover)]:hover:bg-[#1a1b20]'
									onClick={() => void mutate()}
									type='button'
								>
									Try again
								</button>
							</div>
						)}

						{source && !error && (
							<CodeEditor
								readOnly
								className='h-full'
								label={`${fileName}, read-only`}
								language={file === 'code' ? 'javascript' : 'json'}
								value={text}
							/>
						)}
					</div>
				</div>
			)}
		</SideSheet>
	);
}
