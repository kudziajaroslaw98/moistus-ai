'use client';

import { NodeData } from '@/types/node-data';
import { Node, NodeProps } from '@xyflow/react';
import { ArrowUpRight, Link as LinkIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { memo } from 'react';
import { Button } from '../ui/button';
import { BaseNodeWrapper } from './base-node-wrapper';

type ResourceNodeProps = NodeProps<Node<NodeData>>;

const ResourceNodeComponent = (props: ResourceNodeProps) => {
	const { id, data } = props;

	const resourceUrl = data.metadata?.url as string | undefined;
	const title = (data.metadata?.title as string) || data.content || 'Resource';
	const showThumbnail = Boolean(data.metadata?.showThumbnail);
	const showSummary = Boolean(data.metadata?.showSummary);
	const imageUrl = data.metadata?.imageUrl as string | undefined;
	const summary = data.metadata?.summary as string | undefined;

	return (
		<BaseNodeWrapper
			{...props}
			nodeClassName='resource-node'
			nodeType='Resource'
			nodeIcon={<LinkIcon className='size-4' />}
		>
			<>
				{showThumbnail && imageUrl && (
					<div className='pointer-events-none relative flex w-full justify-center aspect-16/9  '>
						<Image
							src={imageUrl}
							alt={title}
							className='nodrag rounded-md object-contain shadow-md'
							onError={(e) => {
								e.currentTarget.src =
									'https://placehold.co/200x120?text=Image+Error';
							}}
							loading='lazy'
							fill={true}
							unoptimized={true}
						/>
					</div>
				)}

				{title && (
					<div className='flex text-lg font-bold text-node-text-main tracking-tight leading-5'>
						<span className='float-left'>{title}</span>

						{resourceUrl && (
							<Link
								href={resourceUrl}
								target='_blank'
								rel='noopener noreferrer'
								className='cursor-pointer'
							>
								<Button
									variant={'ghost'}
									className='float-right p-2 rounded-md !size-12'
								>
									<ArrowUpRight className='size-10 text-node-accent' />
								</Button>
							</Link>
						)}
					</div>
				)}

				{/* Description/Content if different from title */}
				{data.content && data.content !== title && (
					<div className='text-node-text-secondary tracking-tight'>
						{data.content}
					</div>
				)}

				{/* Display URL in a truncated format */}
				{resourceUrl && (
					<div
						className='truncate text-sm text-node-accent tracking-tight'
						title={resourceUrl}
					>
						{resourceUrl.length > 40
							? resourceUrl.substring(0, 40) + '...'
							: resourceUrl}
					</div>
				)}

				{showSummary && summary && (
					<div className='text-center text-sm font-medium text-node-text-secondary w-full relative'>
						<hr className='bg-node-accent w-full h-0.5 border-0 top-1/2 left-0 absolute z-1' />

						<span className='relative px-4 py-1 font-lora font-semibold bg-node-accent rounded-md text-node-text-main z-10'>
							AI Summary
						</span>
					</div>
				)}

				{/* Summary if enabled and available */}
				{showSummary && summary && (
					<div className='text-left tracking-normal text-sm text-node-text-secondary'>
						{summary}
					</div>
				)}
			</>
		</BaseNodeWrapper>
	);
};

const ResourceNode = memo(ResourceNodeComponent);
ResourceNode.displayName = 'ResourceNode';
export default ResourceNode;
