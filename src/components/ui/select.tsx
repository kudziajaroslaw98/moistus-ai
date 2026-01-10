'use client';

import { Select as BaseSelect } from '@base-ui/react/select';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * Backwards-compatible Select props that wrap Base UI's generic Select.
 * For Radix UI compatibility, value is always string.
 */
interface SelectProps
	extends Omit<
		ComponentProps<typeof BaseSelect.Root<string>>,
		'onValueChange'
	> {
	/**
	 * The controlled value of the select.
	 */
	value?: string;
	/**
	 * The default value for uncontrolled usage.
	 */
	defaultValue?: string;
	/**
	 * Callback when the value changes (Radix-style - value only, no eventDetails).
	 */
	onValueChange?: (value: string) => void;
}

function Select({ onValueChange, ...props }: SelectProps) {
	return (
		<BaseSelect.Root<string>
			data-slot='select'
			onValueChange={
				onValueChange
					? (value) => {
							// Only call handler for non-null values (Radix compatibility)
							if (value !== null) {
								onValueChange(value);
							}
						}
					: undefined
			}
			{...props}
		/>
	);
}

function SelectGroup({ ...props }: ComponentProps<typeof BaseSelect.Group>) {
	return <BaseSelect.Group data-slot='select-group' {...props} />;
}

interface SelectValueProps extends ComponentProps<typeof BaseSelect.Value> {
	/**
	 * Placeholder text shown when no value is selected.
	 */
	placeholder?: string;
}

function SelectValue({ placeholder, children, ...props }: SelectValueProps) {
	return (
		<BaseSelect.Value data-slot='select-value' {...props}>
			{(value) => {
				// If children is provided and is a function, use it
				if (typeof children === 'function') {
					return children(value);
				}
				// If children is provided, use it
				if (children) {
					return children;
				}
				// If no value selected, show placeholder
				if (value === null || value === undefined || value === '') {
					return (
						<span data-placeholder='' className='text-muted-foreground'>
							{placeholder}
						</span>
					);
				}
				// Default: show the value
				return String(value);
			}}
		</BaseSelect.Value>
	);
}

function SelectTrigger({
	className,
	size = 'default',
	children,
	...props
}: ComponentProps<typeof BaseSelect.Trigger> & {
	size?: 'sm' | 'default';
}) {
	return (
		<BaseSelect.Trigger
			data-size={size}
			data-slot='select-trigger'
			className={cn(
				"border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className
			)}
			{...props}
		>
			{children}

			<BaseSelect.Icon>
				<ChevronDownIcon className='size-4 opacity-50' />
			</BaseSelect.Icon>
		</BaseSelect.Trigger>
	);
}

function SelectContent({
	className,
	children,
	position = 'popper',
	sideOffset = 4,
	...props
}: ComponentProps<typeof BaseSelect.Popup> & {
	position?: 'popper' | 'item-aligned';
	sideOffset?: number;
}) {
	return (
		<BaseSelect.Portal>
			<BaseSelect.Positioner sideOffset={sideOffset}>
				<BaseSelect.Popup
					data-slot='select-content'
					className={cn(
						'bg-elevated text-popover-foreground data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-80 min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border shadow-md',
						position === 'popper' &&
							'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
						className
					)}
					{...props}
				>
					<SelectScrollUpButton />

					<BaseSelect.List
						className={cn(
							'p-1',
							position === 'popper' && 'w-full min-w-32 scroll-my-1'
						)}
					>
						{children}
					</BaseSelect.List>

					<SelectScrollDownButton />
				</BaseSelect.Popup>
			</BaseSelect.Positioner>
		</BaseSelect.Portal>
	);
}

function SelectLabel({
	className,
	...props
}: ComponentProps<typeof BaseSelect.GroupLabel>) {
	return (
		<BaseSelect.GroupLabel
			className={cn('text-muted-foreground px-2 py-1.5 text-xs', className)}
			data-slot='select-label'
			{...props}
		/>
	);
}

function SelectItem({
	className,
	children,
	...props
}: ComponentProps<typeof BaseSelect.Item>) {
	return (
		<BaseSelect.Item
			data-slot='select-item'
			className={cn(
				"focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
				className
			)}
			{...props}
		>
			<span className='absolute right-2 flex size-3.5 items-center justify-center'>
				<BaseSelect.ItemIndicator>
					<CheckIcon className='size-4' />
				</BaseSelect.ItemIndicator>
			</span>

			<BaseSelect.ItemText>{children}</BaseSelect.ItemText>
		</BaseSelect.Item>
	);
}

function SelectSeparator({
	className,
	...props
}: ComponentProps<'div'>) {
	return (
		<div
			className={cn('bg-border pointer-events-none -mx-1 my-1 h-px', className)}
			data-slot='select-separator'
			role='separator'
			{...props}
		/>
	);
}

function SelectScrollUpButton({
	className,
	...props
}: ComponentProps<typeof BaseSelect.ScrollUpArrow>) {
	return (
		<BaseSelect.ScrollUpArrow
			data-slot='select-scroll-up-button'
			className={cn(
				'flex cursor-default items-center justify-center py-1',
				className
			)}
			{...props}
		>
			<ChevronUpIcon className='size-4' />
		</BaseSelect.ScrollUpArrow>
	);
}

function SelectScrollDownButton({
	className,
	...props
}: ComponentProps<typeof BaseSelect.ScrollDownArrow>) {
	return (
		<BaseSelect.ScrollDownArrow
			data-slot='select-scroll-down-button'
			className={cn(
				'flex cursor-default items-center justify-center py-1',
				className
			)}
			{...props}
		>
			<ChevronDownIcon className='size-4' />
		</BaseSelect.ScrollDownArrow>
	);
}

export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
};
