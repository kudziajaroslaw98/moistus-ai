// src/components/nodes/reference-node.tsx (New File)
'use client';

import { NodeData } from '@/types/node-data';
import { Node, NodeProps } from '@xyflow/react';
import { ArrowUpRight, BookMarked } from 'lucide-react';
import Link from 'next/link';
import { memo } from 'react';
import { BaseNodeWrapper } from './base-node-wrapper';

type ReferenceNodeProps = NodeProps<Node<NodeData>>;

const ReferenceNodeComponent = (props: ReferenceNodeProps) => {
	const { data } = props;

	const { targetMapId, targetNodeId, targetMapTitle, contentSnippet } =
		data.metadata || {};

	const hasValidReference = targetMapId && targetNodeId;
	const referenceUrl = hasValidReference
		? `/mind-map/${targetMapId}?node=${targetNodeId}`
		: '#';

	return (
		<BaseNodeWrapper
			{...props}
			nodeClassName='reference-node'
			nodeType='Reference'
			nodeIcon={<BookMarked className='size-4' />}
			includePadding={false}
		>
			<div className='flex flex-col h-full'>
				<div className='p-4 flex-grow'>
					{hasValidReference ? (
						<>
							<blockquote className='mt-2 border-l-2 border-zinc-600 pl-4 italic text-zinc-400'>
								&quot;{contentSnippet || 'Referenced content...'}&quot;
							</blockquote>

							<div className='mt-3 text-xs text-zinc-500'>
								<span>From: </span>

								<span className='font-medium text-zinc-400'>
									{targetMapTitle || 'Another Map'}
								</span>
							</div>
						</>
					) : (
						<div className='text-zinc-500 italic text-center py-4'>
							Invalid reference. Please edit.
						</div>
					)}
				</div>

				{hasValidReference && (
					<Link
						href={referenceUrl}
						target='_blank'
						rel='noopener noreferrer'
						className='nodrag block bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors text-zinc-300 p-2 text-xs font-medium rounded-b-sm'
					>
						<div className='flex items-center justify-center gap-2'>
							<span>Go to Reference</span>

							<ArrowUpRight className='size-3' />
						</div>
					</Link>
				)}
			</div>
		</BaseNodeWrapper>
	);
};

const ReferenceNode = memo(ReferenceNodeComponent);
ReferenceNode.displayName = 'ReferenceNode';
export default ReferenceNode;
