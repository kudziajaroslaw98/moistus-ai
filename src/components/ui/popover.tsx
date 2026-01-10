'use client';

import { Popover as BasePopover } from '@base-ui/react/popover';
import { isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

function Popover({ ...props }: ComponentProps<typeof BasePopover.Root>) {
	return <BasePopover.Root data-slot='popover' {...props} />;
}

interface PopoverTriggerProps
	extends ComponentProps<typeof BasePopover.Trigger> {
	/** @deprecated Use `render` prop instead. Renders children as the trigger element. */
	asChild?: boolean;
	children?: ReactNode;
}

function PopoverTrigger({ asChild, children, ...props }: PopoverTriggerProps) {
	// Only use render prop when asChild is true AND children is a valid React element
	if (asChild && isValidElement(children)) {
		return (
			<BasePopover.Trigger
				data-slot='popover-trigger'
				render={children as ReactElement}
				{...props}
			/>
		);
	}
	// Fallback: render children normally (handles strings, arrays, fragments, etc.)
	return (
		<BasePopover.Trigger data-slot='popover-trigger' {...props}>
			{children}
		</BasePopover.Trigger>
	);
}

function PopoverContent({
	className,
	align = 'center',
	sideOffset = 4,
	...props
}: ComponentProps<typeof BasePopover.Popup> & {
	align?: 'start' | 'center' | 'end';
	sideOffset?: number;
}) {
	return (
		<BasePopover.Portal>
			<BasePopover.Positioner align={align} sideOffset={sideOffset}>
				<BasePopover.Popup
					data-slot='popover-content'
					className={cn(
						'bg-overlay border border-border-default text-text-primary backdrop-blur-sm',
						'data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-72 rounded-md shadow-md outline-hidden p-4',
						className
					)}
					{...props}
				/>
			</BasePopover.Positioner>
		</BasePopover.Portal>
	);
}

export { Popover, PopoverContent, PopoverTrigger };
