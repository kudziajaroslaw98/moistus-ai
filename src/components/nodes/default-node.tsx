'use client';

import { cn } from '@/utils/cn';
import { FileText } from 'lucide-react';
import { memo } from 'react';
import { BaseNodeWrapper } from './base-node-wrapper';
import { MarkdownContent } from './content';
import { type TypedNodeProps } from './core/types';

type DefaultNodeProps = TypedNodeProps<'defaultNode'>;

/**
 * Default Node Component
 *
 * Renders markdown content with full formatting support.
 * Uses shared MarkdownContent from content/markdown-content.tsx
 */
const DefaultNodeComponent = (props: DefaultNodeProps) => {
	const { data } = props;

	return (
		<BaseNodeWrapper
			{...props}
			hideNodeType
			elevation={1}
			nodeClassName={cn(['basic-node h-full'])}
			nodeIcon={<FileText className='size-4' />}
			nodeType='Note'
		>
			<MarkdownContent
				content={data.content}
				placeholder='Click to add content...'
			/>
		</BaseNodeWrapper>
	);
};

const DefaultNode = memo(DefaultNodeComponent);
DefaultNode.displayName = 'DefaultNode';
export default DefaultNode;
