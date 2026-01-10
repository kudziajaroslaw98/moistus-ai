'use client';

import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { XIcon } from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

function Dialog({ ...props }: ComponentProps<typeof BaseDialog.Root>) {
	return <BaseDialog.Root data-slot='dialog' {...props} />;
}

function DialogTrigger({
	...props
}: ComponentProps<typeof BaseDialog.Trigger>) {
	return <BaseDialog.Trigger data-slot='dialog-trigger' {...props} />;
}

function DialogPortal({
	...props
}: ComponentProps<typeof BaseDialog.Portal>) {
	return <BaseDialog.Portal data-slot='dialog-portal' {...props} />;
}

function DialogClose({
	...props
}: ComponentProps<typeof BaseDialog.Close>) {
	return <BaseDialog.Close data-slot='dialog-close' {...props} />;
}

function DialogOverlay({
	className,
	...props
}: ComponentProps<typeof BaseDialog.Backdrop>) {
	return (
		<BaseDialog.Backdrop
			data-slot='dialog-overlay'
			className={cn(
				'data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 fixed inset-0 z-50 backdrop-blur-sm',
				className
			)}
			style={{
				backgroundColor: 'rgba(0, 0, 0, 0.5)',
				backdropFilter: 'blur(12px)',
			}}
			{...props}
		/>
	);
}

interface DialogContentProps extends ComponentProps<typeof BaseDialog.Popup> {
	showCloseButton?: boolean;
	/**
	 * Whether clicking outside the dialog dismisses it.
	 * @default true
	 */
	dismissible?: boolean;
	/**
	 * @deprecated Use `dismissible={false}` instead.
	 * Legacy Radix UI prop - call e.preventDefault() to prevent dismissal.
	 */
	onInteractOutside?: (e: Event) => void;
	/**
	 * @deprecated Use `dismissible={false}` instead.
	 * Legacy Radix UI prop - call e.preventDefault() to prevent dismissal.
	 */
	onPointerDownOutside?: (e: Event) => void;
}

function DialogContent({
	className,
	children,
	showCloseButton = true,
	dismissible = true,
	onInteractOutside,
	onPointerDownOutside,
	...props
}: DialogContentProps) {
	// Determine if dismissal should be prevented based on legacy props
	const shouldPreventDismiss =
		!dismissible ||
		onInteractOutside !== undefined ||
		onPointerDownOutside !== undefined;

	return (
		<DialogPortal data-slot='dialog-portal'>
			<DialogOverlay
				onPointerDown={
					shouldPreventDismiss
						? (e) => {
								// Prevent backdrop click from closing dialog
								e.stopPropagation();
							}
						: undefined
				}
			/>

			<DialogTitle data-slot='dialog-title'></DialogTitle>

			<BaseDialog.Popup
				data-slot='dialog-content'
				className={cn(
					'bg-base6 border border-border-default backdrop-blur-md text-text-primary',
					'data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg shadow-lg duration-200 sm:max-w-lg',
					className
				)}
				{...props}
			>
				{children}

				{showCloseButton && (
					<BaseDialog.Close
						className="ring-offset-background cursor-pointer focus:ring-ring data-[open]:bg-accent data-[open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
						data-slot='dialog-close'
					>
						<XIcon />

						<span className='sr-only'>Close</span>
					</BaseDialog.Close>
				)}
			</BaseDialog.Popup>
		</DialogPortal>
	);
}

function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
			data-slot='dialog-header'
			{...props}
		/>
	);
}

function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot='dialog-footer'
			className={cn(
				'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
				className
			)}
			{...props}
		/>
	);
}

function DialogTitle({
	className,
	...props
}: ComponentProps<typeof BaseDialog.Title>) {
	return (
		<BaseDialog.Title
			className={cn('text-lg leading-none font-semibold', className)}
			data-slot='dialog-title'
			{...props}
		/>
	);
}

function DialogDescription({
	className,
	...props
}: ComponentProps<typeof BaseDialog.Description>) {
	return (
		<BaseDialog.Description
			className={cn('text-muted-foreground text-sm', className)}
			data-slot='dialog-description'
			{...props}
		/>
	);
}

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
};
