'use client';

import type { AppNode } from '@/types/app-node';
import type { AvailableNodeTypes } from '@/registry/node-registry';
import { motion } from 'motion/react';
import { getNodeTypeIcon } from '../core/config/node-type-config';

interface ParentNodeReferenceProps {
	parentNode: AppNode;
}

/**
 * Extracts a truncated plain-text snippet from node content
 * Strips HTML tags and limits to 25 characters
 */
const getContentSnippet = (content: string | null | undefined): string => {
	if (!content) return 'Untitled node';
	// Strip HTML tags for plain text display
	const text = content.replace(/<[^>]*>/g, '').trim();
	return text.length > 25 ? text.slice(0, 25) + '...' : text || 'Untitled node';
};

/**
 * Displays a reference to the parent node when creating a child node
 * Shows parent's type icon and truncated content for quick context
 */
export const ParentNodeReference: React.FC<ParentNodeReferenceProps> = ({
	parentNode,
}) => {
	// Get parent node type configuration for icon
	const nodeType = (parentNode.data?.node_type ||
		'defaultNode') as AvailableNodeTypes;
	const ParentIcon = getNodeTypeIcon(nodeType);

	const parentContent = getContentSnippet(parentNode.data?.content);
	const fullContent = parentNode.data?.content?.replace(/<[^>]*>/g, '').trim();

	return (
		<motion.div
			initial={{ opacity: 0, y: -8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				duration: 0.2,
				delay: 0.3,
				ease: [0.215, 0.61, 0.355, 1], // ease-out-cubic
			}}
			className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-md"
			style={{
				backgroundColor: 'rgba(255, 255, 255, 0.03)',
				border: '1px solid rgba(255, 255, 255, 0.06)',
			}}
		>
			{/* Parent type icon */}
			<ParentIcon
				className="w-3.5 h-3.5 shrink-0"
				style={{ color: 'rgba(255, 255, 255, 0.38)' }}
			/>

			{/* Label */}
			<span
				className="text-xs shrink-0"
				style={{ color: 'rgba(255, 255, 255, 0.38)' }}
			>
				Adding to:
			</span>

			{/* Parent content snippet */}
			<span
				className="text-xs font-medium truncate"
				style={{ color: 'rgba(255, 255, 255, 0.6)' }}
				title={fullContent} // Full content on hover
			>
				{parentContent}
			</span>
		</motion.div>
	);
};
