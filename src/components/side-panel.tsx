import { cn } from '@/utils/cn';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React from 'react';

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
	return (
		<AnimatePresence mode='popLayout'>
			{isOpen && (
				<motion.div
					animate={{ x: 0, opacity: 1 }}
					exit={{ x: '100%', opacity: 0 }}
					initial={{ x: '100%', opacity: 0 }}
					key={`side-panel-${title.toLowerCase().trim()}`}
					className={cn(
						'fixed top-0 right-0 bottom-0 z-40 h-full w-full max-w-xl min-w-sm bg-zinc-950 shadow-xl',
						className
					)}
					transition={{
						duration: 0.3,
						ease: [0.4, 0, 0.2, 1] as const,
					}}
				>
					{/* Panel Content */}
					<div className='flex h-full flex-col border-l border-zinc-800'>
						{/* Panel Header */}
						<div className='flex flex-shrink-0 items-center justify-between border-b border-zinc-700 py-2.5 px-4'>
							<h2 className='text-md font-semibold text-zinc-100'>{title}</h2>

							<button
								aria-label='Close panel'
								className='rounded-sm p-1 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:outline-none'
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
