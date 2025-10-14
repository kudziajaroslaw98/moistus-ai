'use client';

import { CreateMapForm } from '@/components/ui/create-map-form';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { motion } from 'motion/react';
import { useEffect } from 'react';

interface CreateMapDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (title: string) => Promise<void> | void;
	disabled?: boolean;
}

export function CreateMapDialog({
	open,
	onOpenChange,
	onSubmit,
	disabled = false,
}: CreateMapDialogProps) {
	// Handle Escape key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && open) {
				onOpenChange(false);
			}
		};

		if (open) {
			document.addEventListener('keydown', handleKeyDown);
			return () => document.removeEventListener('keydown', handleKeyDown);
		}
	}, [open, onOpenChange]);

	const handleSubmit = async (title: string) => {
		await onSubmit(title);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className='bg-zinc-950 border border-zinc-800 w-2xl backdrop-blur-sm rounded-md shadow-2xl h-auto overflow-hidden'
				showCloseButton={true}
			>
				<DialogHeader className='relative z-10'>
					<DialogTitle className='flex items-center gap-3 text-xl font-bold text-white'>
						Create New Mind Map
					</DialogTitle>

					<p className='text-zinc-500 text-sm '>
						Give your mind map a descriptive title to get started
					</p>
				</DialogHeader>

				{/* Form Section */}
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className='relative z-10 mt-6'
					initial={{ opacity: 0, y: 10 }}
					transition={{ delay: 0.1, duration: 0.3 }}
				>
					<CreateMapForm
						buttonText='Create Map'
						className='w-full'
						disabled={disabled}
						loadingText='Creating...'
						placeholder='Enter mind map title...'
						onSubmit={handleSubmit}
					/>
				</motion.div>

				{/* Subtle Tip */}
				<motion.div
					animate={{ opacity: 1 }}
					className='relative z-10 mt-4 text-center'
					initial={{ opacity: 0 }}
					transition={{ delay: 0.3, duration: 0.3 }}
				>
					<p className='text-xs text-zinc-500'>
						Press{' '}

						<kbd className='px-1.5 py-0.5 mx-1 bg-zinc-800/50 rounded border border-zinc-700/50 text-xs'>
							Enter
						</kbd>{' '}

						to create or{' '}

						<kbd className='px-1.5 py-0.5 mx-1 bg-zinc-800/50 rounded border border-zinc-700/50 text-xs'>
							Esc
						</kbd>{' '}
						to cancel
					</p>
				</motion.div>
			</DialogContent>
		</Dialog>
	);
}
