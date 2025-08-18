'use client';

import { MetadataTheme, getIconSize } from '@/themes/metadata-theme';
import { cn } from '@/utils/cn';
import { Tag } from 'lucide-react';
import { motion } from 'motion/react';
import { memo } from 'react';

export interface NodeTagsProps {
	tags: string[];
	maxVisible?: number;
	onTagClick?: (tag: string) => void;
	onTagRemove?: (tag: string) => void;
	editable?: boolean;
	className?: string;
}

const NodeTagsComponent = ({
	tags,
	maxVisible,
	onTagClick,
	onTagRemove,
	editable = false,
	className,
}: NodeTagsProps) => {
	if (!tags || tags.length === 0) {
		return null;
	}

	const visibleTags = maxVisible ? tags.slice(0, maxVisible) : tags;
	const remainingCount = maxVisible ? tags.length - maxVisible : 0;

	return (
		<div
			className={cn(
				'flex items-center gap-1.5 flex-wrap',
				'max-w-full overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent',
				className
			)}
		>
			{/* Tag icon indicator */}
			<Tag
				className={cn(
					getIconSize('sm'),
					MetadataTheme.colors.tag.icon,
					'opacity-60 flex-shrink-0'
				)}
			/>

			{/* Tag badges */}
			{visibleTags.map((tag, index) => (
				<motion.div
					key={`${tag}-${index}`}
					initial={{ opacity: 0, scale: 0.8, y: -4 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.8, y: -4 }}
					transition={{
						duration: 0.2,
						delay: index * 0.03,
						ease: 'easeOut',
					}}
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					className='flex-shrink-0'
				>
					<div
						className={cn(
							'inline-flex items-center gap-1',
							MetadataTheme.spacing.badge.sm,
							MetadataTheme.borderRadius.badge,
							MetadataTheme.colors.tag.bg,
							MetadataTheme.colors.tag.text,
							MetadataTheme.typography.badge.sm,
							'font-medium',
							'border',
							MetadataTheme.colors.tag.border,
							MetadataTheme.animation.transition.normal,
							onTagClick && ['cursor-pointer', MetadataTheme.colors.tag.hover],
							MetadataTheme.backdrop.sm
						)}
						onClick={() => onTagClick?.(tag)}
					>
						<span className='opacity-60'>#</span>

						<span>{tag}</span>

						{editable && onTagRemove && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									onTagRemove(tag);
								}}
								className='ml-1 opacity-60 hover:opacity-100 transition-opacity'
								aria-label={`Remove tag ${tag}`}
							>
								<svg
									className='w-3 h-3'
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
				</motion.div>
			))}

			{/* Remaining count indicator */}
			{remainingCount > 0 && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className={cn(
						'inline-flex items-center',
						MetadataTheme.spacing.badge.sm,
						MetadataTheme.borderRadius.badge,
						'bg-purple-500/10 text-purple-400/60',
						MetadataTheme.typography.badge.sm,
						'border border-purple-500/10'
					)}
				>
					+{remainingCount} more
				</motion.div>
			)}
		</div>
	);
};

export const NodeTags = memo(NodeTagsComponent);
NodeTags.displayName = 'NodeTags';
