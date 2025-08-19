'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import {
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from './dropdown-menu';

interface SidebarDropdownMenuProps {
	children: ReactNode;
	className?: string;
	align?: 'start' | 'center' | 'end';
	sideOffset?: number;
}

export const SidebarDropdownMenu = ({
	children,
	className,
	align = 'end',
	sideOffset = 4,
	...props
}: SidebarDropdownMenuProps) => {
	return (
		<DropdownMenuContent
			className={cn(
				'w-48 bg-zinc-900 border-zinc-700 shadow-xl',
				className
			)}
			align={align}
			sideOffset={sideOffset}
			{...props}
		>
			{children}
		</DropdownMenuContent>
	);
};

interface MenuItemProps {
	icon?: ReactNode;
	label: string;
	shortcut?: string;
	variant?: 'default' | 'danger' | 'info';
	disabled?: boolean;
	onClick?: () => void;
	className?: string;
}

export const MenuItem = ({
	icon,
	label,
	shortcut,
	variant = 'default',
	disabled = false,
	onClick,
	className,
}: MenuItemProps) => {
	return (
		<DropdownMenuItem
			className={cn(
				'flex items-center gap-3 px-3 py-2 cursor-pointer',
				variant === 'danger' &&
					'text-red-400 focus:text-red-300 focus:bg-red-950/20',
				variant === 'info' &&
					'text-zinc-500 cursor-default focus:bg-transparent',
				disabled && 'opacity-50 cursor-not-allowed',
				className
			)}
			onClick={disabled ? undefined : onClick}
			disabled={disabled}
		>
			{/* Icon */}
			{icon && (
				<div
					className={cn(
						'h-4 w-4 flex-shrink-0',
						variant === 'default' && 'text-zinc-400',
						variant === 'danger' && 'text-red-400',
						variant === 'info' && 'text-zinc-500'
					)}
				>
					{icon}
				</div>
			)}

			{/* Label */}
			<span className='flex-grow'>{label}</span>

			{/* Keyboard Shortcut */}
			{shortcut && (
				<kbd className='ml-auto text-xs text-zinc-500 font-mono'>
					{shortcut}
				</kbd>
			)}
		</DropdownMenuItem>
	);
};

interface MenuSeparatorProps {
	className?: string;
}

export const MenuSeparator = ({ className }: MenuSeparatorProps) => {
	return <DropdownMenuSeparator className={cn('my-1 bg-zinc-800', className)} />;
};

interface MenuInfoItemProps {
	children: ReactNode;
	className?: string;
}

export const MenuInfoItem = ({ children, className }: MenuInfoItemProps) => {
	return (
		<div
			className={cn(
				'flex items-center gap-3 px-3 py-2 text-zinc-500 text-sm cursor-default',
				className
			)}
		>
			{children}
		</div>
	);
};