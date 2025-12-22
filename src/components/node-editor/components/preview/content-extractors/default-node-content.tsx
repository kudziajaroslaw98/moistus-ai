'use client';

import { MarkdownContent } from '@/components/nodes/content';
import { NodeData } from '@/types/node-data';
import { memo } from 'react';

interface DefaultNodeContentProps {
	data: NodeData;
}

/**
 * Default Node Content Adapter
 *
 * Thin wrapper that extracts markdown props from NodeData
 * and passes them to the shared MarkdownContent component.
 */
const DefaultNodeContentComponent = ({ data }: DefaultNodeContentProps) => {
	return (
		<MarkdownContent
			content={data.content}
			placeholder='Add content...'
		/>
	);
};

export const DefaultNodeContent = memo(DefaultNodeContentComponent);
DefaultNodeContent.displayName = 'DefaultNodeContent';
