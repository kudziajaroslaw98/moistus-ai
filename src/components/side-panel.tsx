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
					key={`side-panel-${title.toLowerCase().trim()}`}
					initial={{ x: '100%', opacity: 0 }}
					animate={{ x: 0, opacity: 1 }}
					exit={{ x: '100%', opacity: 0 }}
					transition={{
						duration: 0.3,
						ease: [0.4, 0, 0.2, 1],
					}}
					className={cn(
						'fixed top-0 right-0 bottom-0 z-40 h-full w-full max-w-fit min-w-sm transform bg-zinc-950 shadow-xl',
						className
					)}
				>
					{/* Panel Content */}
					<div className='flex h-full flex-col overflow-hidden border-l border-zinc-800'>
						{/* Panel Header */}
						<div className='flex flex-shrink-0 items-center justify-between border-b border-zinc-700 p-4'>
							<h2 className='text-lg font-semibold text-zinc-100'>{title}</h2>

							<button
								onClick={onClose}
								className='rounded-sm p-1 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:outline-none'
								aria-label='Close panel'
							>
								<X className='h-5 w-5' />
							</button>
						</div>

						{/* Panel Body - Scrollable */}
						<div className='flex-grow overflow-y-auto max-h-screen p-4 md:p-6'>
							{children}
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
