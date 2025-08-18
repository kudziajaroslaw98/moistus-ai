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
		const variantClasses = {
			default: '',
			destructive: 'text-red-400 hover:text-red-300',
			primary: 'text-blue-400 hover:text-blue-300',
		};

		return (
			<Button
				ref={ref}
				className={cn(
					'h-8 w-full justify-start gap-2 p-2 text-sm',
					variantClasses[variant],
					className
				)}
				variant='ghost'
				onClick={onClick}
				disabled={disabled || loading}
				role='menuitem'
				aria-disabled={disabled || loading}
				aria-describedby={shortcut ? `${label}-shortcut` : undefined}
			>
				{loading ? (
					<Loader2 className='h-4 w-4 animate-spin' />
				) : (
					<span className='h-4 w-4'>{icon}</span>
				)}

				<span className='flex-1 text-left'>{label}</span>

				{shortcut && (
					<span
						id={`${label}-shortcut`}
						className='ml-auto text-xs text-zinc-500'
					>
						{shortcut}
					</span>
				)}
			</Button>
		);
	}
);

ContextMenuItem.displayName = 'ContextMenuItem';
