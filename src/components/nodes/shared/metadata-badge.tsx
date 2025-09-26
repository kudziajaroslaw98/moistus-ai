import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { type ComponentType, type CSSProperties, memo, useState } from 'react';

/**
 * Metadata Badge Component
 *
 * This component creates individual badges for metadata items, following our established
 * dark theme principles. Each badge uses subtle backgrounds with controlled opacity
 * to maintain readability without overwhelming the interface.
 */

export const MetadataBadge = memo<{
	icon: ComponentType<{ className?: string; style: CSSProperties }>;
	label: string;
	value?: string;
	color?: string;
	bgColor?: string;
	borderColor?: string;
	onClick?: () => void;
	size?: 'xs' | 'sm' | 'md';
}>(
	({
		icon: Icon,
		label,
		value,
		color,
		bgColor,
		borderColor,
		onClick,
		size = 'sm',
	}) => {
		const [isHovered, setIsHovered] = useState(false);

		// Size configurations for responsive display
		const sizeClasses = {
			xs: 'px-1.5 py-0.5 text-[10px] gap-1',
			sm: 'px-2 py-0.5 text-[11px] gap-1.5',
			md: 'px-2.5 py-1 text-xs gap-2',
		};

		const iconSizes = {
			xs: 'w-2.5 h-2.5',
			sm: 'w-3 h-3',
			md: 'w-3.5 h-3.5',
		};

		return (
			<motion.button
				className={cn(
					'flex items-center rounded-md transition-all duration-200',
					sizeClasses[size],
					onClick && 'cursor-pointer'
				)}
				style={{
					backgroundColor: bgColor || 'rgba(255, 255, 255, 0.05)',
					border: `1px solid ${borderColor || 'rgba(255, 255, 255, 0.1)'}`,
					color: color || 'rgba(255, 255, 255, 0.6)',
				}}
				onClick={onClick}
				onHoverStart={() => setIsHovered(true)}
				onHoverEnd={() => setIsHovered(false)}
				whileHover={{ scale: 1.02 }}
				whileTap={onClick ? { scale: 0.98 } : {}}
			>
				<Icon
					className={iconSizes[size]}
					style={{
						color: color || 'rgba(255, 255, 255, 0.6)',
						opacity: isHovered ? 1 : 0.8,
					}}
				/>

				<span
					style={{
						fontWeight: 500,
						letterSpacing: '0.01em',
					}}
				>
					{label}
				</span>

				{value && (
					<>
						<span style={{ opacity: 0.5 }}>·</span>

						<span style={{ opacity: 0.87 }}>{value}</span>
					</>
				)}
			</motion.button>
		);
	}
);

MetadataBadge.displayName = 'MetadataBadge';
