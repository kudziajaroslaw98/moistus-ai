'use client';

import {
	DeveloperModeSetting,
	useDeveloperMode,
} from '@/components/plugins/developer-mode-switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Code2, Eye, Globe, Map } from 'lucide-react';
import type { ReactNode } from 'react';

const FACTS = [
	{
		icon: Eye,
		text: 'Only you see your drafts and the plugins you load while building.',
	},
	{
		icon: Map,
		text: 'A draft can run on maps you own, and shows a DEV badge there.',
	},
	{
		icon: Globe,
		text: 'A draft that declares a website can ask it only when you press Refresh. Nothing is sent otherwise.',
	},
] as const;

/**
 * Writing plugins needs Developer mode. While it's off this says what the switch does and
 * puts the switch right here, so turning it on opens the page without a trip to settings.
 */
export function DeveloperModeGate({
	children,
	intro = 'Your drafts are saved. Turn the switch on to open them.',
}: {
	children: ReactNode;
	/** The sentence under the title, about what the person was about to open. */
	intro?: string;
}) {
	const { enabled, available } = useDeveloperMode();

	if (!available) {
		return (
			<div className='mx-auto mt-14 max-w-[560px]'>
				<Skeleton className='h-[420px] rounded-2xl' />
			</div>
		);
	}
	if (enabled) return <>{children}</>;

	return (
		<section
			aria-labelledby='developer-mode-gate-title'
			className='mx-auto mt-14 flex max-w-[560px] flex-col gap-5 rounded-2xl border border-[#1d1f24] bg-[#0e0f12] p-7'
		>
			<div className='flex items-center gap-3.5'>
				<span className='flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#1d1f24] bg-[#0b0c0f] text-amber-300'>
					<Code2 aria-hidden className='size-5' />
				</span>

				<div>
					<h1
						className='text-xl font-semibold leading-[1.3] text-white'
						id='developer-mode-gate-title'
					>
						Writing plugins needs Developer mode
					</h1>

					<p className='mt-1 text-sm leading-5 text-zinc-400'>{intro}</p>
				</div>
			</div>

			<ul className='flex flex-col gap-2.5'>
				{FACTS.map(({ icon: Icon, text }) => (
					<li
						className='flex items-start gap-2.5 text-sm leading-5 text-zinc-300'
						key={text}
					>
						<Icon
							aria-hidden
							className='mt-0.5 size-4 shrink-0 text-zinc-400'
						/>

						{text}
					</li>
				))}
			</ul>

			<div className='rounded-xl border border-[#1d1f24] bg-[#0b0b0d] px-4 py-3.5'>
				<DeveloperModeSetting id='playground-developer-mode' />
			</div>

			<p className='text-xs text-zinc-500'>
				Also in Map Settings › Editor Preferences and Settings › Editor. You can
				turn it off any time.
			</p>
		</section>
	);
}
