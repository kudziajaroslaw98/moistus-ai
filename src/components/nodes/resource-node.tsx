'use client';

import useAppStore from '@/store/mind-map-store';
import { NodeData } from '@/types/node-data';
import { Node, NodeProps } from '@xyflow/react';
import {
	ArrowUpRight,
	Eye,
	EyeOff,
	FileText,
	Link as LinkIcon,
	RefreshCw,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { memo, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/shallow';
import { Button } from '../ui/button';
import { Toggle } from '../ui/toggle';
import { BaseNodeWrapper } from './base-node-wrapper';

type ResourceNodeProps = NodeProps<Node<NodeData>>;

const ResourceNodeComponent = (props: ResourceNodeProps) => {
	const { id, data } = props;

	const { updateNode } = useAppStore(
		useShallow((state) => ({
			updateNode: state.updateNode,
		}))
	);

	const [isRefreshing, setIsRefreshing] = useState(false);

	const resourceUrl = data.metadata?.url as string | undefined;
	const title = (data.metadata?.title as string) || data.content || 'Resource';
	const showThumbnail = Boolean(data.metadata?.showThumbnail);
	const showSummary = Boolean(data.metadata?.showSummary);
	const imageUrl = data.metadata?.imageUrl as string | undefined;
	const summary = data.metadata?.summary as string | undefined;

	const handleNodeChange = useCallback(
		(change: Partial<NodeData['metadata']>) => {
			updateNode({
				nodeId: id,
				data: {
					metadata: {
						...data.metadata,
						...change,
					},
				},
			});
		},
		[updateNode, id, data.metadata]
	);

	const handleOpenLink = useCallback(() => {
		if (resourceUrl) {
			window.open(resourceUrl, '_blank', 'noopener,noreferrer');
			toast.success('Opened link in new tab');
		} else {
			toast.error('No URL available');
		}
	}, [resourceUrl]);

	const handleRefreshMetadata = useCallback(async () => {
		if (!resourceUrl) {
			toast.error('No URL to refresh');
			return;
		}

		setIsRefreshing(true);

		try {
			// This would typically call an API to re-fetch metadata
			// For now, we'll just show a success message
			// You can implement the actual metadata fetching logic here
			await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

			toast.success('Metadata refreshed');
		} catch (error) {
			console.error('Failed to refresh metadata:', error);
			toast.error('Failed to refresh metadata');
		} finally {
			setIsRefreshing(false);
		}
	}, [resourceUrl]);

	const toolbarContent = useMemo(
		() => (
			<>
				{/* Thumbnail Toggle */}
				<Toggle
					size={'sm'}
					variant={'outline'}
					pressed={showThumbnail}
					onPressedChange={(pressed) => {
						handleNodeChange({ showThumbnail: pressed });
					}}
					title={showThumbnail ? 'Hide thumbnail' : 'Show thumbnail'}
				>
					{showThumbnail ? (
						<Eye className='w-4 h-4' />
					) : (
						<EyeOff className='w-4 h-4' />
					)}
				</Toggle>

				{/* Summary Toggle */}
				<Toggle
					size={'sm'}
					variant={'outline'}
					pressed={showSummary}
					onPressedChange={(pressed) => {
						handleNodeChange({ showSummary: pressed });
					}}
					title={showSummary ? 'Hide summary' : 'Show summary'}
				>
					<FileText className='w-4 h-4' />
				</Toggle>

				{/* Open Link Button */}
				{resourceUrl && (
					<Button
						onClick={handleOpenLink}
						size={'sm'}
						variant={'outline'}
						className='h-8 px-2'
						title='Open link in new tab'
					>
						<ArrowUpRight className='w-4 h-4' />
					</Button>
				)}

				{/* Refresh Metadata Button */}
				{resourceUrl && (
					<Button
						onClick={handleRefreshMetadata}
						size={'sm'}
						variant={'outline'}
						className='h-8 px-2'
						disabled={isRefreshing}
						title='Refresh metadata'
					>
						<RefreshCw
							className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
						/>
					</Button>
				)}
			</>
		),
		[
			showThumbnail,
			showSummary,
			resourceUrl,
			isRefreshing,
			handleNodeChange,
			handleOpenLink,
			handleRefreshMetadata,
		]
	);

	return (
		<BaseNodeWrapper
			{...props}
			nodeClassName='resource-node'
			nodeType='Resource'
			nodeIcon={<LinkIcon className='size-4' />}
			toolbarContent={toolbarContent}
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
					<div className='mt-4 flex flex-col gap-4'>
						<div className='text-center text-sm font-medium text-node-text-secondary w-full relative'>
							<hr className='bg-node-accent w-full h-0.5 border-0 top-1/2 left-0 absolute z-1' />

							<span className='relative px-4 py-1 font-lora font-semibold bg-node-accent rounded-md text-node-text-main z-10'>
								AI Summary
							</span>
						</div>

						<div className='text-left tracking-normal text-sm text-node-text-secondary'>
							{summary}
						</div>
					</div>
				)}
			</>
		</BaseNodeWrapper>
	);
};

const ResourceNode = memo(ResourceNodeComponent);
ResourceNode.displayName = 'ResourceNode';
export default ResourceNode;
