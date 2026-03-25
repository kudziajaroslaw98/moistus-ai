'use client';

import { X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { ONBOARDING_CANVAS_SAFE_OFFSET } from './onboarding-layout';

export function CanvasPlacementHint({
	isMobile,
	onDismiss,
}: {
	isMobile: boolean;
	onDismiss: () => void;
}) {
	const shouldReduceMotion = useReducedMotion() ?? false;
	const motionProps = shouldReduceMotion
		? {
				animate: { opacity: 1 },
				exit: { opacity: 0 },
				initial: { opacity: 0 },
			}
		: {
				animate: { opacity: 1, y: 0 },
				exit: { opacity: 0, y: 12 },
				initial: { opacity: 0, y: 12 },
			};
	const desktopStyle = {
		top: 112,
		left: 24,
		right: 392,
		maxWidth: 420,
	};

	return (
		<motion.div
			{...motionProps}
			className='fixed z-[58] rounded-3xl border border-primary-500/25 bg-base/95 p-4 shadow-xl shadow-black/35 backdrop-blur-md'
			data-testid='onboarding-canvas-hint'
			style={
				isMobile
					? { left: 16, right: 16, bottom: ONBOARDING_CANVAS_SAFE_OFFSET }
					: desktopStyle
			}
		>
			<div className='flex items-start justify-between gap-3'>
				<div>
					<p className='text-sm font-semibold text-text-primary'>
						{isMobile ? 'Tap empty canvas' : 'Now click empty canvas'}
					</p>
					<p className='mt-1 text-xs leading-5 text-text-secondary'>
						Shiko will place your new node where you {isMobile ? 'tap' : 'click'}
						. You can also grow from a selected node with its{' '}
						<span className='font-medium'>+</span> button, or use{' '}
						<span className='font-medium'>Ctrl/Cmd + Arrow</span> if you have a
						keyboard attached.
					</p>
				</div>

				<button
					className='rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-white/6 hover:text-text-primary'
					onClick={onDismiss}
					type='button'
				>
					<X className='size-4' />
					<span className='sr-only'>Hide hint</span>
				</button>
			</div>
		</motion.div>
	);
}
