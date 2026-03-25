'use client';

import { MoveRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../ui/button';
import {
	ONBOARDING_CANVAS_SAFE_OFFSET,
	ONBOARDING_DESKTOP_TOP_OFFSET,
} from './onboarding-layout';

export function UpsellCard({
	isMobile,
	onKeepUsingFree,
	onSeePlans,
}: {
	isMobile: boolean;
	onKeepUsingFree: () => void;
	onSeePlans: () => void;
}) {
	return (
		<motion.div
			animate={{ opacity: 1, x: 0, y: 0 }}
			className={
				isMobile
					? 'fixed inset-x-4 z-[60] rounded-[1.75rem] border border-white/10 bg-base/96 p-5 shadow-2xl shadow-black/35 backdrop-blur-md'
					: 'fixed right-4 z-[60] w-[min(380px,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-base/96 p-5 shadow-2xl shadow-black/35 backdrop-blur-md'
			}
			data-testid='onboarding-upsell'
			exit={{ opacity: 0, y: 12 }}
			initial={{ opacity: 0, y: 12 }}
			style={
				isMobile
					? { bottom: ONBOARDING_CANVAS_SAFE_OFFSET }
					: { top: ONBOARDING_DESKTOP_TOP_OFFSET }
			}
		>
			<div className='inline-flex items-center gap-2 rounded-full border border-primary-500/25 bg-primary-500/10 px-3 py-1 text-xs font-medium text-primary-300'>
				<Sparkles className='size-3.5' />
				Optional next step
			</div>
			<h3 className='mt-3 text-xl font-semibold text-text-primary'>
				You know enough to keep going.
			</h3>
			<p className='mt-2 text-sm leading-6 text-text-secondary'>
				If you want more AI depth, larger maps, and stronger collaboration
				limits later, the Pro plan is there. If not, keep building.
			</p>

			<div className='mt-5 flex flex-col gap-3 sm:flex-row'>
				<Button onClick={onKeepUsingFree} size='md' variant='secondary'>
					Keep using Free
				</Button>
				<Button className='gap-2' onClick={onSeePlans} size='md' variant='default'>
					See Pro plans
					<MoveRight className='size-4' />
				</Button>
			</div>
		</motion.div>
	);
}
