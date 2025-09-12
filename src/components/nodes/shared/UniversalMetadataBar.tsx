'use client';

import { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import { Calendar, Flag, Hash, User, Code2, FileText, Image as ImageIcon, Link2 } from 'lucide-react';
import { memo, useMemo } from 'react';
import { MetadataBadge } from './MetadataBadge';
import { NodeTags } from './NodeTags';

export interface UniversalMetadataBarProps {
	/** Node metadata to display */
	metadata?: NodeData['metadata'];
	/** Node type for contextual display */
	nodeType: string;
	/** Display mode configuration */
	displayMode?: 'compact' | 'normal' | 'expanded';
	/** Whether to show empty/undefined fields */
	showEmpty?: boolean;
	/** Custom className for styling */
	className?: string;
	/** Callback for metadata interactions */
	onMetadataClick?: (type: string, value: string) => void;
}

interface MetadataField {
	type: string;
	value: string;
	icon: React.ComponentType<{ className?: string }>;
	priority: number;
	isEmpty: boolean;
}

/**
 * Universal metadata bar that displays common metadata fields consistently across all node types
 * 
 * Displays: assignee, priority, due date, tags in a responsive, interactive format
 * Adapts display based on node type and user preferences
 */
export const UniversalMetadataBar = memo<UniversalMetadataBarProps>(({
	metadata,
	nodeType,
	displayMode = 'normal',
	showEmpty = false,
	className,
	onMetadataClick
}) => {
	// Extract and prioritize metadata fields
	const metadataFields = useMemo<MetadataField[]>(() => {
		if (!metadata) return [];

		const fields: MetadataField[] = [];

		// Assignee field
		if (metadata.assignee) {
			fields.push({
				type: 'assignee',
				value: Array.isArray(metadata.assignee) 
					? metadata.assignee.join(', ')
					: metadata.assignee,
				icon: User,
				priority: 1,
				isEmpty: false
			});
		}

		// Priority field
		if (metadata.priority) {
			fields.push({
				type: 'priority',
				value: metadata.priority,
				icon: Flag,
				priority: 2,
				isEmpty: false
			});
		}

		// Due date field
		if (metadata.dueDate) {
			const dateValue = typeof metadata.dueDate === 'string' 
				? metadata.dueDate 
				: metadata.dueDate.toString();
			
			// Format date for display
			let displayDate = dateValue;
			try {
				const date = new Date(dateValue);
				if (!isNaN(date.getTime())) {
					displayDate = date.toLocaleDateString();
				}
			} catch {
				// Use original string if parsing fails
			}

			fields.push({
				type: 'date',
				value: displayDate,
				icon: Calendar,
				priority: 3,
				isEmpty: false
			});
		}

		// Tags field (handled separately due to special rendering)
		
		// Status field (if present and different from priority)
		if (metadata.status && metadata.status !== metadata.priority) {
			fields.push({
				type: 'status',
				value: metadata.status,
				icon: Hash,
				priority: 4,
				isEmpty: false
			});
		}

		// Node-specific metadata fields
		// Code node specific fields
		if (nodeType === 'codeNode') {
			if (metadata.language) {
				fields.push({
					type: 'language',
					value: metadata.language,
					icon: Code2,
					priority: 5,
					isEmpty: false
				});
			}
			if (metadata.fileName) {
				fields.push({
					type: 'file',
					value: metadata.fileName,
					icon: FileText,
					priority: 6,
					isEmpty: false
				});
			}
		}

		// Resource node specific fields
		if (nodeType === 'resourceNode') {
			if (metadata.resourceType) {
				fields.push({
					type: 'type',
					value: metadata.resourceType,
					icon: Hash,
					priority: 5,
					isEmpty: false
				});
			}
			if (metadata.url) {
				fields.push({
					type: 'url',
					value: metadata.url,
					icon: Link2,
					priority: 6,
					isEmpty: false
				});
			}
		}

		// Image node specific fields
		if (nodeType === 'imageNode') {
			if (metadata.caption) {
				fields.push({
					type: 'caption',
					value: metadata.caption,
					icon: ImageIcon,
					priority: 5,
					isEmpty: false
				});
			}
			if (metadata.altText) {
				fields.push({
					type: 'alt',
					value: metadata.altText,
					icon: ImageIcon,
					priority: 6,
					isEmpty: false
				});
			}
		}

		// Sort by priority
		return fields.sort((a, b) => a.priority - b.priority);
	}, [metadata]);

	// Don't render if no metadata and not showing empty fields
	if (metadataFields.length === 0 && !metadata?.tags?.length && !showEmpty) {
		return null;
	}

	// Determine visibility based on display mode and node type
	const getFieldVisibility = (field: MetadataField): boolean => {
		// Always show non-empty fields
		if (!field.isEmpty) return true;
		
		// Only show empty fields if explicitly requested
		return showEmpty;
	};

	// Handle metadata interactions
	const handleMetadataClick = (type: string, value: string) => {
		onMetadataClick?.(type, value);
	};

	// Responsive class adjustments
	const containerClasses = cn(
		'flex flex-wrap items-center gap-2 p-2 rounded-md bg-zinc-900/30 border border-zinc-800',
		{
			'gap-1 p-1': displayMode === 'compact',
			'gap-3 p-3': displayMode === 'expanded',
		},
		className
	);

	const badgeSize = displayMode === 'compact' ? 'sm' : 'md';

	return (
		<div className={containerClasses}>
			{/* Standard metadata fields */}
			{metadataFields
				.filter(getFieldVisibility)
				.map((field) => (
					<MetadataBadge
						key={field.type}
						type={field.type as any}
						value={field.value}
						icon={field.icon}
						size={badgeSize}
						onClick={() => handleMetadataClick(field.type, field.value)}
						className="cursor-pointer hover:opacity-80 transition-opacity"
					/>
				))
			}

			{/* Tags (special rendering) */}
			{metadata?.tags && metadata.tags.length > 0 && (
				<NodeTags
					tags={metadata.tags}
					maxVisible={displayMode === 'compact' ? 2 : displayMode === 'expanded' ? 5 : 3}
					className="inline-flex"
					size={badgeSize}
					onTagClick={(tag) => handleMetadataClick('tag', tag)}
				/>
			)}

			{/* Empty state for expanded mode */}
			{showEmpty && metadataFields.length === 0 && !metadata?.tags?.length && (
				<div className="text-zinc-500 text-xs italic">
					No metadata available
				</div>
			)}
		</div>
	);
});

UniversalMetadataBar.displayName = 'UniversalMetadataBar';

/**
 * Hook for determining metadata relevance based on node type
 */
export const useMetadataRelevance = (nodeType: string) => {
	return useMemo(() => {
		const baseRelevance = {
			assignee: 0.8,
			priority: 0.9,
			dueDate: 0.7,
			tags: 0.6,
			status: 0.5,
		};

		// Adjust relevance based on node type
		switch (nodeType) {
			case 'taskNode':
				return {
					...baseRelevance,
					assignee: 1.0,
					priority: 1.0,
					dueDate: 1.0,
				};
			
			case 'defaultNode':
			case 'textNode':
				return {
					...baseRelevance,
					priority: 0.8,
					tags: 0.9,
				};
			
			case 'resourceNode':
				return {
					...baseRelevance,
					assignee: 0.6,
					tags: 0.8,
				};
			
			case 'codeNode':
				return {
					...baseRelevance,
					assignee: 0.9, // Code reviews often need assignment
					priority: 0.7,
				};
			
			default:
				return baseRelevance;
		}
	}, [nodeType]);
};

export default UniversalMetadataBar;