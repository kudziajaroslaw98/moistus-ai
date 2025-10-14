import { ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useState } from 'react';
/**
 * Tags Component
 *
 * Displays tags with a collapsible design for when there are many tags.
 * Uses subtle coloring to maintain visual hierarchy without distraction.
 */
export const NodeTags = memo<{
	tags: string[];
	maxVisible?: number;
	onTagClick?: (tag: string) => void;
	accentColor?: string; // RGB values like "167, 139, 250"
}>(({ tags, maxVisible = 3, onTagClick, accentColor = '167, 139, 250' }) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const hasMore = tags.length > maxVisible;
	const visibleTags = isExpanded ? tags : tags.slice(0, maxVisible);

	return (
		<div className='flex items-center gap-1'>
			<AnimatePresence mode='popLayout'>
				{visibleTags.map((tag, index) => (
					<motion.span
						animate={{ opacity: 1, scale: 1 }}
						className='px-2 py-0.5 rounded-full cursor-pointer'
						exit={{ opacity: 0, scale: 0.8 }}
						initial={{ opacity: 0, scale: 0.8 }}
						key={tag}
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						style={{
							fontSize: '11px',
							backgroundColor: `rgba(${accentColor}, 0.1)`,
							border: `1px solid rgba(${accentColor}, 0.2)`,
							color: `rgba(${accentColor}, 0.87)`,
						}}
						transition={{
							duration: 0.2,
							delay: index * 0.03,
						}}
						onClick={() => onTagClick?.(tag)}
					>
						#{tag}
					</motion.span>
				))}
			</AnimatePresence>

			{hasMore && (
				<motion.button
					className='px-1.5 py-0.5 rounded-full flex items-center gap-0.5'
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					style={{
						fontSize: '11px',
						backgroundColor: 'rgba(255, 255, 255, 0.05)',
						border: '1px solid rgba(255, 255, 255, 0.1)',
						color: 'rgba(255, 255, 255, 0.6)',
					}}
					onClick={() => setIsExpanded(!isExpanded)}
				>
					<span>{isExpanded ? 'Less' : `+${tags.length - maxVisible}`}</span>

					<motion.div
						animate={{ rotate: isExpanded ? 90 : 0 }}
						transition={{ duration: 0.2 }}
					>
						<ChevronRight className='w-2.5 h-2.5' />
					</motion.div>
				</motion.button>
			)}
		</div>
	);
});

NodeTags.displayName = 'NodeTags';
