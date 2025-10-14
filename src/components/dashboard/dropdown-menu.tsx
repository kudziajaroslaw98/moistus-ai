'use client';

import { cn } from '@/lib/utils';
import { ComponentProps } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

interface DropdownMenuProps {
	children: React.ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function DropdownMenu({
	children,
	open,
	onOpenChange,
}: DropdownMenuProps) {
	return (
		<Popover open={open} onOpenChange={onOpenChange}>
			{children}
		</Popover>
	);
}

export function DropdownMenuTrigger({
	asChild,
	children,
	...props
}: ComponentProps<typeof PopoverTrigger>) {
	return (
		<PopoverTrigger asChild={asChild} {...props}>
			{children}
		</PopoverTrigger>
	);
}

interface DropdownMenuContentProps
	extends ComponentProps<typeof PopoverContent> {
	className?: string;
}

export function DropdownMenuContent({
	className,
	align = 'end',
	sideOffset = 8,
	children,
	...props
}: DropdownMenuContentProps) {
	return (
		<PopoverContent
			align={align}
			sideOffset={sideOffset}
			className={cn(
				'w-56 p-1 bg-zinc-900 border-zinc-700 border rounded-md shadow-lg',
				className
			)}
			{...props}
		>
			{children}
		</PopoverContent>
	);
}

interface DropdownMenuItemProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	className?: string;
	children: React.ReactNode;
}

export function DropdownMenuItem({
	className,
	children,
	onClick,
	disabled,
	...props
}: DropdownMenuItemProps) {
	return (
		<button
			disabled={disabled}
			className={cn(
				'flex w-full items-center px-3 py-2 text-sm text-zinc-300 rounded-sm transition-colors',
				'hover:bg-zinc-800 hover:text-white focus:bg-zinc-800 focus:text-white focus:outline-none',
				'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-zinc-300',
				className
			)}
			onClick={onClick}
			{...props}
		>
			{children}
		</button>
	);
}

interface DropdownMenuSeparatorProps {
	className?: string;
}

export function DropdownMenuSeparator({
	className,
}: DropdownMenuSeparatorProps) {
	return <div className={cn('my-1 h-px bg-zinc-700', className)} />;
}

interface DropdownMenuLabelProps {
	className?: string;
	children: React.ReactNode;
}

export function DropdownMenuLabel({
	className,
	children,
}: DropdownMenuLabelProps) {
	return (
		<div
			className={cn(
				'px-3 py-2 text-xs font-medium text-zinc-400 uppercase tracking-wider',
				className
			)}
		>
			{children}
		</div>
	);
}

