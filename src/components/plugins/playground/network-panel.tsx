'use client';

import { Switch } from '@/components/ui/switch';
import { Globe } from 'lucide-react';
import { useId } from 'react';
import {
	FIELD_LABEL_CLASS,
	PANEL_CLASS,
	PANEL_HEADER_CLASS,
	PANEL_TITLE_CLASS,
	TEXTAREA_CLASS,
} from './playground-styles';

interface NetworkPanelProps {
	/** The sites the manifest declares. */
	hosts: string[];
	/** The JSON `refresh` gets back while real requests are off. */
	mock: string;
	onMockChange: (text: string) => void;
	real: boolean;
	onRealChange: (real: boolean) => void;
}

/**
 * For a plugin with a network power: what Refresh answers with. By default it's JSON the
 * author types, so nothing leaves the browser; the switch sends the real request (GET, no
 * cookies, only when Refresh is pressed) through the same worker a developer plugin uses.
 */
export function NetworkPanel({
	hosts,
	mock,
	onMockChange,
	real,
	onRealChange,
}: NetworkPanelProps) {
	const id = useId();
	const sites = hosts.join(', ');

	return (
		<section aria-label='Network' className={PANEL_CLASS}>
			<div className={PANEL_HEADER_CLASS}>
				<h2 className={PANEL_TITLE_CLASS}>Network</h2>

				<span className='flex items-center gap-1.5 text-xs text-sky-300'>
					<Globe aria-hidden className='size-3.5' />

					{sites}
				</span>
			</div>

			<div className='flex flex-col gap-3.5 p-4'>
				<div className='flex flex-col gap-1.5'>
					<label className={FIELD_LABEL_CLASS} htmlFor={`${id}-mock`}>
						Answer used by Refresh
					</label>

					<textarea
						className={TEXTAREA_CLASS}
						disabled={real}
						id={`${id}-mock`}
						onChange={(event) => onMockChange(event.target.value)}
						rows={5}
						spellCheck={false}
						value={mock}
					/>

					<span className='text-xs text-zinc-500'>
						{real
							? 'Not used while real requests are on.'
							: 'Nothing leaves your browser while this is used.'}
					</span>
				</div>

				<div className='flex items-start gap-3 rounded-[10px] border border-[#1d1f24] bg-[#0b0b0d] p-3'>
					<div className='flex min-w-0 flex-1 flex-col gap-0.5'>
						<label
							className='text-[13px] font-medium text-zinc-200'
							htmlFor={`${id}-real`}
						>
							Send real requests
						</label>

						<span className='text-xs leading-[17px] text-zinc-400'>
							{real
								? `Refresh now asks ${sites} from your browser: GET only, no cookies, only when you press it.`
								: `Off. When on, Refresh asks ${sites} from your browser: GET only, no cookies.`}
						</span>
					</div>

					<label className='mt-0.5 shrink-0' htmlFor={`${id}-real`}>
						<Switch
							checked={real}
							id={`${id}-real`}
							onCheckedChange={onRealChange}
							role='switch'
						/>
					</label>
				</div>
			</div>
		</section>
	);
}
