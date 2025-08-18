'use client';

import {
	MetadataTheme,
	getIconSize,
	getMetadataColors,
} from '@/themes/metadata-theme';
import { cn } from '@/utils/cn';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { memo } from 'react';

export type BadgeType =
	| 'tag'
	| 'status'
	| 'priority'
	| 'date'
	| 'assignee'
	| 'custom';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export interface MetadataBadgeProps {
	type: BadgeType;
	value: string;
	icon?: LucideIcon;
	variant?: BadgeVariant;
	size?: BadgeSize;
	onClick?: (value: string) => void;
	onRemove?: (value: string) => void;
	className?: string;
	animated?: boolean;
}

const variantColorMap: Record<
	BadgeVariant,
	{ bg: string; text: string; border: string; hover: string }
> = {
	default: MetadataTheme.colors.default,
	success: MetadataTheme.colors.status.complete,
	warning: MetadataTheme.colors.priority.medium,
	error: MetadataTheme.colors.annotation.error,
	info: MetadataTheme.colors.annotation.info,
};

const MetadataBadgeComponent = ({
	type,
	value,
	icon: Icon,
	variant,
	size = 'sm',
	onClick,
	onRemove,
	className,
	animated = true,
}: MetadataBadgeProps) => {
	// Determine color scheme based on type and variant
	let colors = getMetadataColors(type as any, value.toLowerCase());

	// Override with variant colors if specified
	if (variant && variant !== 'default') {
		colors = variantColorMap[variant];
	}

	// Special handling for priority type
	if (type === 'priority') {
		const priorityLevel = value.toLowerCase() as 'high' | 'medium' | 'low';

		if (MetadataTheme.colors.priority[priorityLevel]) {
			colors = MetadataTheme.colors.priority[priorityLevel];
		}
	}

	const isClickable = !!onClick;
	const isRemovable = !!onRemove;

	const BadgeContent = (
		<div
			className={cn(
				'inline-flex items-center font-medium gap-2',
				'border',
				MetadataTheme.borderRadius.badge,
				MetadataTheme.backdrop.sm,
				MetadataTheme.animation.transition.normal,
				MetadataTheme.spacing.badge[size],
				MetadataTheme.typography.badge[size],
				colors.bg,
				colors.text,
				colors.border,
				isClickable && [
					'cursor-pointer',
					colors.hover,
					MetadataTheme.animation.hover.scale,
					MetadataTheme.animation.click.scale,
				],
				className
			)}
			onClick={() => onClick?.(value)}
		>
			{/* Icon */}
			{Icon && <Icon className={cn(getIconSize(size), 'flex-shrink-0')} />}

			{/* Special prefix for tags */}
			{type === 'tag' && <span className='opacity-60'>#</span>}

			{/* Value */}
			<span className='truncate max-w-[150px]'>{value}</span>

			{/* Remove button */}
			{isRemovable && (
				<button
					onClick={(e) => {
						e.stopPropagation();
						onRemove(value);
					}}
					className='ml-1 opacity-60 hover:opacity-100 transition-opacity flex-shrink-0'
					aria-label={`Remove ${type} ${value}`}
				>
					<svg
						className={cn(getIconSize(size))}
						fill='none'
						strokeWidth='2'
						stroke='currentColor'
						viewBox='0 0 24 24'
					>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							d='M6 18L18 6M6 6l12 12'
						/>
					</svg>
				</button>
			)}
		</div>
	);

	if (!animated) {
		return BadgeContent;
	}

	return (
		<motion.div
			{...MetadataTheme.animation.entry.scaleIn}
			whileHover={{ scale: 1.02 }}
			whileTap={{ scale: 0.98 }}
			transition={{ duration: 0.2, ease: 'easeOut' }}
			className='inline-flex'
		>
			{BadgeContent}
		</motion.div>
	);
};

export const MetadataBadge = memo(MetadataBadgeComponent);
MetadataBadge.displayName = 'MetadataBadge';
