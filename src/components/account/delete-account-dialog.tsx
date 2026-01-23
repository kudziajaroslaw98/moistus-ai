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

export interface DeleteAccountImpactStats {
	mindMapsCount: number;
	hasActiveSubscription: boolean;
}

interface DeleteAccountDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => Promise<void>;
	userEmail: string;
	isDeleting?: boolean;
	impactStats: DeleteAccountImpactStats | null;
}

export function DeleteAccountDialog({
	open,
	onOpenChange,
	onConfirm,
	userEmail,
	isDeleting = false,
	impactStats,
}: DeleteAccountDialogProps) {
	const [confirmText, setConfirmText] = useState('');
	const isConfirmValid =
		confirmText.toLowerCase() === userEmail.toLowerCase();

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
		<Dialog onOpenChange={onOpenChange} open={open}>
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
						Delete Your Account
					</DialogTitle>

					<DialogDescription className='text-center text-zinc-400'>
						This action cannot be undone. This will permanently delete your
						account and remove all your data from our servers.
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
						The following will be permanently deleted:
					</p>

					<ul className='space-y-2 text-sm text-zinc-400'>
						<li className='flex items-center justify-between'>
							<span>Your profile and preferences</span>
							<span className='font-medium text-rose-400'>All data</span>
						</li>

						{impactStats && (
							<li className='flex items-center justify-between'>
								<span>Mind maps created</span>
								<span className='font-medium text-rose-400'>
									{impactStats.mindMapsCount}{' '}
									{impactStats.mindMapsCount === 1 ? 'map' : 'maps'}
								</span>
							</li>
						)}

						<li className='flex items-center justify-between'>
							<span>All nodes, connections & comments</span>
							<span className='font-medium text-rose-400'>All data</span>
						</li>

						{impactStats?.hasActiveSubscription && (
							<li className='flex items-center justify-between'>
								<span>Active subscription</span>
								<span className='font-medium text-rose-400'>
									Cancelled immediately
								</span>
							</li>
						)}

						<li className='flex items-center justify-between'>
							<span>Usage history & activity logs</span>
							<span className='font-medium text-rose-400'>All data</span>
						</li>
					</ul>
				</motion.div>

				{/* Warning for active subscription */}
				{impactStats?.hasActiveSubscription && (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className='mb-4 rounded-lg border border-warning-800/30 bg-warning-900/20 p-3'
						initial={{ opacity: 0, y: 10 }}
						transition={{ delay: 0.15, duration: 0.3 }}
					>
						<p className='text-sm text-warning-200'>
							<strong>Note:</strong> Your subscription will be cancelled
							immediately. You will not receive a refund for any remaining time
							in your billing period.
						</p>
					</motion.div>
				)}

				{/* Confirmation Input */}
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className='space-y-2 flex flex-col gap-1'
					initial={{ opacity: 0, y: 10 }}
					transition={{ delay: 0.2, duration: 0.3 }}
				>
					<label
						className='text-sm font-medium text-zinc-300'
						htmlFor='confirm-email-input'
					>
						Type your email{' '}
						<span className='font-bold text-white'>{userEmail}</span> to confirm
					</label>

					<Input
						autoFocus
						autoComplete='off'
						className='font-mono'
						disabled={isDeleting}
						id='confirm-email-input'
						onChange={(e) => setConfirmText(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder='Enter your email address...'
						type='email'
						value={confirmText}
					/>

					{confirmText && !isConfirmValid && (
						<p className='text-xs text-rose-400'>
							Email doesn&apos;t match. Please type exactly: {userEmail}
						</p>
					)}
				</motion.div>

				<DialogFooter className='mt-6 gap-2'>
					<Button
						className='transition-all duration-200 hover:bg-zinc-800'
						disabled={isDeleting}
						onClick={() => onOpenChange(false)}
						variant='ghost'
					>
						Cancel
					</Button>

					<Button
						className='min-w-[140px] bg-rose-600 transition-all duration-200 hover:bg-rose-700 disabled:bg-zinc-800 disabled:text-zinc-500'
						disabled={!isConfirmValid || isDeleting}
						onClick={handleConfirm}
						variant='destructive'
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
