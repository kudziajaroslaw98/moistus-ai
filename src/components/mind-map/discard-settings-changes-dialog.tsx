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

interface DiscardSettingsChangesDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onContinueEditing: () => void;
	onDiscardChanges: () => void;
}

export function DiscardSettingsChangesDialog({
	open,
	onOpenChange,
	onContinueEditing,
	onDiscardChanges,
}: DiscardSettingsChangesDialogProps) {
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent
				className='border border-border-subtle bg-base p-4 shadow-2xl backdrop-blur-sm sm:max-w-[420px]'
				showCloseButton={true}
			>
				<DialogHeader>
					<DialogTitle className='text-lg font-semibold text-text-primary'>
						Discard unsaved changes?
					</DialogTitle>

					<DialogDescription className='text-text-secondary'>
						You have unsaved edits in Map Settings. Discard them or continue
						editing.
					</DialogDescription>
				</DialogHeader>

				<DialogFooter className='mt-4 gap-2'>
					<Button onClick={onContinueEditing} variant='ghost'>
						Continue editing
					</Button>

					<Button onClick={onDiscardChanges} variant='destructive'>
						Discard changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
