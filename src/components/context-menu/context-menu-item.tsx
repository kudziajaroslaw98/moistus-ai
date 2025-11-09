'use client';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import React from 'react';
import { Button } from '../ui/button';

interface ContextMenuItemProps {
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
	disabled?: boolean;
	variant?: 'default' | 'destructive' | 'primary';
	shortcut?: string;
	loading?: boolean;
	className?: string;
}

export const ContextMenuItem = React.forwardRef<
	HTMLButtonElement,
	ContextMenuItemProps
>(
	(
		{
			icon,
			label,
			onClick,
			disabled = false,
			variant = 'default',
			shortcut,
			loading = false,
			className,
		},
		ref
	) => {
		return (
			<Button
				aria-describedby={shortcut ? `${label}-shortcut` : undefined}
				aria-disabled={disabled || loading}
				disabled={disabled || loading}
				ref={ref}
				role='menuitem'
				variant='ghost'
				className={cn(
					'h-8 w-full justify-start gap-2 p-2 text-sm',
					'@media (hover: hover) and (pointer: fine) { transition-property: color, background-color, opacity }',
					variant === 'destructive' && 'text-error-500',
					variant === 'primary' && 'text-blue-500',
					variant !== 'destructive' &&
						variant !== 'primary' &&
						'text-text-primary',
					'transition-all duration-200 ease-spring',
					className
				)}
				onClick={onClick}
			>
				{loading ? (
					<Loader2 className='h-4 w-4 animate-spin' />
				) : (
					<span className='h-4 w-4'>{icon}</span>
				)}

				<span className='flex-1 text-left'>{label}</span>

				{shortcut && (
					<span
						className='ml-auto text-xs text-text-disabled'
						id={`${label}-shortcut`}
					>
						{shortcut}
					</span>
				)}
			</Button>
		);
	}
);

ContextMenuItem.displayName = 'ContextMenuItem';
