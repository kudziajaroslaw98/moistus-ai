'use client';

import { Menu as BaseMenu } from '@base-ui/react/menu';
import { CheckIcon, ChevronRightIcon, CircleIcon } from 'lucide-react';
import { isValidElement, type ComponentProps, type ReactElement } from 'react';

import { cn } from '@/lib/utils';

function DropdownMenu({
	...props
}: ComponentProps<typeof BaseMenu.Root>) {
	return <BaseMenu.Root data-slot='dropdown-menu' {...props} />;
}

function DropdownMenuPortal({
	...props
}: ComponentProps<typeof BaseMenu.Portal>) {
	return <BaseMenu.Portal data-slot='dropdown-menu-portal' {...props} />;
}

interface DropdownMenuTriggerProps extends ComponentProps<typeof BaseMenu.Trigger> {
	/**
	 * @deprecated Use `render` prop instead. Renders children as the trigger element.
	 */
	asChild?: boolean;
}

function DropdownMenuTrigger({
	asChild,
	children,
	...props
}: DropdownMenuTriggerProps) {
	// Only use render prop when asChild is true AND children is a valid React element
	if (asChild && isValidElement(children)) {
		return (
			<BaseMenu.Trigger
				data-slot='dropdown-menu-trigger'
				render={children as ReactElement}
				{...props}
			/>
		);
	}
	// Fallback: render children normally (handles strings, arrays, fragments, etc.)
	return (
		<BaseMenu.Trigger data-slot='dropdown-menu-trigger' {...props}>
			{children}
		</BaseMenu.Trigger>
	);
}

function DropdownMenuContent({
	className,
	alignOffset = 4,
	align = 'start',
	...props
}: ComponentProps<typeof BaseMenu.Popup> & {
	alignOffset?: number;
	align?: 'start' | 'center' | 'end';
}) {
	return (
		<BaseMenu.Portal>
			<BaseMenu.Positioner alignOffset={alignOffset} align={align}>
				<BaseMenu.Popup
					data-slot='dropdown-menu-content'
					className={cn(
						'bg-overlay border border-border-default text-text-primary backdrop-blur-sm',
						'data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-80 min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md shadow-md p-1',
						className
					)}
					{...props}
				/>
			</BaseMenu.Positioner>
		</BaseMenu.Portal>
	);
}

function DropdownMenuGroup({
	...props
}: ComponentProps<typeof BaseMenu.Group>) {
	return <BaseMenu.Group data-slot='dropdown-menu-group' {...props} />;
}

function DropdownMenuItem({
	className,
	inset,
	variant = 'default',
	...props
}: ComponentProps<typeof BaseMenu.Item> & {
	inset?: boolean;
	variant?: 'default' | 'destructive';
}) {
	return (
		<BaseMenu.Item
			data-inset={inset}
			data-slot='dropdown-menu-item'
			data-variant={variant}
			className={cn(
				"hover:bg-elevated focus:bg-elevated data-[highlighted]:bg-elevated data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className
			)}
			{...props}
		/>
	);
}

function DropdownMenuCheckboxItem({
	className,
	children,
	checked,
	...props
}: ComponentProps<typeof BaseMenu.CheckboxItem>) {
	return (
		<BaseMenu.CheckboxItem
			checked={checked}
			data-slot='dropdown-menu-checkbox-item'
			className={cn(
				"hover:bg-elevated focus:bg-elevated data-[highlighted]:bg-elevated relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className
			)}
			{...props}
		>
			<span className='pointer-events-none absolute left-2 flex size-3.5 items-center justify-center'>
				<BaseMenu.CheckboxItemIndicator>
					<CheckIcon className='size-4' />
				</BaseMenu.CheckboxItemIndicator>
			</span>

			{children}
		</BaseMenu.CheckboxItem>
	);
}

function DropdownMenuRadioGroup({
	...props
}: ComponentProps<typeof BaseMenu.RadioGroup>) {
	return (
		<BaseMenu.RadioGroup data-slot='dropdown-menu-radio-group' {...props} />
	);
}

function DropdownMenuRadioItem({
	className,
	children,
	...props
}: ComponentProps<typeof BaseMenu.RadioItem>) {
	return (
		<BaseMenu.RadioItem
			data-slot='dropdown-menu-radio-item'
			className={cn(
				"hover:bg-elevated focus:bg-elevated data-[highlighted]:bg-elevated relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className
			)}
			{...props}
		>
			<span className='pointer-events-none absolute left-2 flex size-3.5 items-center justify-center'>
				<BaseMenu.RadioItemIndicator>
					<CircleIcon className='size-2 fill-current' />
				</BaseMenu.RadioItemIndicator>
			</span>

			{children}
		</BaseMenu.RadioItem>
	);
}

function DropdownMenuLabel({
	className,
	inset,
	...props
}: ComponentProps<typeof BaseMenu.GroupLabel> & {
	inset?: boolean;
}) {
	return (
		<BaseMenu.GroupLabel
			data-inset={inset}
			data-slot='dropdown-menu-label'
			className={cn(
				'px-2 py-1.5 text-sm font-medium data-[inset]:pl-8',
				className
			)}
			{...props}
		/>
	);
}

function DropdownMenuSeparator({
	className,
	...props
}: ComponentProps<typeof BaseMenu.Separator>) {
	return (
		<BaseMenu.Separator
			className={cn('bg-border -mx-1 my-1 h-px', className)}
			data-slot='dropdown-menu-separator'
			{...props}
		/>
	);
}

function DropdownMenuShortcut({ className, ...props }: ComponentProps<'span'>) {
	return (
		<span
			data-slot='dropdown-menu-shortcut'
			className={cn(
				'text-muted-foreground ml-auto text-xs tracking-widest',
				className
			)}
			{...props}
		/>
	);
}

function DropdownMenuSub({
	...props
}: ComponentProps<typeof BaseMenu.SubmenuRoot>) {
	return <BaseMenu.SubmenuRoot data-slot='dropdown-menu-sub' {...props} />;
}

function DropdownMenuSubTrigger({
	className,
	inset,
	children,
	...props
}: ComponentProps<typeof BaseMenu.SubmenuTrigger> & {
	inset?: boolean;
}) {
	return (
		<BaseMenu.SubmenuTrigger
			data-inset={inset}
			data-slot='dropdown-menu-sub-trigger'
			className={cn(
				'hover:bg-elevated focus:bg-elevated data-[highlighted]:bg-elevated data-[open]:bg-elevated flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8',
				className
			)}
			{...props}
		>
			{children}

			<ChevronRightIcon className='ml-auto size-4' />
		</BaseMenu.SubmenuTrigger>
	);
}

function DropdownMenuSubContent({
	className,
	alignOffset = 2,
	align = 'start',
	...props
}: ComponentProps<typeof BaseMenu.Popup> & {
	alignOffset?: number;
	align?: 'start' | 'center' | 'end';
}) {
	return (
		<BaseMenu.Portal>
			<BaseMenu.Positioner alignOffset={alignOffset} align={align}>
				<BaseMenu.Popup
					data-slot='dropdown-menu-sub-content'
					className={cn(
						'bg-overlay border border-border-default text-text-primary backdrop-blur-sm',
						'data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] overflow-hidden rounded-md shadow-lg p-1',
						className
					)}
					{...props}
				/>
			</BaseMenu.Positioner>
		</BaseMenu.Portal>
	);
}

export {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
};
