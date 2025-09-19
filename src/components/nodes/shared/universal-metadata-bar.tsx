'use client';

import { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import { 
	Calendar, 
	Flag, 
	Hash, 
	User, 
	Clock,
	AlertCircle,
	CheckCircle2,
	Circle,
	ChevronRight
} from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface UniversalMetadataBarProps {
	metadata?: NodeData['metadata'];
	nodeType: string;
	selected?: boolean;
	className?: string;
	onMetadataClick?: (type: string, value: any) => void;
}

// Priority levels with Material Design color system - desaturated for dark theme
const priorityConfig = {
	critical: {
		color: 'rgba(239, 68, 68, 0.87)', // Red
		bgColor: 'rgba(239, 68, 68, 0.1)',
		borderColor: 'rgba(239, 68, 68, 0.2)',
		icon: AlertCircle,
		label: 'Critical'
	},
	high: {
		color: 'rgba(251, 146, 60, 0.87)', // Orange
		bgColor: 'rgba(251, 146, 60, 0.1)',
		borderColor: 'rgba(251, 146, 60, 0.2)',
		icon: Flag,
		label: 'High'
	},
	medium: {
		color: 'rgba(251, 191, 36, 0.87)', // Amber
		bgColor: 'rgba(251, 191, 36, 0.1)',
		borderColor: 'rgba(251, 191, 36, 0.2)',
		icon: Flag,
		label: 'Medium'
	},
	low: {
		color: 'rgba(147, 197, 253, 0.87)', // Blue
		bgColor: 'rgba(147, 197, 253, 0.1)',
		borderColor: 'rgba(147, 197, 253, 0.2)',
		icon: Flag,
		label: 'Low'
	},
	default: {
		color: 'rgba(255, 255, 255, 0.38)',
		bgColor: 'rgba(255, 255, 255, 0.05)',
		borderColor: 'rgba(255, 255, 255, 0.1)',
		icon: Circle,
		label: 'Normal'
	}
};

// Status configuration with semantic colors
const statusConfig = {
	completed: {
		color: 'rgba(52, 211, 153, 0.87)',
		icon: CheckCircle2,
	},
	'in-progress': {
		color: 'rgba(147, 197, 253, 0.87)',
		icon: Clock,
	},
	pending: {
		color: 'rgba(251, 191, 36, 0.87)',
		icon: Circle,
	},
	blocked: {
		color: 'rgba(239, 68, 68, 0.87)',
		icon: AlertCircle,
	}
};

/**
 * Metadata Badge Component
 * 
 * This component creates individual badges for metadata items, following our established
 * dark theme principles. Each badge uses subtle backgrounds with controlled opacity
 * to maintain readability without overwhelming the interface.
 */
const MetadataBadge = memo<{
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	value?: string;
	color?: string;
	bgColor?: string;
	borderColor?: string;
	onClick?: () => void;
	size?: 'xs' | 'sm' | 'md';
}>(({ icon: Icon, label, value, color, bgColor, borderColor, onClick, size = 'sm' }) => {
	const [isHovered, setIsHovered] = useState(false);

	// Size configurations for responsive display
	const sizeClasses = {
		xs: 'px-1.5 py-0.5 text-[10px] gap-1',
		sm: 'px-2 py-0.5 text-[11px] gap-1.5',
		md: 'px-2.5 py-1 text-xs gap-2'
	};

	const iconSizes = {
		xs: 'w-2.5 h-2.5',
		sm: 'w-3 h-3',
		md: 'w-3.5 h-3.5'
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
			<Icon className={iconSizes[size]} style={{ 
				color: color || 'rgba(255, 255, 255, 0.6)',
				opacity: isHovered ? 1 : 0.8
			}} />

			<span style={{ 
				fontWeight: 500,
				letterSpacing: '0.01em'
			}}>
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
});

MetadataBadge.displayName = 'MetadataBadge';

/**
 * Tags Component
 * 
 * Displays tags with a collapsible design for when there are many tags.
 * Uses subtle coloring to maintain visual hierarchy without distraction.
 */
const NodeTags = memo<{
	tags: string[];
	maxVisible?: number;
	onTagClick?: (tag: string) => void;
}>(({ tags, maxVisible = 3, onTagClick }) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const hasMore = tags.length > maxVisible;
	const visibleTags = isExpanded ? tags : tags.slice(0, maxVisible);

	return (
		<div className='flex items-center gap-1'>
			<AnimatePresence mode='popLayout'>
				{visibleTags.map((tag, index) => (
					<motion.span
						key={tag}
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.8 }}
						transition={{ 
							duration: 0.2,
							delay: index * 0.03 
						}}
						className='px-2 py-0.5 rounded-full cursor-pointer'
						style={{
							fontSize: '11px',
							backgroundColor: 'rgba(167, 139, 250, 0.1)',
							border: '1px solid rgba(167, 139, 250, 0.2)',
							color: 'rgba(167, 139, 250, 0.87)',
						}}
						onClick={() => onTagClick?.(tag)}
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
					>
						#{tag}
					</motion.span>
				))}
			</AnimatePresence>
			
			{hasMore && (
				<motion.button
					className='px-1.5 py-0.5 rounded-full flex items-center gap-0.5'
					style={{
						fontSize: '11px',
						backgroundColor: 'rgba(255, 255, 255, 0.05)',
						border: '1px solid rgba(255, 255, 255, 0.1)',
						color: 'rgba(255, 255, 255, 0.6)',
					}}
					onClick={() => setIsExpanded(!isExpanded)}
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
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

/**
 * Universal Metadata Bar Component
 * 
 * This component orchestrates the display of all metadata in a cohesive, scannable format.
 * It adapts based on the node type and selection state, showing more detail when a node
 * is selected and minimal information when not.
 */
export const UniversalMetadataBar = memo<UniversalMetadataBarProps>(({
	metadata,
	nodeType,
	selected = false,
	className,
	onMetadataClick
}) => {
	// Determine what metadata to show based on availability and relevance
	const metadataItems = useMemo(() => {
		if (!metadata) return [];
		
		const items = [];

		// Priority indicator - always show if present
		if (metadata.priority) {
			const priorityLevel = metadata.priority.toLowerCase();
			const config = priorityConfig[priorityLevel as keyof typeof priorityConfig] || priorityConfig.default;
			items.push({
				type: 'priority',
				component: (
					<MetadataBadge
						key='priority'
						icon={config.icon}
						label={config.label}
						color={config.color}
						bgColor={config.bgColor}
						borderColor={config.borderColor}
						onClick={() => onMetadataClick?.('priority', metadata.priority)}
						size={'xs'}
					/>
				),
				order: 1
			});
		}

		// Status indicator
		if (metadata.status) {
			const statusKey = metadata.status.toLowerCase().replace(' ', '-');
			const config = statusConfig[statusKey as keyof typeof statusConfig];

			if (config) {
				items.push({
					type: 'status',
					component: (
						<MetadataBadge
							key='status'
							icon={config.icon}
							label={metadata.status}
							color={config.color}
							bgColor={`${config.color.replace('0.87', '0.1')}`}
							borderColor={`${config.color.replace('0.87', '0.2')}`}
							onClick={() => onMetadataClick?.('status', metadata.status)}
							size={'xs'}
						/>
					),
					order: 2
				});
			}
		}

		// Assignee - show avatar or initials
		if (metadata.assignee) {
			const assigneeString = Array.isArray(metadata.assignee) 
				? metadata.assignee[0] 
				: metadata.assignee;
			
			items.push({
				type: 'assignee',
				component: (
					<MetadataBadge
						key='assignee'
						icon={User}
						label={assigneeString}
						onClick={() => onMetadataClick?.('assignee', metadata.assignee)}
						size={ 'xs'}
					/>
				),
				order: 3
			});
		}

		// Due date with smart formatting
		if (metadata.dueDate) {
			const date = new Date(metadata.dueDate);
			const today = new Date();
			const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
			
			let dateLabel = date.toLocaleDateString();
			let dateColor = 'rgba(255, 255, 255, 0.6)';
			
			if (diffDays < 0) {
				dateLabel = 'Overdue';
				dateColor = 'rgba(239, 68, 68, 0.87)';
			} else if (diffDays === 0) {
				dateLabel = 'Today';
				dateColor = 'rgba(251, 191, 36, 0.87)';
			} else if (diffDays === 1) {
				dateLabel = 'Tomorrow';
				dateColor = 'rgba(251, 191, 36, 0.87)';
			} else if (diffDays <= 7) {
				dateLabel = `${diffDays} days`;
				dateColor = 'rgba(147, 197, 253, 0.87)';
			}

			items.push({
				type: 'dueDate',
				component: (
					<MetadataBadge
						key='dueDate'
						icon={Calendar}
						label={dateLabel}
						color={dateColor}
						bgColor={`${dateColor.replace('0.87', '0.1')}`}
						borderColor={`${dateColor.replace('0.87', '0.2')}`}
						onClick={() => onMetadataClick?.('dueDate', metadata.dueDate)}
						size={'xs'}
					/>
				),
				order: 4
			});
		}

		// Tags - show inline with expandable behavior
		if (metadata.tags && metadata.tags.length > 0) {
			items.push({
				type: 'tags',
				component: (
					<NodeTags
						key='tags'
						tags={metadata.tags}
						maxVisible={selected ? 5 : 2}
						onTagClick={(tag) => onMetadataClick?.('tag', tag)}
					/>
				),
				order: 5
			});
		}

		return items.sort((a, b) => a.order - b.order);
	}, [metadata, selected, onMetadataClick]);

	// Don't render if no metadata
	if (metadataItems.length === 0) return null;

	// Container styling adapts based on selection state
	const containerStyle: React.CSSProperties = {
		backgroundColor: 'transparent',
		borderBottom: 'none',
		transition: 'all 0.2s ease',
	};

	return (
		<motion.div
			className={cn(
				'flex flex-wrap items-center px-4 py-2',
				className
			)}
			style={{
				...containerStyle,
				gap: '6px', // 6px gap between metadata items as specified in Material Design
			}}
			initial={{ opacity: 0, height: 0 }}
			animate={{ opacity: 1, height: 'auto' }}
			exit={{ opacity: 0, height: 0 }}
			transition={{ duration: 0.2 }}
		>
			{metadataItems.map(item => item.component)}
		</motion.div>
	);
});

UniversalMetadataBar.displayName = 'UniversalMetadataBar';