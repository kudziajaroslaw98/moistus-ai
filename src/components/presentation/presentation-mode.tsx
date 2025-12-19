'use client';

/**
 * Presentation Mode Component
 *
 * Fullscreen presentation view for mind maps.
 * Converts the mind map hierarchy into a slideshow.
 */

import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { SlideRenderer } from './slide-renderer';
import { SlideControls } from './slide-controls';
import { usePresentationKeyboard } from './use-presentation-keyboard';
import type { PresentationSlice } from '@/store/slices/presentation-slice';

interface PresentationModeProps {
	isPresenting: boolean;
	slides: PresentationSlice['slides'];
	currentSlideIndex: number;
	isFullscreen: boolean;
	showSpeakerNotes: boolean;
	transitionDuration: number;
	laserPointerEnabled: boolean;
	onNext: () => void;
	onPrevious: () => void;
	onGoToSlide: (index: number) => void;
	onToggleFullscreen: () => void;
	onToggleSpeakerNotes: () => void;
	onToggleLaserPointer: () => void;
	onExit: () => void;
}

export const PresentationMode = memo(function PresentationMode({
	isPresenting,
	slides,
	currentSlideIndex,
	isFullscreen,
	showSpeakerNotes,
	transitionDuration,
	laserPointerEnabled,
	onNext,
	onPrevious,
	onGoToSlide,
	onToggleFullscreen,
	onToggleSpeakerNotes,
	onToggleLaserPointer,
	onExit,
}: PresentationModeProps) {
	const [direction, setDirection] = useState(0);
	const [laserPosition, setLaserPosition] = useState<{ x: number; y: number } | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const prevIndexRef = useRef(currentSlideIndex);

	// Track slide direction for animations
	useEffect(() => {
		if (currentSlideIndex > prevIndexRef.current) {
			setDirection(1);
		} else if (currentSlideIndex < prevIndexRef.current) {
			setDirection(-1);
		}
		prevIndexRef.current = currentSlideIndex;
	}, [currentSlideIndex]);

	// Keyboard navigation
	usePresentationKeyboard({
		isActive: isPresenting,
		onNext,
		onPrevious,
		onToggleFullscreen,
		onExit,
		onToggleLaserPointer,
		onToggleSpeakerNotes,
	});

	// Laser pointer tracking
	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (laserPointerEnabled && containerRef.current) {
				const rect = containerRef.current.getBoundingClientRect();
				setLaserPosition({
					x: e.clientX - rect.left,
					y: e.clientY - rect.top,
				});
			}
		},
		[laserPointerEnabled]
	);

	const handleMouseLeave = useCallback(() => {
		setLaserPosition(null);
	}, []);

	// Don't render if not presenting
	if (!isPresenting) return null;

	const currentSlide = slides[currentSlideIndex];
	if (!currentSlide) return null;

	// Render in a portal to escape any parent stacking contexts
	return createPortal(
		<AnimatePresence>
			<motion.div
				ref={containerRef}
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ duration: 0.3 }}
				className={cn(
					'fixed inset-0 z-[9999]',
					'bg-zinc-900',
					'overflow-hidden',
					laserPointerEnabled && 'cursor-none'
				)}
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
				role="dialog"
				aria-modal="true"
				aria-label="Presentation mode"
			>
				{/* Slide content */}
				<div className="absolute inset-0">
					<AnimatePresence mode="wait" custom={direction}>
						<SlideRenderer
							key={currentSlide.id}
							slide={currentSlide}
							direction={direction}
							transitionDuration={transitionDuration}
						/>
					</AnimatePresence>
				</div>

				{/* Laser pointer */}
				{laserPointerEnabled && laserPosition && (
					<motion.div
						className="absolute pointer-events-none"
						style={{
							left: laserPosition.x,
							top: laserPosition.y,
						}}
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ type: 'spring', stiffness: 500, damping: 30 }}
					>
						<div className="relative">
							{/* Outer glow */}
							<div className="absolute -inset-3 bg-red-500/20 rounded-full blur-md" />
							{/* Core dot */}
							<div className="w-4 h-4 bg-red-500 rounded-full shadow-lg shadow-red-500/50" />
						</div>
					</motion.div>
				)}

				{/* Controls */}
				<SlideControls
					currentIndex={currentSlideIndex}
					totalSlides={slides.length}
					isFullscreen={isFullscreen}
					laserPointerEnabled={laserPointerEnabled}
					showSpeakerNotes={showSpeakerNotes}
					onPrevious={onPrevious}
					onNext={onNext}
					onToggleFullscreen={onToggleFullscreen}
					onToggleLaserPointer={onToggleLaserPointer}
					onToggleSpeakerNotes={onToggleSpeakerNotes}
					onExit={onExit}
					onGoToSlide={onGoToSlide}
				/>

				{/* Speaker notes panel */}
				<AnimatePresence>
					{showSpeakerNotes && currentSlide.content && (
						<motion.div
							initial={{ opacity: 0, y: 100 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 100 }}
							transition={{ duration: 0.2, ease: 'easeOut' }}
							className={cn(
								'absolute left-6 right-6 bottom-28',
								'max-h-32 overflow-y-auto',
								'p-4 rounded-lg',
								'bg-black/60 backdrop-blur-md',
								'border border-white/10'
							)}
						>
							<p className="text-white/80 text-sm leading-relaxed">
								{currentSlide.content}
							</p>
						</motion.div>
					)}
				</AnimatePresence>
			</motion.div>
		</AnimatePresence>,
		document.body
	);
});

export default PresentationMode;
