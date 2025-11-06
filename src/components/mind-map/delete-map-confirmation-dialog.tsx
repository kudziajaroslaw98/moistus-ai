'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface DeleteMapConfirmationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => Promise<void> | void;
	mapTitle: string;
	nodeCount: number;
	edgeCount: number;
	isDeleting?: boolean;
}

export function DeleteMapConfirmationDialog({
	open,
	onOpenChange,
	onConfirm,
	mapTitle,
	nodeCount,
	edgeCount,
	isDeleting = false,
}: DeleteMapConfirmationDialogProps) {
	const [confirmText, setConfirmText] = useState('');
	const isConfirmValid = confirmText === mapTitle;

	// Reset confirmation text when dialog opens/closes
	useEffect(() => {
		if (!open) {
			setConfirmText('');
		}
	}, [open]);

	// Handle Escape key
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && open && !isDeleting) {
				onOpenChange(false);
			}
		};

		if (open) {
			document.addEventListener('keydown', handleKeyDown);
			return () => document.removeEventListener('keydown', handleKeyDown);
		}
	}, [open, onOpenChange, isDeleting]);

	const handleConfirm = async () => {
		if (!isConfirmValid || isDeleting) return;
		await onConfirm();
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter' && isConfirmValid && !isDeleting) {
			handleConfirm();
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className='border border-rose-900/50 bg-zinc-950 shadow-2xl backdrop-blur-sm sm:max-w-[500px] p-4'
				showCloseButton={!isDeleting}
			>
				<DialogHeader>
					<motion.div
						animate={{ scale: 1, opacity: 1 }}
						className='mb-2 flex items-center justify-center'
						initial={{ scale: 0.8, opacity: 0 }}
						transition={{ duration: 0.2, ease: 'easeOut' }}
					>
						<div className='rounded-full bg-rose-500/10 p-3'>
							<AlertTriangle className='h-6 w-6 text-rose-500' />
						</div>
					</motion.div>

					<DialogTitle className='text-center text-xl font-bold text-white'>
						Delete Mind Map
					</DialogTitle>

					<DialogDescription className='text-center text-zinc-400'>
						This action cannot be undone. This will permanently delete your mind
						map and all of its content.
					</DialogDescription>
				</DialogHeader>

				{/* Impact Display */}
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className='my-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4'
					initial={{ opacity: 0, y: 10 }}
					transition={{ delay: 0.1, duration: 0.3 }}
				>
					<p className='mb-3 text-sm font-medium text-zinc-300'>
						The following will be deleted:
					</p>
					<ul className='space-y-2 text-sm text-zinc-400'>
						<li className='flex items-center justify-between'>
							<span>Mind map:</span>
							<span className='font-medium text-zinc-200'>"{mapTitle}"</span>
						</li>
						<li className='flex items-center justify-between'>
							<span>Nodes:</span>
							<span className='font-medium text-rose-400'>{nodeCount}</span>
						</li>
						<li className='flex items-center justify-between'>
							<span>Connections:</span>
							<span className='font-medium text-rose-400'>{edgeCount}</span>
						</li>
					</ul>
				</motion.div>

				{/* Confirmation Input */}
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className='space-y-2 flex flex-col gap-1'
					initial={{ opacity: 0, y: 10 }}
					transition={{ delay: 0.2, duration: 0.3 }}
				>
					<label
						className='text-sm font-medium text-zinc-300'
						htmlFor='confirm-input'
					>
						Type <span className='font-bold text-white'>"{mapTitle}"</span> to
						confirm
					</label>
					<Input
						id='confirm-input'
						value={confirmText}
						onChange={(e) => setConfirmText(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder='Type the map name...'
						disabled={isDeleting}
						className='font-mono'
						autoComplete='off'
						autoFocus
					/>
					{confirmText && !isConfirmValid && (
						<p className='text-xs text-rose-400'>
							Map name doesn't match. Please type exactly: "{mapTitle}"
						</p>
					)}
				</motion.div>

				<DialogFooter className='mt-6 gap-2'>
					<Button
						variant='ghost'
						onClick={() => onOpenChange(false)}
						disabled={isDeleting}
						className='transition-all duration-200 hover:bg-zinc-800'
					>
						Cancel
					</Button>
					<Button
						variant='destructive'
						onClick={handleConfirm}
						disabled={!isConfirmValid || isDeleting}
						className='min-w-[120px] bg-rose-600 transition-all duration-200 hover:bg-rose-700 disabled:bg-zinc-800 disabled:text-zinc-500'
					>
						{isDeleting ? (
							<>
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
								Deleting...
							</>
						) : (
							'Delete Forever'
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
