'use client';

import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

function Sheet({ ...props }: ComponentProps<typeof BaseDialog.Root>) {
	return <BaseDialog.Root data-slot='sheet' {...props} />;
}

function SheetTrigger({ ...props }: ComponentProps<typeof BaseDialog.Trigger>) {
	return <BaseDialog.Trigger data-slot='sheet-trigger' {...props} />;
}

function SheetClose({ ...props }: ComponentProps<typeof BaseDialog.Close>) {
	return <BaseDialog.Close data-slot='sheet-close' {...props} />;
}

function SheetPortal({ ...props }: ComponentProps<typeof BaseDialog.Portal>) {
	return <BaseDialog.Portal data-slot='sheet-portal' {...props} />;
}

function SheetOverlay({
	className,
	...props
}: ComponentProps<typeof BaseDialog.Backdrop>) {
	return (
		<BaseDialog.Backdrop
			data-slot='sheet-overlay'
			className={cn(
				'fixed inset-0 z-50',
				// Use transition instead of keyframe animation for smoother close
				'transition-opacity duration-300',
				'data-[open]:opacity-100',
				'data-[closed]:opacity-0',
				className
			)}
			style={{
				backgroundColor: 'rgba(0, 0, 0, 0.5)',
				backdropFilter: 'blur(12px)',
				transitionTimingFunction: 'cubic-bezier(.215, .61, .355, 1)', // ease-out-cubic
			}}
			{...props}
		/>
	);
}

function SheetContent({
	className,
	children,
	side = 'right',
	...props
}: ComponentProps<typeof BaseDialog.Popup> & {
	side?: 'top' | 'right' | 'bottom' | 'left';
}) {
	return (
		<SheetPortal>
			<SheetOverlay />

			<BaseDialog.Popup
				data-slot='sheet-content'
				className={cn(
					'border border-border-default bg-base text-text-primary',
					'data-[open]:animate-in data-[closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition-transform data-[closed]:duration-300 data-[open]:duration-500',
					side === 'right' &&
						'data-[closed]:slide-out-to-right data-[open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 sm:max-w-sm',
					side === 'left' &&
						'data-[closed]:slide-out-to-left data-[open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 sm:max-w-sm',
					side === 'top' &&
						'data-[closed]:slide-out-to-top data-[open]:slide-in-from-top inset-x-0 top-0 h-auto',
					side === 'bottom' &&
						'data-[closed]:slide-out-to-bottom data-[open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto',
					className
				)}
				style={{
					transitionTimingFunction: 'cubic-bezier(.645, .045, .355, 1)', // ease-in-out-cubic
				}}
				{...props}
			>
				{children}

				<BaseDialog.Close className='ring-offset-background data-[open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity duration-200 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none'>
					<XIcon className='size-4' />

					<span className='sr-only'>Close</span>
				</BaseDialog.Close>
			</BaseDialog.Popup>
		</SheetPortal>
	);
}

function SheetHeader({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			className={cn('flex flex-col gap-1.5 p-4', className)}
			data-slot='sheet-header'
			{...props}
		/>
	);
}

function SheetFooter({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			className={cn('mt-auto flex flex-col gap-2 p-4', className)}
			data-slot='sheet-footer'
			{...props}
		/>
	);
}

function SheetTitle({
	className,
	...props
}: ComponentProps<typeof BaseDialog.Title>) {
	return (
		<BaseDialog.Title
			className={cn('text-foreground font-semibold', className)}
			data-slot='sheet-title'
			{...props}
		/>
	);
}

function SheetDescription({
	className,
	...props
}: ComponentProps<typeof BaseDialog.Description>) {
	return (
		<BaseDialog.Description
			className={cn('text-muted-foreground text-sm', className)}
			data-slot='sheet-description'
			{...props}
		/>
	);
}

export {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
};
