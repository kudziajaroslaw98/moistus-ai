'use client';

import { pluginPowers } from '@/lib/plugins/powers';
import useAppStore from '@/store/mind-map-store';
import type { ActivePluginKind } from '@/types/plugins';
import { cn } from '@/utils/cn';
import { Info, Loader2, RefreshCw, TriangleAlert } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { PluginSitesSentence } from './plugin-site-note';
import { formatTimeAgo } from './plugin-update-details';
import { hasSeenRefreshNote, markRefreshNoteSeen } from './refresh-note';

interface PluginRefreshBarProps {
	nodeId: string;
	pluginId: string;
	/** Running plugin, when it's loaded (needed to refresh and to name its sites). */
	active: ActivePluginKind | null;
	/** `metadata.extension.fetchedAt`. */
	fetchedAt?: string;
	canEdit: boolean;
}

const buttonClass = cn(
	'nodrag nopan inline-flex h-7 items-center gap-1.5 rounded-md border border-zinc-700 px-2.5 text-xs font-medium text-zinc-50',
	'transition-colors duration-200 ease [@media(hover:hover)]:hover:bg-white/5',
	'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60',
	'disabled:cursor-default disabled:opacity-50'
);

/**
 * Footer of a network plugin node: when it last fetched, and Refresh for editors. The
 * first time someone refreshes a plugin, a note says what goes where before anything is
 * sent. Viewers only see "Updated …": their browser never contacts the plugin's sites.
 */
export function PluginRefreshBar({
	nodeId,
	pluginId,
	active,
	fetchedAt,
	canEdit,
}: PluginRefreshBarProps) {
	const { refresh, refreshPluginNode, userId } = useAppStore(
		useShallow((state) => ({
			refresh: state.pluginRefreshes[nodeId],
			refreshPluginNode: state.refreshPluginNode,
			userId: state.currentUser?.id ?? null,
		}))
	);
	const [noteOpen, setNoteOpen] = useState(false);
	const reduceMotion = useReducedMotion();
	const running = refresh?.status === 'running';
	const powers = active ? pluginPowers(active.manifest) : null;
	const sites = powers?.kind === 'network' ? powers.sites : [];
	const canRefresh = canEdit && Boolean(active?.canRefresh) && sites.length > 0;

	const start = () => {
		markRefreshNoteSeen(userId, pluginId);
		setNoteOpen(false);
		void refreshPluginNode(nodeId);
	};
	const onRefresh = () => {
		if (hasSeenRefreshNote(userId, pluginId)) start();
		else setNoteOpen(true);
	};

	const status = running
		? 'Refreshing…'
		: fetchedAt
			? `Updated ${formatTimeAgo(fetchedAt)}`
			: 'Not refreshed yet';

	return (
		<div className='flex flex-col gap-2' data-testid='plugin-refresh-bar'>
			<AnimatePresence initial={false}>
				{noteOpen && canRefresh && (
					<motion.div
						key='refresh-note'
						animate={{ opacity: 1, y: 0 }}
						className='flex flex-col gap-2.5 rounded-lg border border-sky-300/25 bg-sky-300/[0.06] p-2.5'
						exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
						initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
						role='dialog'
						aria-label='Before you refresh'
						transition={{ type: 'spring', duration: 0.25, bounce: 0 }}
					>
						<p className='flex items-start gap-2 text-xs leading-[17px] text-zinc-200'>
							<Info
								aria-hidden
								className='mt-0.5 size-3.5 shrink-0 text-sky-300'
							/>

							<span>
								<PluginSitesSentence
									lead='Refresh sends'
									scope='in this node'
									sites={sites}
								/>

								{active?.source === 'catalog'
									? ' The plugin’s author doesn’t receive it.'
									: ''}

								{' Everyone else sees the result.'}
							</span>
						</p>

						<div className='flex justify-end gap-2'>
							<button
								className={buttonClass}
								type='button'
								onClick={(event) => {
									event.stopPropagation();
									setNoteOpen(false);
								}}
							>
								Cancel
							</button>

							<button
								type='button'
								className={cn(
									buttonClass,
									'border-primary-500 bg-primary-600 [@media(hover:hover)]:hover:bg-primary-500'
								)}
								onClick={(event) => {
									event.stopPropagation();
									start();
								}}
							>
								Refresh
							</button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<div className='flex min-h-7 items-center justify-between gap-2'>
				<span
					aria-live='polite'
					className='flex min-w-0 items-center gap-1.5 text-xs text-white/50'
					role='status'
				>
					{running && (
						<Loader2
							aria-hidden
							className='size-3 shrink-0 animate-spin text-primary-400'
						/>
					)}

					<span className='truncate'>{status}</span>
				</span>

				{canRefresh && (
					<button
						className={buttonClass}
						disabled={running || noteOpen}
						type='button'
						onClick={(event) => {
							event.stopPropagation();
							onRefresh();
						}}
					>
						<RefreshCw
							aria-hidden
							className={cn('size-3.5', running && 'animate-spin')}
						/>
						Refresh
					</button>
				)}
			</div>

			{refresh?.status === 'error' && !running && (
				<p
					className='flex items-start gap-1.5 text-xs leading-4 text-amber-400/90'
					role='alert'
				>
					<TriangleAlert aria-hidden className='mt-px size-3.5 shrink-0' />

					{`Couldn’t refresh: ${refresh.message}`}
				</p>
			)}
		</div>
	);
}
