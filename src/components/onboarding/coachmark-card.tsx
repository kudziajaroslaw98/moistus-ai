'use client';

import type { OnboardingCoachmark } from '@/constants/onboarding';
import { MoveRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo } from 'react';
import { Button } from '../ui/button';
import type { FloatingTargetRect } from './floating-hint';
import { ONBOARDING_CANVAS_SAFE_OFFSET } from './onboarding-layout';

export function CoachmarkCard({
	currentStep,
	isLastStep,
	isMobile,
	onMinimize,
	onNext,
	targetRect,
}: {
	currentStep: OnboardingCoachmark;
	isLastStep: boolean;
	isMobile: boolean;
	onMinimize: () => void;
	onNext: () => void;
	targetRect: FloatingTargetRect | null;
}) {
	const floatingStyle = useMemo(() => {
		if (isMobile || !targetRect || typeof window === 'undefined') {
			return null;
		}

		const cardWidth = Math.min(360, window.innerWidth - 32);
		const cardHeight = 220;
		const gap = 28;
		const left = Math.max(
			16,
			Math.min(
				targetRect.left + targetRect.width / 2 - cardWidth / 2,
				window.innerWidth - cardWidth - 16
			)
		);
		const prefersAbove =
			targetRect.top + targetRect.height / 2 > window.innerHeight * 0.52;
		const top = prefersAbove
			? Math.max(96, targetRect.top - cardHeight - gap)
			: Math.max(
					96,
					Math.min(
						targetRect.top + targetRect.height + gap,
						window.innerHeight - 250
					)
				);

		return {
			left,
			top,
			width: cardWidth,
		};
	}, [isMobile, targetRect]);

	if (!isMobile && !floatingStyle) {
		return null;
	}

	const content = (
		<div className='rounded-3xl border border-white/10 bg-base/96 p-5 shadow-2xl shadow-black/35 backdrop-blur-md'>
			<p className='text-xs font-medium uppercase tracking-[0.2em] text-text-tertiary'>
				Controls Tour
			</p>
			<h3 className='mt-2 text-lg font-semibold text-text-primary'>
				{currentStep.title}
			</h3>
			<p className='mt-2 text-sm leading-6 text-text-secondary'>
				{currentStep.description}
			</p>

			<div className='mt-4 flex items-center justify-between gap-3'>
				<Button onClick={onMinimize} size='sm' variant='secondary'>
					Pause
				</Button>
				<Button className='gap-2' onClick={onNext} size='sm' variant='default'>
					{isLastStep ? 'Finish tour' : 'Next'}
					<MoveRight className='size-4' />
				</Button>
			</div>
		</div>
	);

	if (!isMobile && floatingStyle) {
		return (
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className='fixed z-[37]'
				data-testid='onboarding-coachmark'
				exit={{ opacity: 0, y: 8 }}
				initial={{ opacity: 0, y: 8 }}
				style={floatingStyle}
			>
				{content}
			</motion.div>
		);
	}

	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			className='fixed inset-x-4 z-[37]'
			data-testid='onboarding-coachmark'
			exit={{ opacity: 0, y: 12 }}
			initial={{ opacity: 0, y: 12 }}
			style={{ bottom: ONBOARDING_CANVAS_SAFE_OFFSET }}
		>
			{content}
		</motion.div>
	);
}
