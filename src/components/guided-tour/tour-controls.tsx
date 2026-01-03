'use client';

/**
 * Tour Controls Component
 *
 * Navigation bar, progress indicators, and info panel for guided tour.
 * Appears as an overlay on the canvas during tour mode.
 */

import { Button } from '@/components/ui/button';
import type { TourStop } from '@/types/guided-tour';
import { cn } from '@/utils/cn';
import {
	ChevronLeft,
	ChevronRight,
	X,
	Maximize,
	Minimize,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { memo, useState, useEffect } from 'react';

interface TourControlsProps {
	currentStop: TourStop;
	isFullscreen: boolean;
	showInfoBar: boolean;
	onNext: () => void;
	onPrevious: () => void;
	onExit: () => void;
	onGoToStop: (index: number) => void;
	onToggleFullscreen: () => void;
}

export const TourControls = memo(function TourControls({
	currentStop,
	isFullscreen,
	showInfoBar,
	onNext,
	onPrevious,
	onExit,
	onGoToStop,
	onToggleFullscreen,
}: TourControlsProps) {
	const [isVisible, setIsVisible] = useState(true);
	const { index, total, title, content, nodeType } = currentStop;

	// Auto-hide controls after inactivity
	useEffect(() => {
		let timeout: NodeJS.Timeout;

		const showControls = () => {
			setIsVisible(true);
			clearTimeout(timeout);
			timeout = setTimeout(() => setIsVisible(false), 3000);
		};

		// Show on mount and on mouse move
		showControls();
		window.addEventListener('mousemove', showControls);

		return () => {
			clearTimeout(timeout);
			window.removeEventListener('mousemove', showControls);
		};
	}, []);

	// Calculate visible dots (max 10)
	const maxDots = 10;
	let dotStart = 0;
	let dotEnd = total;
	if (total > maxDots) {
		const half = Math.floor(maxDots / 2);
		dotStart = Math.max(0, index - half);
		dotEnd = Math.min(total, dotStart + maxDots);
		if (dotEnd - dotStart < maxDots) {
			dotStart = Math.max(0, dotEnd - maxDots);
		}
	}

	const dots = Array.from({ length: dotEnd - dotStart }, (_, i) => dotStart + i);

	return (
		<AnimatePresence>
			{isVisible && (
				<>
					{/* Top bar - progress and exit */}
					<motion.div
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
						className={cn(
							'absolute top-0 left-0 right-0 z-50',
							'flex items-center justify-between',
							'px-4 py-3',
							'bg-gradient-to-b from-black/40 to-transparent'
						)}
					>
						{/* Progress indicator */}
						<div className="flex items-center gap-3">
							<span className="text-white/80 text-sm font-medium tabular-nums">
								{index + 1} / {total}
							</span>

							{/* Progress bar */}
							<div className="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
								<motion.div
									className="h-full bg-white/80 rounded-full"
									initial={{ width: 0 }}
									animate={{ width: `${((index + 1) / total) * 100}%` }}
									transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
								/>
							</div>
						</div>

						{/* Right controls */}
						<div className="flex items-center gap-2">
							<Button
								size="icon"
								variant="ghost"
								className="text-white/80 hover:text-white hover:bg-white/10"
								onClick={onToggleFullscreen}
								title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
							>
								{isFullscreen ? (
									<Minimize className="size-4" />
								) : (
									<Maximize className="size-4" />
								)}
							</Button>

							<Button
								size="icon"
								variant="ghost"
								className="text-white/80 hover:text-white hover:bg-white/10"
								onClick={onExit}
								title="Exit tour (Esc)"
							>
								<X className="size-4" />
							</Button>
						</div>
					</motion.div>

					{/* Bottom bar - navigation and info */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 20 }}
						transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
						className={cn(
							'absolute bottom-0 left-0 right-0 z-50',
							'bg-gradient-to-t from-black/50 to-transparent',
							'px-4 py-4'
						)}
					>
						{/* Info bar */}
						{showInfoBar && (
							<div className="mb-4 px-2">
								<motion.div
									key={currentStop.nodeId}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									className="max-w-2xl mx-auto"
								>
									<div className="flex items-center gap-2 mb-1">
										<span className="text-white/60 text-xs uppercase tracking-wide">
											{nodeType.replace('Node', '')}
										</span>
									</div>
									<h3 className="text-white text-lg font-semibold">{title}</h3>
									{content && content !== title && (
										<p className="text-white/70 text-sm line-clamp-2 mt-1">
											{content}
										</p>
									)}
								</motion.div>
							</div>
						)}

						{/* Navigation */}
						<div className="flex items-center justify-center gap-4">
							{/* Previous button */}
							<Button
								size="icon"
								variant="ghost"
								className="text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30"
								onClick={onPrevious}
								disabled={index === 0}
								title="Previous (←)"
							>
								<ChevronLeft className="size-5" />
							</Button>

							{/* Dot indicators */}
							<div className="flex items-center gap-1.5">
								{dotStart > 0 && (
									<span className="text-white/40 text-xs">...</span>
								)}
								{dots.map((dotIndex) => (
									<button
										key={dotIndex}
										onClick={() => onGoToStop(dotIndex)}
										className={cn(
											'size-2 rounded-full transition-all duration-200',
											dotIndex === index
												? 'bg-white scale-125'
												: 'bg-white/40 hover:bg-white/60'
										)}
										title={`Go to stop ${dotIndex + 1}`}
									/>
								))}
								{dotEnd < total && (
									<span className="text-white/40 text-xs">...</span>
								)}
							</div>

							{/* Next button */}
							<Button
								size="icon"
								variant="ghost"
								className="text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30"
								onClick={onNext}
								disabled={index === total - 1}
								title="Next (→)"
							>
								<ChevronRight className="size-5" />
							</Button>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
});
