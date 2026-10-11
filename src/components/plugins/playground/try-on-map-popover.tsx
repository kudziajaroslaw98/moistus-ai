'use client';

import type { PluginMapSummary } from '@/app/api/plugins/maps/route';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { draftManifestUrl } from '@/lib/plugins/drafts-client';
import useAppStore from '@/store/mind-map-store';
import { rememberDevPluginUrl } from '@/store/slices/plugins-slice';
import { Loader2, Map as MapIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import { QUIET_BUTTON_CLASS } from './playground-styles';

const MAPS_KEY = '/api/plugins/maps';

async function fetchMaps(url: string): Promise<PluginMapSummary[]> {
	const response = await fetch(url);
	const body = (await response.json().catch(() => null)) as {
		data?: { maps: PluginMapSummary[] };
		error?: string;
	} | null;
	if (!response.ok || !body?.data) {
		throw new Error(body?.error ?? 'Could not load your maps');
	}
	return body.data.maps;
}

/**
 * "Try on a map": pick one of your maps and it opens with this draft loaded as a
 * developer plugin (a DEV node kind you add with `$`). The draft is saved first, since the
 * map reads it from the server.
 */
export function TryOnMapPopover({
	draftId,
	saveFirst,
}: {
	draftId: string;
	/** Saves the draft; resolves to whether it is saved. */
	saveFirst: () => Promise<boolean>;
}) {
	const router = useRouter();
	const userId = useAppStore((state) => state.userProfile?.user_id);
	const [open, setOpen] = useState(false);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [problem, setProblem] = useState<string | null>(null);
	const {
		data: maps,
		error,
		isLoading,
	} = useSWR(open ? MAPS_KEY : null, fetchMaps, {
		revalidateOnFocus: false,
	});

	const tryOn = async (map: PluginMapSummary) => {
		if (!userId) return;
		setBusyId(map.id);
		setProblem(null);
		if (!(await saveFirst())) {
			setProblem('Couldn’t save the draft first. Try again.');
			setBusyId(null);
			return;
		}
		rememberDevPluginUrl(userId, map.id, draftManifestUrl(draftId));
		router.push(`/mind-map/${map.id}`);
	};

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger
				render={<button className={QUIET_BUTTON_CLASS} type='button' />}
			>
				<MapIcon aria-hidden className='size-3.5' />
				Try on a map
			</PopoverTrigger>

			<PopoverContent
				align='end'
				aria-label='Maps you can try this draft on'
				className='w-[340px] max-w-[calc(100vw-2rem)] gap-0 p-0'
				side='bottom'
			>
				<div className='border-b border-[#1d1f24] px-4 pb-3 pt-3.5'>
					<p className='text-sm font-semibold text-white'>Try this draft on</p>

					<p className='mt-0.5 text-xs leading-[17px] text-zinc-500'>
						Opens the map with your draft loaded. Add a node by typing its $
						trigger. Only you see it, with a DEV badge.
					</p>
				</div>

				{isLoading && (
					<p
						className='flex items-center gap-2 px-4 py-4 text-sm text-zinc-400'
						role='status'
					>
						<Loader2 aria-hidden className='size-4 animate-spin' />
						Loading your maps…
					</p>
				)}

				{error && (
					<p className='px-4 py-4 text-sm text-red-300' role='alert'>
						Couldn’t load your maps.
					</p>
				)}

				{maps && maps.length === 0 && (
					<p className='px-4 py-4 text-sm text-zinc-400'>
						You don’t have a map yet. Create one from Home, then come back.
					</p>
				)}

				{maps && maps.length > 0 && (
					<ul className='max-h-72 overflow-y-auto p-1.5'>
						{maps.map((map) => (
							<li key={map.id}>
								<button
									className='flex h-10 w-full items-center gap-3 rounded-lg px-2.5 text-left text-sm text-white transition-colors duration-200 ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-wait disabled:opacity-60 [@media(hover:hover)]:hover:bg-white/[0.04]'
									disabled={busyId !== null}
									onClick={() => void tryOn(map)}
									type='button'
								>
									<span className='min-w-0 flex-1 truncate'>
										{map.title || 'Untitled map'}
									</span>

									{busyId === map.id && (
										<Loader2
											aria-hidden
											className='size-3.5 animate-spin text-zinc-400'
										/>
									)}
								</button>
							</li>
						))}
					</ul>
				)}

				{problem && (
					<p
						className='border-t border-[#1d1f24] px-4 py-3 text-xs text-red-300'
						role='alert'
					>
						{problem}
					</p>
				)}
			</PopoverContent>
		</Popover>
	);
}
