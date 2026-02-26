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
import { AlertTriangle, Loader2 } from 'lucide-react';

interface CancelSubscriptionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void | Promise<void>;
	isCanceling: boolean;
	periodEnd?: Date | string;
}

function formatPeriodEnd(periodEnd?: Date | string): string | null {
	if (!periodEnd) return null;

	const parsedDate = periodEnd instanceof Date ? periodEnd : new Date(periodEnd);
	if (Number.isNaN(parsedDate.getTime())) return null;

	return parsedDate.toLocaleDateString();
}

export function CancelSubscriptionDialog({
	open,
	onOpenChange,
	onConfirm,
	isCanceling,
	periodEnd,
}: CancelSubscriptionDialogProps) {
	const formattedPeriodEnd = formatPeriodEnd(periodEnd);

	return (
		<Dialog dismissible={!isCanceling} onOpenChange={onOpenChange} open={open}>
			<DialogContent
				className='border border-error-800/40 bg-base p-4 shadow-2xl backdrop-blur-sm sm:max-w-[440px]'
				showCloseButton={!isCanceling}
			>
				<DialogHeader>
					<div className='mb-1 flex items-center gap-2 text-error-400'>
						<AlertTriangle className='size-4' />
						<span className='text-xs font-semibold uppercase tracking-wide'>
							Billing Action
						</span>
					</div>
					<DialogTitle className='text-lg font-semibold text-text-primary'>
						Cancel subscription?
					</DialogTitle>
					<DialogDescription className='text-text-secondary'>
						This will end automatic renewals. You&apos;ll keep access until your
						current billing period ends.
					</DialogDescription>
				</DialogHeader>

				{formattedPeriodEnd && (
					<div className='rounded-lg border border-warning-800/30 bg-warning-900/20 px-3 py-2 text-sm text-warning-200'>
						Access remains available through {formattedPeriodEnd}.
					</div>
				)}

				<DialogFooter className='mt-2 gap-2'>
					<Button
						disabled={isCanceling}
						onClick={() => onOpenChange(false)}
						variant='ghost'
					>
						Keep subscription
					</Button>
					<Button
						disabled={isCanceling}
						onClick={onConfirm}
						variant='destructive'
					>
						{isCanceling ? (
							<>
								<Loader2 className='mr-2 size-4 animate-spin' />
								Canceling...
							</>
						) : (
							'Confirm cancellation'
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
