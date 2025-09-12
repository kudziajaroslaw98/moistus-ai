'use client';

import { MetadataTheme } from '@/themes/metadata-theme';
import { cn } from '@/utils/cn';
import {
	AlertCircle,
	AlertTriangle,
	Calendar,
	CheckCircle,
	Clock,
	Flag,
	Hash,
	Info,
	Tag,
	User,
	XCircle,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useMemo } from 'react';
import { MetadataBadge } from './metadata-badge';
import { NodeTags } from './node-tabs';

export interface NodeMetadataProps {
	nodeId?: string;
	metadata: Record<string, any>;
	layout?: 'horizontal' | 'vertical' | 'grid';
	maxItems?: number;
	interactive?: boolean;
	className?: string;
	onMetadataClick?: (type: string, value: string) => void;
	onMetadataRemove?: (type: string, value: string) => void;
}

// Helper to determine metadata type and icon
const getMetadataTypeInfo = (key: string, value: any) => {
	// Tags - special handling as array
	if (key === 'tags' && Array.isArray(value)) {
		return { type: 'tags', icon: Tag };
	}

	// Priority
	if (key === 'priority' && ['low', 'medium', 'high'].includes(value)) {
		return { type: 'priority', icon: Flag, value };
	}

	// Status
	if (key === 'status') {
		return { type: 'status', icon: getStatusIcon(value), value };
	}

	// Dates
	if (
		key === 'dueDate' ||
		key === 'date' ||
		key === 'createdAt' ||
		key === 'updatedAt'
	) {
		const dateValue = value instanceof Date ? value : new Date(value);

		if (!isNaN(dateValue.getTime())) {
			return {
				type: 'date',
				icon: Calendar,
				value: dateValue.toLocaleDateString(),
			};
		}
	}

	// Assignee
	if (key === 'assignee' || key === 'author' || key === 'owner') {
		return {
			type: 'assignee',
			icon: User,
			value: value.startsWith('@') ? value : `@${value}`,
		};
	}

	// Importance (as number)
	if (key === 'importance' && typeof value === 'number') {
		return {
			type: 'custom',
			icon: getImportanceIcon(value),
			value: `Importance: ${value}`,
		};
	}

	// Boolean flags
	if (typeof value === 'boolean') {
		return {
			type: 'custom',
			icon: value ? CheckCircle : XCircle,
			value: `${key}: ${value ? 'Yes' : 'No'}`,
		};
	}

	// Default for other string/number values
	if (typeof value === 'string' || typeof value === 'number') {
		return {
			type: 'custom',
			icon: Hash,
			value: `${key}: ${value}`,
		};
	}

	return null;
};

// Get icon based on status value
const getStatusIcon = (status: string) => {
	const statusLower = status.toLowerCase();

	if (statusLower.includes('complete') || statusLower.includes('done')) {
		return CheckCircle;
	}

	if (statusLower.includes('progress') || statusLower.includes('active')) {
		return Clock;
	}

	if (statusLower.includes('pending') || statusLower.includes('wait')) {
		return AlertCircle;
	}

	if (statusLower.includes('error') || statusLower.includes('fail')) {
		return XCircle;
	}

	if (statusLower.includes('warn')) {
		return AlertTriangle;
	}

	return Info;
};

// Get icon based on importance level
const getImportanceIcon = (importance: number) => {
	if (importance >= 4) return AlertCircle;
	if (importance >= 3) return AlertTriangle;
	return Info;
};

const NodeMetadataComponent = ({
	nodeId,
	metadata,
	layout = 'horizontal',
	maxItems,
	interactive = false,
	className,
	onMetadataClick,
	onMetadataRemove,
}: NodeMetadataProps) => {
	// Process metadata into renderable items
	const metadataItems = useMemo(() => {
		const items: Array<{
			key: string;
			type: string;
			icon?: any;
			value: any;
			isArray?: boolean;
		}> = [];

		// Priority order for metadata keys
		const priorityOrder = [
			'priority',
			'status',
			'dueDate',
			'assignee',
			'tags',
			'importance',
		];

		// Sort keys by priority
		const sortedKeys = Object.keys(metadata).sort((a, b) => {
			const aIndex = priorityOrder.indexOf(a);
			const bIndex = priorityOrder.indexOf(b);
			if (aIndex === -1 && bIndex === -1) return 0;
			if (aIndex === -1) return 1;
			if (bIndex === -1) return -1;
			return aIndex - bIndex;
		});

		for (const key of sortedKeys) {
			const value = metadata[key];

			// Skip null, undefined, empty arrays, or internal metadata
			if (
				value == null ||
				(Array.isArray(value) && value.length === 0) ||
				key.startsWith('_') ||
				key === 'id' ||
				key === 'nodeId'
			) {
				continue;
			}

			const typeInfo = getMetadataTypeInfo(key, value);

			if (typeInfo) {
				items.push({
					key,
					...typeInfo,
					isArray: Array.isArray(value),
				});
			}
		}

		// Apply max items limit if specified
		if (maxItems && items.length > maxItems) {
			return items.slice(0, maxItems);
		}

		return items;
	}, [metadata, maxItems]);

	if (metadataItems.length === 0) {
		return null;
	}

	// Layout classes
	const layoutClasses = {
		horizontal: 'flex flex-wrap items-center',
		vertical: 'flex flex-col',
		grid: 'grid grid-cols-2 sm:grid-cols-3',
	};

	const gapClasses = {
		horizontal: MetadataTheme.spacing.container.normal,
		vertical: 'gap-1.5',
		grid: 'gap-2',
	};

	return (
		<div
			className={cn(
				layoutClasses[layout],
				gapClasses[layout],
				'w-full',
				className
			)}
		>
			<AnimatePresence mode='popLayout'>
				{metadataItems.map((item, index) => (
					<motion.div
						key={`${item.key}-${index}`}
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.8 }}
						transition={{
							duration: 0.2,
							delay: index * MetadataTheme.animation.stagger.fast,
						}}
						className={cn(
							layout === 'horizontal' && 'inline-flex',
							layout === 'vertical' && 'w-full'
						)}
					>
						{/* Special handling for tags */}
						{item.type === 'tags' && item.isArray ? (
							<NodeTags
								tags={metadata[item.key]}
								maxVisible={layout === 'horizontal' ? 3 : undefined}
								onTagClick={
									interactive && onMetadataClick
										? (tag) => onMetadataClick('tag', tag)
										: undefined
								}
								onTagRemove={
									interactive && onMetadataRemove
										? (tag) => onMetadataRemove('tag', tag)
										: undefined
								}
								editable={interactive}
								className={layout === 'vertical' ? 'w-full' : ''}
							/>
						) : (
							<MetadataBadge
								type={item.type as any}
								value={item.value}
								icon={item.icon}
								size='sm'
								onClick={
									interactive && onMetadataClick
										? (value) => onMetadataClick(item.type, value)
										: undefined
								}
								onRemove={
									interactive && onMetadataRemove
										? (value) => onMetadataRemove(item.type, value)
										: undefined
								}
								animated={false} // We handle animation at this level
							/>
						)}
					</motion.div>
				))}
			</AnimatePresence>

			{/* Show remaining count if items were truncated */}
			{maxItems && Object.keys(metadata).length > metadataItems.length && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className={cn(
						'inline-flex items-center',
						MetadataTheme.spacing.badge.sm,
						MetadataTheme.borderRadius.badge,
						'bg-zinc-500/10 text-zinc-400/60',
						MetadataTheme.typography.badge.sm,
						'border border-zinc-500/10'
					)}
				>
					+{Object.keys(metadata).length - metadataItems.length} more
				</motion.div>
			)}
		</div>
	);
};

export const NodeMetadata = memo(NodeMetadataComponent);
NodeMetadata.displayName = 'NodeMetadata';
