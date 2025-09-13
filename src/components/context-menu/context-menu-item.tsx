'use client';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import React from 'react';
import { Button } from '../ui/button';
import { GlassmorphismTheme } from '../nodes/themes/glassmorphism-theme';

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
		const getVariantStyles = (variant: string) => {
			switch (variant) {
				case 'destructive':
					return { color: 'rgba(239, 68, 68, 0.87)' }; // Red
				case 'primary':
					return { color: 'rgba(96, 165, 250, 0.87)' }; // Blue
				default:
					return { color: GlassmorphismTheme.text.high };
			}
		};

		return (
			<Button
				ref={ref}
				className={cn(
					'h-8 w-full justify-start gap-2 p-2 text-sm',
					className
				)}
				variant='ghost'
				onClick={onClick}
				disabled={disabled || loading}
				role='menuitem'
				aria-disabled={disabled || loading}
				aria-describedby={shortcut ? `${label}-shortcut` : undefined}
				style={getVariantStyles(variant)}
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
						className='ml-auto text-xs'
						style={{ color: GlassmorphismTheme.text.disabled }}
					>
						{shortcut}
					</span>
				)}
			</Button>
		);
	}
);

ContextMenuItem.displayName = 'ContextMenuItem';
