import { GlassmorphismTheme } from '@/components/nodes/themes/glassmorphism-theme';
import { cn } from '@/utils/cn';
import { X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import React from 'react';

interface SidePanelProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	/** Secondary line under the title (e.g. the map name). */
	subtitle?: React.ReactNode;
	/** Controls rendered before the close button. */
	headerActions?: React.ReactNode;
	children: React.ReactNode;
	footer?: React.ReactNode;
	className?: string;
	/** Overrides the default padded body layout. */
	bodyClassName?: string;
	/**
	 * When false, the canvas stays visible and interactive behind the panel (no dimmed
	 * backdrop). Use for panels whose actions show results on the canvas.
	 */
	modal?: boolean;
	clearData?: () => void;
	'data-testid'?: string;
}

export function SidePanel({
	isOpen,
	onClose,
	title,
	subtitle,
	headerActions,
	footer,
	children,
	className,
	bodyClassName,
	modal = true,
	'data-testid': testId,
}: SidePanelProps) {
	const shouldReduceMotion = useReducedMotion();
	const theme = GlassmorphismTheme;

	// Spring animation config (follows Motion guideline: "Default to spring animations")
	const springConfig = {
		ease: 'easeOut' as const,
		duration: 0.2,
	};

	// Reduced motion: instant transitions
	const transition = shouldReduceMotion ? { duration: 0 } : springConfig;

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					key={`side-panel-backdrop-${title.toLowerCase().trim()}`}
					transition={transition}
					className={cn(
						'fixed top-0 left-0 z-[39] w-full h-full',
						modal ? 'bg-black/50' : 'pointer-events-none'
					)}
					animate={{
						opacity: 1,
					}}
					exit={{
						opacity: 0,
					}}
					initial={{
						opacity: 0,
					}}
				>
					<motion.div
						data-testid={testId}
						transition={transition}
						animate={{
							x: 0,
							opacity: 1,
						}}
						className={cn(
							'pointer-events-auto fixed top-0 right-0 bottom-0 z-40 h-full w-full sm:max-w-sm md:max-w-md sm:min-w-sm shadow-xl bg-base border-l border-border-subtle',
							className
						)}
						exit={{
							x: shouldReduceMotion ? 0 : '100%',
							opacity: 0,
						}}
						initial={{
							x: shouldReduceMotion ? 0 : '100%',
							opacity: 0,
						}}
					>
						{/* Panel Content */}
						<div className='flex h-full flex-col'>
							{/* Panel Header */}
							<div className='flex shrink-0 items-center justify-between gap-3 py-2.5 px-4 border-b border-border-subtle'>
								<div className='min-w-0'>
									<h2 className='text-md font-semibold text-text-primary'>
										{title}
									</h2>

									{subtitle && (
										<p className='truncate text-xs text-text-secondary'>
											{subtitle}
										</p>
									)}
								</div>

								<div className='flex shrink-0 items-center gap-2'>
									{headerActions}

									<button
										aria-label='Close panel'
										className='rounded-sm p-1 cursor-pointer text-text-secondary hover:text-text-primary bg-transparent hover:bg-surface focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:outline-none transition-colors duration-300 ease-out'
										onClick={onClose}
									>
										<X className='h-5 w-5' />
									</button>
								</div>
							</div>

							{/* Panel Body - Scrollable */}
							<div
								className={cn(
									'flex-1 min-h-0 flex flex-col p-4',
									bodyClassName
								)}
							>
								{children}
							</div>

							{footer && (
								<div className='flex h-fit shrink-0 border-t border-zinc-800 bg-base p-4 pb-[max(1rem,env(safe-area-inset-bottom))]'>
									{footer}
								</div>
							)}
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
