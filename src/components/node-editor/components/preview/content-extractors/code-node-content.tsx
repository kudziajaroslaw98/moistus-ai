'use client';

import { CodeContent } from '@/components/nodes/content/code-content';
import { NodeData } from '@/types/node-data';
import { memo } from 'react';

interface CodeNodeContentProps {
	data: NodeData;
}

/**
 * Code Node Content Adapter
 *
 * Thin wrapper that extracts code-specific props from NodeData
 * and passes them to the shared CodeContent component.
 */
const CodeNodeContentComponent = ({ data }: CodeNodeContentProps) => {
	return (
		<CodeContent
			code={data.content || ''}
			language={(data.metadata?.language as string) || 'javascript'}
			showLineNumbers={Boolean(data.metadata?.showLineNumbers ?? true)}
			fileName={data.metadata?.fileName as string | undefined}
			maxHeight='300px'
		/>
	);
};

export const CodeNodeContent = memo(CodeNodeContentComponent);
CodeNodeContent.displayName = 'CodeNodeContent';
