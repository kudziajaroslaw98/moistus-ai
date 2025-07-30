'use client';

import useAppStore from '@/store/mind-map-store';
import { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import { Node, NodeProps } from '@xyflow/react';
import {
	ArrowUpRight,
	Eye,
	EyeOff,
	Image as ImageIcon,
	RefreshCw,
} from 'lucide-react';
import Image from 'next/image';
import { memo, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/shallow';
import { Button } from '../ui/button';
import { Toggle } from '../ui/toggle';
import { BaseNodeWrapper } from './base-node-wrapper';

type ImageNodeProps = NodeProps<Node<NodeData>>;

const ImageNodeComponent = (props: ImageNodeProps) => {
	const { id, data } = props;

	const { updateNode } = useAppStore(
		useShallow((state) => ({
			updateNode: state.updateNode,
		}))
	);

	const [isRefreshing, setIsRefreshing] = useState(false);

	const imageUrl = data.metadata?.image_url as string | undefined;
	const showCaption = Boolean(data.metadata?.showCaption);

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

	const handleOpenImage = useCallback(() => {
		if (imageUrl) {
			window.open(imageUrl, '_blank', 'noopener,noreferrer');
			toast.success('Opened image in new tab');
		} else {
			toast.error('No image URL available');
		}
	}, [imageUrl]);

	const handleRefreshMetadata = useCallback(async () => {
		if (!imageUrl) {
			toast.error('No image URL to refresh');
			return;
		}

		setIsRefreshing(true);

		try {
			// This would typically call an API to re-fetch image metadata
			// For now, we'll just show a success message
			// You can implement the actual metadata fetching logic here
			await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

			toast.success('Image metadata refreshed');
		} catch (error) {
			console.error('Failed to refresh image metadata:', error);
			toast.error('Failed to refresh image metadata');
		} finally {
			setIsRefreshing(false);
		}
	}, [imageUrl]);

	const toolbarContent = useMemo(
		() => (
			<>
				{/* Caption Toggle */}
				<Toggle
					size={'sm'}
					variant={'outline'}
					pressed={showCaption}
					onPressedChange={(pressed) => {
						handleNodeChange({ showCaption: pressed });
					}}
					title={showCaption ? 'Hide caption' : 'Show caption'}
				>
					{showCaption ? (
						<Eye className='w-4 h-4' />
					) : (
						<EyeOff className='w-4 h-4' />
					)}
				</Toggle>

				{/* Open Image Button */}
				{imageUrl && (
					<Button
						onClick={handleOpenImage}
						size={'sm'}
						variant={'outline'}
						className='h-8 px-2'
						title='Open image in new tab'
					>
						<ArrowUpRight className='w-4 h-4' />
					</Button>
				)}

				{/* Refresh Metadata Button */}
				{imageUrl && (
					<Button
						onClick={handleRefreshMetadata}
						size={'sm'}
						variant={'outline'}
						className='h-8 px-2'
						disabled={isRefreshing}
						title='Refresh image metadata'
					>
						<RefreshCw
							className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
						/>
					</Button>
				)}
			</>
		),
		[
			showCaption,
			imageUrl,
			isRefreshing,
			handleNodeChange,
			handleOpenImage,
			handleRefreshMetadata,
		]
	);

	return (
		<BaseNodeWrapper
			{...props}
			nodeClassName={cn(['image-node h-full gap-0'])}
			nodeType='Image'
			nodeIcon={<ImageIcon className='size-4' />}
			includePadding={false}
			toolbarContent={toolbarContent}
		>
			<>
				{imageUrl ? (
					<div className='relative flex w-full h-full min-h-32 rounded-md'>
						<Image
							src={imageUrl}
							alt={data.content || 'Node Image'}
							className={cn([
								'nodrag pointer-events-none h-full w-full min-h-32 object-cover',
								showCaption ? 'rounded-t-md' : 'rounded-md',
							])}
							onClick={(e) => e.stopPropagation()}
							onError={(e) => {
								e.currentTarget.src =
									'https://placehold.co/200x120?text=Image+Error';
							}}
							placeholder='empty'
							loading='lazy'
							priority={false}
							fill={true}
						/>
					</div>
				) : (
					<div className='flex h-[50px] w-full items-center justify-center rounded-md bg-zinc-800 text-xs text-node-text-secondary'>
						No Image URL
					</div>
				)}

				{/* Content Area (for caption/description) - now display only */}
				{showCaption && (
					<div className='p-4 text-sm whitespace-pre-wrap text-node-text-secondary'>
						{data.content || (
							<span className='text-zinc-500 italic'>
								No caption added. Double click or click the menu to add one...
							</span>
						)}
					</div>
				)}
			</>
		</BaseNodeWrapper>
	);
};

const ImageNode = memo(ImageNodeComponent);
ImageNode.displayName = 'ImageNode';
export default ImageNode;
