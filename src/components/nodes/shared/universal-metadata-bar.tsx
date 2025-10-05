'use client';

import { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import {
	AlertCircle,
	Calendar,
	CheckCircle2,
	Circle,
	Clock,
	Flag,
	User,
} from 'lucide-react';
import { motion } from 'motion/react';
import { CSSProperties, memo, useMemo } from 'react';
import { MetadataBadge } from './metadata-badge';
import { NodeTags } from './node-tags';

export interface UniversalMetadataBarProps {
	metadata?: NodeData['metadata'];
	nodeType: string;
	selected?: boolean;
	className?: string;
	onMetadataClick?: (type: string, value: any) => void;
	colorOverrides?: {
		accentColor?: string; // RGB values like "147, 197, 253"
		bgOpacity?: number;
		borderOpacity?: number;
	};
}

// Priority levels with Material Design color system - desaturated for dark theme
const priorityConfig = {
	critical: {
		color: 'rgba(239, 68, 68, 0.87)', // Red
		bgColor: 'rgba(239, 68, 68, 0.1)',
		borderColor: 'rgba(239, 68, 68, 0.2)',
		icon: AlertCircle,
		label: 'Critical',
	},
	high: {
		color: 'rgba(251, 146, 60, 0.87)', // Orange
		bgColor: 'rgba(251, 146, 60, 0.1)',
		borderColor: 'rgba(251, 146, 60, 0.2)',
		icon: Flag,
		label: 'High',
	},
	medium: {
		color: 'rgba(251, 191, 36, 0.87)', // Amber
		bgColor: 'rgba(251, 191, 36, 0.1)',
		borderColor: 'rgba(251, 191, 36, 0.2)',
		icon: Flag,
		label: 'Medium',
	},
	low: {
		color: 'rgba(147, 197, 253, 0.87)', // Blue
		bgColor: 'rgba(147, 197, 253, 0.1)',
		borderColor: 'rgba(147, 197, 253, 0.2)',
		icon: Flag,
		label: 'Low',
	},
	default: {
		color: 'rgba(255, 255, 255, 0.38)',
		bgColor: 'rgba(255, 255, 255, 0.05)',
		borderColor: 'rgba(255, 255, 255, 0.1)',
		icon: Circle,
		label: 'Normal',
	},
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
	},
};

/**
 * Universal Metadata Bar Component
 *
 * This component orchestrates the display of all metadata in a cohesive, scannable format.
 * It adapts based on the node type and selection state, showing more detail when a node
 * is selected and minimal information when not.
 */
export const UniversalMetadataBar = memo<UniversalMetadataBarProps>(
	({ metadata, nodeType, selected = false, className, onMetadataClick, colorOverrides }) => {
		// Determine what metadata to show based on availability and relevance
		const metadataItems = useMemo(() => {
			if (!metadata) return [];

			const items = [];

			// Priority indicator - always show if present
			if (metadata.priority) {
				const priorityLevel = metadata.priority.toLowerCase();
				const config =
					priorityConfig[priorityLevel as keyof typeof priorityConfig] ||
					priorityConfig.default;
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
					order: 1,
				});
			}

			// Status indicator
			if (metadata.status) {
				const statusKey = metadata.status.toLowerCase().replace(' ', '-');
				const config = statusConfig[statusKey as keyof typeof statusConfig];

				// Use config if found, otherwise use default styling for custom status values
				const statusColor = config?.color || 'rgba(168, 85, 247, 0.87)'; // Purple for custom
				const statusIcon = config?.icon || Circle;

				items.push({
					type: 'status',
					component: (
						<MetadataBadge
							key='status'
							icon={statusIcon}
							label={metadata.status}
							color={statusColor}
							bgColor={`${statusColor.replace('0.87', '0.1')}`}
							borderColor={`${statusColor.replace('0.87', '0.2')}`}
							onClick={() => onMetadataClick?.('status', metadata.status)}
							size={'xs'}
						/>
					),
					order: 2,
				});
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
							size={'xs'}
						/>
					),
					order: 3,
				});
			}

			// Due date with smart formatting
			if (metadata.dueDate) {
				const date = new Date(metadata.dueDate);
				const today = new Date();
				const diffDays = Math.ceil(
					(date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
				);

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
					order: 4,
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
							accentColor={colorOverrides?.accentColor}
						/>
					),
					order: 5,
				});
			}

			return items.sort((a, b) => a.order - b.order);
		}, [metadata, selected, onMetadataClick, colorOverrides]);

		// Don't render if no metadata
		if (metadataItems.length === 0) return null;

		// Container styling adapts based on selection state
		const containerStyle: CSSProperties = {
			backgroundColor: 'transparent',
			borderBottom: 'none',
			transition: 'all 0.2s ease',
		};

		return (
			<motion.div
				className={cn('flex flex-wrap items-center px-4 py-2', className)}
				style={{
					...containerStyle,
					gap: '6px', // 6px gap between metadata items as specified in Material Design
				}}
				initial={{ opacity: 0, height: 0 }}
				animate={{ opacity: 1, height: 'auto' }}
				exit={{ opacity: 0, height: 0 }}
				transition={{ duration: 0.2 }}
			>
				{metadataItems.map((item) => item.component)}
			</motion.div>
		);
	}
);

UniversalMetadataBar.displayName = 'UniversalMetadataBar';
