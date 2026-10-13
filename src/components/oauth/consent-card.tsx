'use client';

import { AuthCard } from '@/components/auth/shared/auth-card';
import { Button } from '@/components/ui/button';
import { decideAuthorization } from '@/app/oauth/consent/actions';
import { Check, Plug, ShieldCheck, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';

interface ConsentCardProps {
	authorizationId: string;
	clientName: string;
	redirectHost: string;
	userName: string;
}

type ConsentState =
	| { step: 'ask' }
	| { step: 'done' | 'denied'; redirectUrl: string }
	| { step: 'error'; message: string };

const CONNECTIONS_HREF = '/dashboard?settings=connections';
const easeOutQuart = [0.165, 0.84, 0.44, 1] as const;

const CAN = [
	'Read maps you own or that are shared with you',
	"Add, edit, move and delete nodes and links on maps where you're the owner or an editor",
	'Create new maps and rename maps you own',
];
const CANNOT = 'Delete maps, change who a map is shared with, or see your billing';

/** Client names are self-registered and untrusted: show a letter, never their logo URL. */
export function clientMonogram(name: string): string {
	return name.match(/[\p{L}\p{N}]/u)?.[0]?.toUpperCase() ?? '?';
}

export function ConsentCard({
	authorizationId,
	clientName,
	redirectHost,
	userName,
}: ConsentCardProps) {
	const [state, setState] = useState<ConsentState>({ step: 'ask' });
	const [pending, startTransition] = useTransition();
	const shouldReduceMotion = useReducedMotion();

	// Hand the browser back to the app; the done/denied card stays up meanwhile.
	useEffect(() => {
		if (state.step === 'done' || state.step === 'denied') {
			window.location.assign(state.redirectUrl);
		}
	}, [state]);

	const decide = (decision: 'approve' | 'deny') => {
		startTransition(async () => {
			const result = await decideAuthorization(authorizationId, decision);
			setState(
				result.ok
					? { step: decision === 'approve' ? 'done' : 'denied', redirectUrl: result.redirectUrl }
					: { step: 'error', message: result.message }
			);
		});
	};

	const fade = {
		initial: shouldReduceMotion ? { opacity: 1 } : { opacity: 0 },
		animate: { opacity: 1 },
		exit: { opacity: 0 },
		transition: { duration: shouldReduceMotion ? 0 : 0.2, ease: easeOutQuart },
	};

	return (
		<AuthCard className='p-6 sm:p-8'>
			<AnimatePresence initial={false} mode='wait'>
				{state.step === 'ask' && (
					<motion.div key='ask' {...fade}>
						<div aria-hidden className='flex items-center justify-center gap-3.5'>
							<span className='flex h-14 w-14 items-center justify-center rounded-[14px] border border-border-default bg-white/[0.04] text-[22px] font-semibold text-text-primary'>
								{clientMonogram(clientName)}
							</span>

							<span className='flex items-center gap-1.5 text-text-tertiary'>
								<span className='w-7 border-t-[1.5px] border-dashed border-white/15' />

								<Plug className='h-4 w-4' />

								<span className='w-7 border-t-[1.5px] border-dashed border-white/15' />
							</span>

							<span className='flex h-14 w-14 items-center justify-center rounded-[14px] bg-white/[0.06]'>
								<Image alt='' height={36} src='/images/shiko.svg' width={36} />
							</span>
						</div>

						<h1 className='mt-7 text-center text-2xl font-semibold leading-tight text-text-primary'>
							{clientName} wants to connect to Shiko
						</h1>

						<p className='mt-2.5 text-center text-sm text-text-secondary'>
							It will work with your maps as you, {userName}.
						</p>

						<section
							aria-label='What this app can do'
							className='mt-7 rounded-xl border border-white/10 bg-black/30 p-5'
						>
							<h2 className='text-[13px] font-semibold text-text-primary'>It will be able to</h2>

							<ul className='mt-3 flex flex-col gap-2.5'>
								{CAN.map((item) => (
									<li className='flex gap-2.5 text-sm leading-5 text-white/87' key={item}>
										<Check aria-hidden className='mt-0.5 h-4 w-4 shrink-0 text-primary-400' />

										{item}
									</li>
								))}
							</ul>

							<div className='my-4 h-px bg-white/[0.06]' />

							<h2 className='text-[13px] font-semibold text-text-primary'>It won&apos;t be able to</h2>

							<p className='mt-3 flex gap-2.5 text-sm leading-5 text-text-secondary'>
								<X aria-hidden className='mt-0.5 h-4 w-4 shrink-0 text-text-tertiary' />

								{CANNOT}
							</p>

							<div className='my-4 h-px bg-white/[0.06]' />

							<p className='flex gap-2.5 text-[13px] leading-[19px] text-text-secondary'>
								<ShieldCheck aria-hidden className='mt-0.5 h-4 w-4 shrink-0' />
								Map text the app reads goes to the AI service it uses. Every change it makes shows
								up in the map&apos;s History, where you can undo it.
							</p>
						</section>

						<p className='mt-3.5 text-xs leading-[18px] text-text-tertiary'>
							<span>{`${clientName} will send you back to `}</span>

							<code className='font-mono text-[11.5px] text-text-secondary'>{redirectHost}</code>

							<span>. Only allow apps you started yourself.</span>
						</p>

						<div className='mt-6 flex gap-2.5'>
							<Button
								className='flex-1'
								disabled={pending}
								onClick={() => decide('deny')}
								size='md'
								variant='outline'
							>
								Deny
							</Button>

							<Button
								className='flex-1 font-semibold'
								disabled={pending}
								onClick={() => decide('approve')}
								size='md'
							>
								{pending ? 'Working…' : 'Allow access'}
							</Button>
						</div>

						<p className='mt-4 text-center text-xs text-text-tertiary'>
							Disconnect anytime in{' '}

							<Link className='text-primary-400 hover:text-primary-300' href={CONNECTIONS_HREF}>
								Settings › Connections
							</Link>
							.
						</p>
					</motion.div>
				)}

				{state.step !== 'ask' && (
					<motion.div className='flex flex-col items-center text-center' key={state.step} {...fade}>
						<span
							aria-hidden
							className={
								state.step === 'done'
									? 'flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400'
									: 'flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06] text-text-secondary'
							}
						>
							{state.step === 'done' ? <Check className='h-6 w-6' /> : <X className='h-6 w-6' />}
						</span>

						<h1 className='mt-5 text-2xl font-semibold text-text-primary' role='status'>
							{state.step === 'done'
								? `${clientName} is connected`
								: state.step === 'denied'
									? 'Access denied'
									: 'Something went wrong'}
						</h1>

						<p className='mt-2.5 text-sm text-text-secondary'>
							{state.step === 'done' &&
								`Taking you back to ${clientName}. If nothing happens, go back to it yourself; you can close this tab.`}

							{state.step === 'denied' &&
								`${clientName} didn't get access to your maps. You can close this tab.`}

							{state.step === 'error' && state.message}
						</p>

						{state.step === 'done' && (
							<Link
								className='mt-6 text-sm text-primary-400 hover:text-primary-300'
								href={CONNECTIONS_HREF}
							>
								Manage connections
							</Link>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</AuthCard>
	);
}
