'use client';

import { PluginUiTree } from '@/components/plugins/plugin-ui-tree';
import { Switch } from '@/components/ui/switch';
import type {
	PluginManifest,
	PluginNodeKind,
} from '@/lib/plugins/manifest-schema';
import { PLUGIN_ICONS } from '@/lib/plugins/plugin-icons';
import type { PluginUiNode } from '@/lib/plugins/ui-tree';
import { cn } from '@/utils/cn';
import { CircleCheck, CircleX, Globe, RefreshCw } from 'lucide-react';
import { useId } from 'react';
import {
	PANEL_CLASS,
	PANEL_HEADER_CLASS,
	PANEL_TITLE_CLASS,
} from './playground-styles';
import type { PlaygroundLastResult } from './use-playground';

interface PreviewPaneProps {
	manifest: PluginManifest | null;
	kind: PluginNodeKind | null;
	/** Why the draft can't be drawn at all (invalid manifest, code that doesn't load). */
	problem: string | null;
	/** Waiting for the first load. */
	starting: boolean;
	view: { tree: PluginUiNode } | null;
	/** `render` threw, or returned something Shiko refuses. */
	renderError: string | null;
	/** The sample data doesn't fit the kind's fields yet. */
	needsSampleData: boolean;
	last: PlaygroundLastResult | null;
	wide: boolean;
	onWideChange: (wide: boolean) => void;
	canEdit: boolean;
	onCanEditChange: (canEdit: boolean) => void;
	onKindChange: (kind: string) => void;
	onAction: (action: string, payload: unknown) => void;
	/** A button that opens the node editor was clicked; the preview has none. */
	onEdit: () => void;
	/** Set for kinds with a `refresh` action. */
	refresh: { hosts: string[]; busy: boolean; onRefresh: () => void } | null;
}

const SEGMENT_CLASS =
	'h-7 w-16 rounded-[7px] text-xs transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500';

/**
 * The draft's node as a map would draw it: header, the plugin's own view, buttons that
 * run its actions. Same look as a node on the canvas, on the canvas's dotted ground.
 */
export function PreviewPane({
	manifest,
	kind,
	problem,
	starting,
	view,
	renderError,
	needsSampleData,
	last,
	wide,
	onWideChange,
	canEdit,
	onCanEditChange,
	onKindChange,
	onAction,
	onEdit,
	refresh,
}: PreviewPaneProps) {
	const id = useId();
	const Icon = kind
		? PLUGIN_ICONS[kind.icon ?? manifest?.icon ?? 'puzzle']
		: null;
	const failure = problem ?? renderError;

	return (
		<section aria-label='Preview' className={PANEL_CLASS}>
			<div className={PANEL_HEADER_CLASS}>
				<h2 className={PANEL_TITLE_CLASS}>Preview</h2>

				<div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
					{manifest && manifest.nodeKinds.length > 1 && (
						<select
							aria-label='Node kind'
							className='h-7 rounded-[7px] border border-[#1d1f24] bg-[#0b0b0d] px-2 text-xs text-zinc-200'
							onChange={(event) => onKindChange(event.target.value)}
							value={kind?.kind}
						>
							{manifest.nodeKinds.map((candidate) => (
								<option key={candidate.kind} value={candidate.kind}>
									{candidate.label}
								</option>
							))}
						</select>
					)}

					{!refresh && (
						<div className='flex items-center gap-2 text-xs text-zinc-400'>
							<label htmlFor={`${id}-can-edit`}>Can edit</label>

							<Switch
								checked={canEdit}
								id={`${id}-can-edit`}
								onCheckedChange={onCanEditChange}
								role='switch'
							/>
						</div>
					)}

					<div
						aria-label='Node width'
						className='grid grid-cols-2 gap-0.5 rounded-[9px] border border-[#1d1f24] bg-[#0b0b0d] p-0.5'
						role='group'
					>
						{(
							[
								['Normal', false],
								['Wide', true],
							] as const
						).map(([label, isWide]) => (
							<button
								aria-pressed={wide === isWide}
								key={label}
								onClick={() => onWideChange(isWide)}
								type='button'
								className={cn(
									SEGMENT_CLASS,
									wide === isWide ? 'bg-[#1c1d22] text-white' : 'text-zinc-500'
								)}
							>
								{label}
							</button>
						))}
					</div>
				</div>
			</div>

			<div className='flex min-h-[300px] items-start justify-center bg-[#050505] bg-[radial-gradient(rgba(255,255,255,0.13)_1px,transparent_1px)] [background-size:16px_16px] px-6 py-8'>
				<div
					style={{ width: wide ? '100%' : 320 }}
					className={cn(
						'flex max-w-full flex-col gap-3 rounded-[10px] border bg-elevation-1 p-4',
						failure ? 'border-red-500/45' : 'border-white/[0.06]'
					)}
				>
					<div className='flex items-center justify-between'>
						<span className='flex items-center gap-1.5 text-xs font-medium text-white/60'>
							{Icon && <Icon aria-hidden className='size-3.5' />}

							{kind?.label ?? manifest?.name ?? 'Your plugin'}
						</span>

						<span className='rounded bg-blue-500/20 px-1.5 text-[10px] font-semibold leading-4 tracking-[0.08em] text-blue-200'>
							DEV
						</span>
					</div>

					{failure ? (
						<div className='flex flex-col gap-1.5' role='alert'>
							<span className='text-sm font-medium text-red-300'>
								Can’t draw this node
							</span>

							<span className='break-words font-mono text-xs leading-[18px] text-white/60'>
								{failure}
							</span>
						</div>
					) : view ? (
						<PluginUiTree
							disabled={!canEdit && !refresh}
							onAction={onAction}
							onEdit={onEdit}
							tree={view.tree}
						/>
					) : (
						<span className='text-sm text-white/50'>
							{needsSampleData
								? 'Fill in the sample data to see the node.'
								: starting
									? 'Starting the plugin sandbox…'
									: 'Drawing…'}
						</span>
					)}

					{refresh && !failure && (
						<div className='mt-0.5 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5 text-[11px] text-white/50'>
							<span className='flex min-w-0 items-center gap-1.5'>
								<Globe aria-hidden className='size-3 shrink-0' />

								<span className='truncate'>{refresh.hosts.join(', ')}</span>
							</span>

							<button
								className='inline-flex h-6 items-center gap-1 rounded-md border border-[#424242] px-2 text-[11px] font-medium text-[#fafafa] transition-colors duration-200 ease disabled:opacity-50 [@media(hover:hover)]:hover:bg-white/5'
								disabled={refresh.busy}
								onClick={refresh.onRefresh}
								type='button'
							>
								<RefreshCw
									aria-hidden
									className={cn('size-3', refresh.busy && 'animate-spin')}
								/>
								Refresh
							</button>
						</div>
					)}
				</div>
			</div>

			<div
				className='flex items-start gap-2.5 border-t border-[#1d1f24] px-4 py-3'
				role='status'
			>
				{last?.ok === false ? (
					<CircleX
						aria-hidden
						className='mt-0.5 size-3.5 shrink-0 text-red-300'
					/>
				) : (
					<CircleCheck
						aria-hidden
						className={cn(
							'mt-0.5 size-3.5 shrink-0',
							last ? 'text-emerald-300' : 'text-zinc-500'
						)}
					/>
				)}

				<span className='flex min-w-0 flex-col gap-0.5'>
					<span className='text-xs text-zinc-500'>Last action</span>

					<code
						className={cn(
							'break-words font-mono text-xs leading-[18px]',
							last
								? last.ok
									? 'text-emerald-300'
									: 'text-red-300'
								: 'text-zinc-400'
						)}
					>
						{last?.text ?? 'Press a button on the node to run its action.'}
					</code>
				</span>
			</div>
		</section>
	);
}
