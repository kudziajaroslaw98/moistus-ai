'use client';

import { ArrowUpRight, BookMarked } from 'lucide-react';
import Link from 'next/link';
import { memo } from 'react';
import { BaseNodeWrapper } from './base-node-wrapper';
import { type TypedNodeProps } from './core/types';
import { GlassmorphismTheme } from './themes/glassmorphism-theme';

type ReferenceNodeProps = TypedNodeProps<'referenceNode'>;

const ReferenceNodeComponent = (props: ReferenceNodeProps) => {
	const { data } = props;

	const { targetMapId, targetNodeId, targetMapTitle, contentSnippet } =
		data.metadata || {};

	const hasValidReference = targetMapId || targetNodeId;
	const referenceUrl = hasValidReference
		? targetMapId && targetNodeId
			? `/mind-map/${targetMapId}?node=${targetNodeId}`
			: targetMapId
				? `/mind-map/${targetMapId}`
				: '#'
		: '#';

	return (
		<BaseNodeWrapper
			{...props}
			nodeClassName='reference-node'
			nodeType='Reference'
			hideNodeType
			nodeIcon={<BookMarked className='size-4' />}
			includePadding={false}
		>
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
							Invalid reference. Please edit.
						</div>
					)}
				</div>

				{hasValidReference && (
					<Link
						href={referenceUrl}
						target='_blank'
						rel='noopener noreferrer'
						className='nodrag block transition-colors p-2 text-xs font-medium rounded-b-sm'
						style={{
							backgroundColor: `${GlassmorphismTheme.elevation[2]}80`,
							color: GlassmorphismTheme.text.medium,
						}}
						onMouseEnter={(e) => {
							e.currentTarget.style.backgroundColor = `${GlassmorphismTheme.elevation[4]}80`;
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.backgroundColor = `${GlassmorphismTheme.elevation[2]}80`;
						}}
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
