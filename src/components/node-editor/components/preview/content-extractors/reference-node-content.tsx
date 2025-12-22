'use client';

import { GlassmorphismTheme } from '@/components/nodes/themes/glassmorphism-theme';
import { NodeData } from '@/types/node-data';
import { ArrowUpRight } from 'lucide-react';
import { memo } from 'react';

interface ReferenceNodeContentProps {
	data: NodeData;
}

/**
 * Reference Node Content - Cross-reference display
 * Extracted from: src/components/nodes/reference-node.tsx
 */
const ReferenceNodeContentComponent = ({ data }: ReferenceNodeContentProps) => {
	const { targetMapId, targetNodeId, targetMapTitle, contentSnippet } =
		(data.metadata as {
			targetMapId?: string;
			targetNodeId?: string;
			targetMapTitle?: string;
			contentSnippet?: string;
		}) || {};

	const hasValidReference = targetMapId || targetNodeId;

	return (
		<div className='flex flex-col h-full'>
			<div className='p-4 flex-grow'>
				{hasValidReference ? (
					<>
						<blockquote
							className='mt-2 border-l-2 pl-4 italic'
							style={{
								borderColor: GlassmorphismTheme.borders.default,
								color: GlassmorphismTheme.text.medium,
							}}
						>
							&quot;{contentSnippet || data.content || 'Referenced content...'}&quot;
						</blockquote>

						<div
							className='mt-3 text-xs'
							style={{ color: GlassmorphismTheme.text.disabled }}
						>
							<span>From: </span>
							<span
								className='font-medium'
								style={{ color: GlassmorphismTheme.text.medium }}
							>
								{targetMapTitle || 'Another Map'}
							</span>
						</div>
					</>
				) : (
					<div
						className='italic text-center py-4'
						style={{ color: GlassmorphismTheme.text.disabled }}
					>
						No reference selected
					</div>
				)}
			</div>

			{hasValidReference && (
				<div
					className='flex items-center justify-center gap-2 p-2 text-xs font-medium rounded-b-sm'
					style={{
						backgroundColor: `${GlassmorphismTheme.elevation[2]}80`,
						color: GlassmorphismTheme.text.medium,
					}}
				>
					<span>Go to Reference</span>
					<ArrowUpRight className='size-3' />
				</div>
			)}
		</div>
	);
};

export const ReferenceNodeContent = memo(ReferenceNodeContentComponent);
ReferenceNodeContent.displayName = 'ReferenceNodeContent';
