'use client';

/**
 * Slide Controls Component
 *
 * Navigation controls for presentation mode:
 * - Previous/Next buttons
 * - Progress bar
 * - Slide counter
 * - Toolbar controls
 */

import { cn } from '@/utils/cn';
import { motion } from 'motion/react';
import { memo, useState, useEffect } from 'react';
import {
	ChevronLeft,
	ChevronRight,
	Maximize2,
	Minimize2,
	X,
	MousePointer2,
	StickyNote,
} from 'lucide-react';

interface SlideControlsProps {
	currentIndex: number;
	totalSlides: number;
	isFullscreen: boolean;
	laserPointerEnabled: boolean;
	showSpeakerNotes: boolean;
	onPrevious: () => void;
	onNext: () => void;
	onToggleFullscreen: () => void;
	onToggleLaserPointer: () => void;
	onToggleSpeakerNotes: () => void;
	onExit: () => void;
	onGoToSlide: (index: number) => void;
}

export const SlideControls = memo(function SlideControls({
	currentIndex,
	totalSlides,
	isFullscreen,
	laserPointerEnabled,
	showSpeakerNotes,
	onPrevious,
	onNext,
	onToggleFullscreen,
	onToggleLaserPointer,
	onToggleSpeakerNotes,
	onExit,
	onGoToSlide,
}: SlideControlsProps) {
	const [showControls, setShowControls] = useState(true);
	const [mouseTimeout, setMouseTimeout] = useState<NodeJS.Timeout | null>(null);

	// Auto-hide controls after inactivity
	useEffect(() => {
		const handleMouseMove = () => {
			setShowControls(true);

			if (mouseTimeout) {
				clearTimeout(mouseTimeout);
			}

			const timeout = setTimeout(() => {
				setShowControls(false);
			}, 3000);

			setMouseTimeout(timeout);
		};

		window.addEventListener('mousemove', handleMouseMove);

		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
			if (mouseTimeout) {
				clearTimeout(mouseTimeout);
			}
		};
	}, [mouseTimeout]);

	const progress = ((currentIndex + 1) / totalSlides) * 100;

	return (
		<>
			{/* Progress bar (always visible) */}
			<div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
				<motion.div
					className="h-full bg-white/50"
					initial={{ width: 0 }}
					animate={{ width: `${progress}%` }}
					transition={{ duration: 0.3, ease: 'easeOut' }}
				/>
			</div>

			{/* Bottom controls */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 20 }}
				transition={{ duration: 0.2 }}
				className={cn(
					'absolute bottom-0 left-0 right-0',
					'flex items-center justify-between',
					'px-6 py-4',
					'bg-gradient-to-t from-black/50 to-transparent',
					'pointer-events-auto'
				)}
			>
				{/* Left: Navigation */}
				<div className="flex items-center gap-2">
					<button
						onClick={onPrevious}
						disabled={currentIndex === 0}
						className={cn(
							'p-2 rounded-lg transition-all duration-200',
							'bg-white/10 hover:bg-white/20 backdrop-blur-sm',
							'disabled:opacity-30 disabled:cursor-not-allowed'
						)}
						aria-label="Previous slide"
					>
						<ChevronLeft className="w-5 h-5 text-white" />
					</button>

					<button
						onClick={onNext}
						disabled={currentIndex === totalSlides - 1}
						className={cn(
							'p-2 rounded-lg transition-all duration-200',
							'bg-white/10 hover:bg-white/20 backdrop-blur-sm',
							'disabled:opacity-30 disabled:cursor-not-allowed'
						)}
						aria-label="Next slide"
					>
						<ChevronRight className="w-5 h-5 text-white" />
					</button>
				</div>

				{/* Center: Slide counter & picker */}
				<div className="flex items-center gap-4">
					{/* Slide dots */}
					<div className="flex items-center gap-1">
						{Array.from({ length: Math.min(totalSlides, 10) }).map((_, idx) => (
							<button
								key={idx}
								onClick={() => onGoToSlide(idx)}
								className={cn(
									'w-2 h-2 rounded-full transition-all duration-200',
									idx === currentIndex
										? 'bg-white scale-125'
										: 'bg-white/30 hover:bg-white/50'
								)}
								aria-label={`Go to slide ${idx + 1}`}
							/>
						))}
						{totalSlides > 10 && (
							<span className="text-white/50 text-xs ml-1">...</span>
						)}
					</div>

					{/* Slide counter */}
					<span className="text-white/70 text-sm font-medium">
						{currentIndex + 1} / {totalSlides}
					</span>
				</div>

				{/* Right: Tools */}
				<div className="flex items-center gap-2">
					{/* Laser pointer toggle */}
					<button
						onClick={onToggleLaserPointer}
						className={cn(
							'p-2 rounded-lg transition-all duration-200',
							'backdrop-blur-sm',
							laserPointerEnabled
								? 'bg-red-500/30 text-red-300'
								: 'bg-white/10 text-white hover:bg-white/20'
						)}
						aria-label="Toggle laser pointer"
					>
						<MousePointer2 className="w-5 h-5" />
					</button>

					{/* Speaker notes toggle */}
					<button
						onClick={onToggleSpeakerNotes}
						className={cn(
							'p-2 rounded-lg transition-all duration-200',
							'backdrop-blur-sm',
							showSpeakerNotes
								? 'bg-amber-500/30 text-amber-300'
								: 'bg-white/10 text-white hover:bg-white/20'
						)}
						aria-label="Toggle speaker notes"
					>
						<StickyNote className="w-5 h-5" />
					</button>

					{/* Fullscreen toggle */}
					<button
						onClick={onToggleFullscreen}
						className={cn(
							'p-2 rounded-lg transition-all duration-200',
							'bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white'
						)}
						aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
					>
						{isFullscreen ? (
							<Minimize2 className="w-5 h-5" />
						) : (
							<Maximize2 className="w-5 h-5" />
						)}
					</button>

					{/* Exit button */}
					<button
						onClick={onExit}
						className={cn(
							'p-2 rounded-lg transition-all duration-200',
							'bg-white/10 hover:bg-red-500/30 backdrop-blur-sm text-white'
						)}
						aria-label="Exit presentation"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
			</motion.div>

			{/* Keyboard hints (shown on hover) */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: showControls ? 1 : 0 }}
				className={cn(
					'absolute bottom-20 left-1/2 -translate-x-1/2',
					'flex items-center gap-4 px-4 py-2 rounded-lg',
					'bg-black/30 backdrop-blur-sm',
					'text-white/50 text-xs'
				)}
			>
				<span>← → Navigate</span>
				<span>F Fullscreen</span>
				<span>Esc Exit</span>
			</motion.div>
		</>
	);
});
