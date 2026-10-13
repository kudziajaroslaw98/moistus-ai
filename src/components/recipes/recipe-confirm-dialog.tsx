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

interface RecipeConfirmDialogProps {
	open: boolean;
	title: string;
	description: string;
	confirmLabel: string;
	cancelLabel?: string;
	onConfirm: () => void;
	onCancel: () => void;
}

/** Destructive confirmation (discard edits, delete recipe), styled like the map settings dialogs. */
export function RecipeConfirmDialog({
	open,
	title,
	description,
	confirmLabel,
	cancelLabel = 'Cancel',
	onConfirm,
	onCancel,
}: RecipeConfirmDialogProps) {
	return (
		<Dialog onOpenChange={(isOpen) => !isOpen && onCancel()} open={open}>
			<DialogContent
				showCloseButton
				className='border border-border-subtle bg-base p-4 shadow-2xl backdrop-blur-sm sm:max-w-[420px]'
			>
				<DialogHeader>
					<DialogTitle className='text-lg font-semibold text-text-primary'>
						{title}
					</DialogTitle>

					<DialogDescription className='text-text-secondary'>
						{description}
					</DialogDescription>
				</DialogHeader>

				<DialogFooter className='mt-4 gap-2'>
					<Button onClick={onCancel} variant='ghost'>
						{cancelLabel}
					</Button>

					<Button onClick={onConfirm} state='destructive' variant='normal'>
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
