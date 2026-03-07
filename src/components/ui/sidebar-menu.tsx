'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import {
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from './dropdown-menu';

interface SidebarDropdownMenuProps {
	children: ReactNode;
	className?: string;
	align?: 'start' | 'center' | 'end';
	alignOffset?: number;
}

export const SidebarDropdownMenu = ({
	children,
	className,
	align = 'end',
	alignOffset = 4,
	...props
}: SidebarDropdownMenuProps) => {
	return (
		<DropdownMenuContent
			align={align}
			className={cn('w-48', className)}
			alignOffset={alignOffset}
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
			disabled={disabled}
			onClick={disabled ? undefined : onClick}
			className={cn(
				'flex items-center gap-3 px-3 py-2 cursor-pointer',
				variant === 'danger' &&
					'text-error-400 data-[highlighted]:text-error-300 data-[highlighted]:bg-error-900/20',
				variant === 'info' &&
					'text-text-tertiary cursor-default data-[highlighted]:bg-transparent',
				disabled && 'opacity-50 cursor-not-allowed',
				className
			)}
		>
			{/* Icon */}
			{icon && (
				<div
					className={cn(
						'h-4 w-4 shrink-0',
						variant === 'default' && 'text-text-secondary',
						variant === 'danger' && 'text-error-400',
						variant === 'info' && 'text-text-tertiary'
					)}
				>
					{icon}
				</div>
			)}

			{/* Label */}
			<span className='flex-grow'>{label}</span>

			{/* Keyboard Shortcut */}
			{shortcut && (
				<kbd className='ml-auto text-xs text-text-tertiary font-mono'>
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
	return (
		<DropdownMenuSeparator className={cn('my-1', className)} />
	);
};

interface MenuInfoItemProps {
	children: ReactNode;
	className?: string;
}

export const MenuInfoItem = ({ children, className }: MenuInfoItemProps) => {
	return (
		<div
			className={cn(
				'flex items-center gap-3 px-3 py-2 text-text-tertiary text-sm cursor-default',
				className
			)}
		>
			{children}
		</div>
	);
};
