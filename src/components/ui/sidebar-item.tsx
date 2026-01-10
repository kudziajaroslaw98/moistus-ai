'use client';

import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { type KeyboardEvent, type ReactNode, useCallback } from 'react';

interface SidebarItemProps {
	icon: ReactNode;
	label: string;
	isActive?: boolean;
	onClick?: () => void;
	badge?: ReactNode;
	actions?: ReactNode;
	metadata?: ReactNode;
	level?: number;
	className?: string;
	disabled?: boolean;
	children?: ReactNode;
	onKeyDown?: (e: KeyboardEvent) => void;
	tabIndex?: number;
	collapsed?: boolean;
}

export const SidebarItem = ({
	icon,
	label,
	isActive = false,
	onClick,
	badge,
	actions,
	metadata,
	level = 0,
	className,
	disabled = false,
	children,
	onKeyDown,
	tabIndex = 0,
	collapsed = false,
}: SidebarItemProps) => {
	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (disabled) return;

			// Call custom onKeyDown if provided
			onKeyDown?.(e);

			// Handle standard navigation keys
			switch (e.key) {
				case 'Enter':
				case ' ': // Space key
					e.preventDefault();
					onClick?.();
					break;
				case 'ArrowUp':
					e.preventDefault();
					// Focus previous focusable element
					const prevElement = e.currentTarget
						.previousElementSibling as HTMLElement;

					if (prevElement?.tabIndex >= 0) {
						prevElement.focus();
					}

					break;
				case 'ArrowDown':
					e.preventDefault();
					// Focus next focusable element
					const nextElement = e.currentTarget.nextElementSibling as HTMLElement;

					if (nextElement?.tabIndex >= 0) {
						nextElement.focus();
					}

					break;
			}
		},
		[disabled, onKeyDown, onClick]
	);

	return (
		<div>
			<motion.div
				aria-disabled={disabled}
				aria-pressed={isActive}
				onClick={disabled ? undefined : onClick}
				onKeyDown={handleKeyDown}
				role='button'
				tabIndex={disabled ? -1 : tabIndex}
				whileTap={disabled ? undefined : { scale: 0.98 }}
				className={cn(
					'group relative flex items-center rounded-lg transition-all cursor-pointer',
					'hover:bg-zinc-800/50 focus:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-sky-500/50',
					isActive && 'bg-zinc-800 text-white',
					!isActive && 'text-zinc-400 hover:text-white',
					disabled && 'opacity-50 cursor-not-allowed',
					collapsed ? 'justify-center px-2 py-3' : 'gap-3',
					!collapsed && 'px-3 py-2',
					className
				)}
				style={{
					paddingLeft:
						!collapsed && level > 0 ? `${level * 16 + 12}px` : undefined,
				}}
			>
				{/* Icon */}
				<div className='shrink-0'>{icon}</div>

				{/* Label - hidden when collapsed */}
				{!collapsed && (
					<span className='flex-grow text-sm truncate'>{label}</span>
				)}

				{/* Badge - hidden when collapsed */}
				{!collapsed && badge && <div className='shrink-0'>{badge}</div>}

				{/* Actions - hidden when collapsed */}
				{!collapsed && actions && (
					<div
						className={cn(
							'flex items-center gap-1',
							isActive
								? 'opacity-80'
								: 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
						)}
					>
						{actions}
					</div>
				)}

				{/* Metadata below main content */}
				{metadata && (
					<div className='absolute top-full left-0 right-0 mt-1 px-3 text-xs text-zinc-500'>
						{metadata}
					</div>
				)}
			</motion.div>

			{/* Children (for nested items) */}
			{children}
		</div>
	);
};
