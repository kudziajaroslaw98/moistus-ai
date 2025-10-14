import { cn } from '@/utils/cn';
import { X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import React from 'react';
import { GlassmorphismTheme, getElevationColor } from '@/components/nodes/themes/glassmorphism-theme';

interface SidePanelProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
	className?: string;
	clearData?: () => void;
}

export function SidePanel({
	isOpen,
	onClose,
	title,
	children,
	className,
}: SidePanelProps) {
	const shouldReduceMotion = useReducedMotion();
	const theme = GlassmorphismTheme;

	// Spring animation config (follows Motion guideline: "Default to spring animations")
	const springConfig = {
		type: 'spring' as const,
		stiffness: 300,
		damping: 30,
	};

	// Reduced motion: instant transitions
	const transition = shouldReduceMotion
		? { duration: 0 }
		: springConfig;

	return (
		<AnimatePresence mode='popLayout'>
			{isOpen && (
				<motion.div
					animate={{
						x: 0,
						opacity: 1,
					}}
					exit={{
						x: shouldReduceMotion ? 0 : '100%',
						opacity: 0,
					}}
					initial={{
						x: shouldReduceMotion ? 0 : '100%',
						opacity: 0,
					}}
					key={`side-panel-${title.toLowerCase().trim()}`}
					style={{
						backgroundColor: getElevationColor(8),
						borderLeft: `1px solid ${theme.borders.default}`,
						willChange: 'transform, opacity',
					}}
					className={cn(
						'fixed top-0 right-0 bottom-0 z-40 h-full w-full max-w-xl min-w-sm shadow-xl',
						className
					)}
					transition={transition}
				>
					{/* Panel Content */}
					<div className='flex h-full flex-col'>
						{/* Panel Header */}
						<div
							className='flex flex-shrink-0 items-center justify-between py-2.5 px-4'
							style={{
								borderBottom: `1px solid ${theme.borders.default}`,
							}}
						>
							<h2
								className='text-md font-semibold'
								style={{ color: theme.text.high }}
							>
								{title}
							</h2>

							<button
								aria-label='Close panel'
								className='rounded-sm p-1 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:outline-none transition-colors duration-200 ease-out'
								style={{
									color: theme.text.medium,
									backgroundColor: 'transparent',
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor = theme.borders.hover;
									e.currentTarget.style.color = theme.text.high;
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor = 'transparent';
									e.currentTarget.style.color = theme.text.medium;
								}}
								onClick={onClose}
							>
								<X className='h-5 w-5' />
							</button>
						</div>

						{/* Panel Body - Scrollable */}
						<div className='flex-grow max-h-screen p-4 md:p-6'>{children}</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
