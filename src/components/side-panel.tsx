import { GlassmorphismTheme } from '@/components/nodes/themes/glassmorphism-theme';
import { cn } from '@/utils/cn';
import { X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import React from 'react';

interface SidePanelProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
	footer?: React.ReactNode;
	className?: string;
	clearData?: () => void;
}

export function SidePanel({
	isOpen,
	onClose,
	title,
	footer,
	children,
	className,
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
					className='fixed top-0 left-0 z-[39] w-full h-full bg-black/50'
					animate={{
						opacity: 1,
					}}
					exit={{
						opacity: 0,
					}}
					initial={{
						opacity: 0,
					}}
					transition={transition}
				>
					<motion.div
						transition={transition}
						animate={{
							x: 0,
							opacity: 1,
						}}
						className={cn(
							'fixed top-0 right-0 bottom-0 z-40 h-full w-full max-w-xl min-w-sm shadow-xl bg-base border-l border-border-subtle',
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
							<div className='flex flex-shrink-0 items-center justify-between py-2.5 px-4 border-b border-border-subtle'>
								<h2 className='text-md font-semibold text-text-primary'>
									{title}
								</h2>

								<button
									aria-label='Close panel'
									className='rounded-sm p-1 cursor-pointer text-text-secondary hover:text-text-primary bg-transparent hover:bg-surface focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:outline-none transition-colors duration-300 ease-out'
									onClick={onClose}
								>
									<X className='h-5 w-5' />
								</button>
							</div>

							{/* Panel Body - Scrollable */}
							<div className='flex-grow max-h-screen flex flex-col overflow-y-auto'>
								{children}
							</div>

							{footer && (
								<div className='flex h-fit border-t border-zinc-800 p-4'>
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
