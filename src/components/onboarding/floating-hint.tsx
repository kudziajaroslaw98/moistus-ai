'use client';

import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo } from 'react';
import { ONBOARDING_CANVAS_SAFE_OFFSET } from './onboarding-layout';

export interface FloatingTargetRect {
	top: number;
	left: number;
	width: number;
	height: number;
}

export function FloatingHint({
	dataTestId,
	description,
	isMobile,
	mobileDescription,
	mobileTitle,
	onDismiss,
	targetRect,
	title,
}: {
	dataTestId?: string;
	description: string;
	isMobile: boolean;
	mobileDescription?: string;
	mobileTitle?: string;
	onDismiss: () => void;
	targetRect: FloatingTargetRect | null;
	title: string;
}) {
	const floatingStyle = useMemo(() => {
		if (isMobile || !targetRect || typeof window === 'undefined') {
			return null;
		}

		const cardWidth = Math.min(320, window.innerWidth - 32);
		const gap = 20;
		const prefersRight =
			targetRect.left + targetRect.width + gap + cardWidth <
			window.innerWidth - 16;
		const left = prefersRight
			? targetRect.left + targetRect.width + gap
			: Math.max(16, targetRect.left - cardWidth - gap);
		const top = Math.max(
			96,
			Math.min(
				targetRect.top + targetRect.height / 2 - 90,
				window.innerHeight - 220
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

	if (!isMobile && floatingStyle) {
		return (
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className='fixed z-[58] rounded-2xl border border-primary-500/25 bg-base/95 p-4 shadow-xl shadow-black/35 backdrop-blur-md'
				data-testid={dataTestId}
				exit={{ opacity: 0, y: 8 }}
				initial={{ opacity: 0, y: 8 }}
				style={floatingStyle}
			>
				<div className='flex items-start justify-between gap-3'>
					<div>
						<p className='text-sm font-semibold text-text-primary'>{title}</p>
						<p className='mt-1 text-xs leading-5 text-text-secondary'>
							{description}
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

	return (
		<motion.div
			animate={{ opacity: 1, y: 0 }}
			className='fixed inset-x-4 z-[58] rounded-[1.5rem] border border-primary-500/25 bg-base/95 p-4 shadow-xl shadow-black/35 backdrop-blur-md'
			data-testid={dataTestId}
			exit={{ opacity: 0, y: 12 }}
			initial={{ opacity: 0, y: 12 }}
			style={{ bottom: ONBOARDING_CANVAS_SAFE_OFFSET }}
		>
			<div className='flex items-start justify-between gap-3'>
				<div>
					<p className='text-sm font-semibold text-text-primary'>
						{mobileTitle ?? title}
					</p>
					<p className='mt-1 text-xs leading-5 text-text-secondary'>
						{mobileDescription ?? description}
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
