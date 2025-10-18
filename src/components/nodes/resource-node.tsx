'use client';

import useAppStore from '@/store/mind-map-store';
import { ExternalLink, Globe, Link as LinkIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { memo, useCallback, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { BaseNodeWrapper } from './base-node-wrapper';
import { type TypedNodeProps } from './core/types';
import { GlassmorphismTheme } from './themes/glassmorphism-theme';

type ResourceNodeProps = TypedNodeProps<'resourceNode'>;

const ResourceNodeComponent = (props: ResourceNodeProps) => {
	const { id, data } = props;
	const [imageError, setImageError] = useState(false);
	const [imageLoading, setImageLoading] = useState(true);
	const containerRef = useRef<HTMLDivElement>(null);
	const updateNodeDimensions = useAppStore(
		(state) => state.updateNodeDimensions
	);

	// Helper to remeasure node dimensions after content changes
	const remeasureNode = useCallback(
		(width: number, height: number) => {
			if (!containerRef.current) return;

			// Find the node wrapper parent (the ref is attached there)
			const nodeWrapper = containerRef.current.closest('.react-flow__node');
			if (!nodeWrapper) return;

			const actualHeight = (nodeWrapper as HTMLElement).clientHeight;
			const actualWidth = (nodeWrapper as HTMLElement).offsetWidth;

			// Update dimensions immediately
			updateNodeDimensions(id, actualWidth, actualHeight, { width, height });
		},
		[id, updateNodeDimensions]
	);

	const resourceUrl = data.metadata?.url as string | undefined;
	const title = (data.metadata?.title as string) || data.content || 'Resource';
	const showThumbnail = Boolean(data.metadata?.showThumbnail);
	const showSummary = Boolean(data.metadata?.showSummary);
	const imageUrl = data.metadata?.imageUrl as string | undefined;
	const summary = data.metadata?.summary as string | undefined;

	// Extract domain for display
	const getDomain = (url: string) => {
		try {
			const domain = new URL(url).hostname;
			return domain.replace('www.', '');
		} catch {
			return 'link';
		}
	};

	return (
		<BaseNodeWrapper
			{...props}
			hideNodeType
			elevation={1}
			nodeClassName='resource-node'
			nodeIcon={<LinkIcon className='size-4' />}
			nodeType='Resource'
		>
			<div className='flex flex-col gap-3' ref={containerRef}>
				{/* Thumbnail with sophisticated loading states */}
				{showThumbnail && imageUrl && (
					<div
						className='relative w-full aspect-video rounded-md overflow-hidden'
						style={{
							backgroundColor: GlassmorphismTheme.elevation[0],
							border: `1px solid ${GlassmorphismTheme.borders.default}`,
						}}
					>
						{/* Loading skeleton */}
						<AnimatePresence>
							{imageLoading && !imageError && (
								<motion.div
									animate={{ opacity: 1 }}
									className='absolute inset-0 flex items-center justify-center'
									exit={{ opacity: 0 }}
									initial={{ opacity: 0 }}
								>
									<div
										className='w-full h-full animate-pulse'
										style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
									/>

									<Globe
										className='absolute w-8 h-8'
										style={{ color: 'rgba(255, 255, 255, 0.1)' }}
									/>
								</motion.div>
							)}
						</AnimatePresence>

						{!imageError ? (
							<Image
								alt={title}
								className='object-cover'
								loading='lazy'
								src={imageUrl}
								unoptimized={true}
								fill={
									data.metadata?.imageSize?.width === undefined ||
									data.metadata?.imageSize?.height === undefined
										? true
										: undefined
								}
								height={
									data.metadata?.imageSize?.height != undefined
										? data.metadata?.imageSize?.height
										: undefined
								}
								style={{
									opacity: imageLoading ? 0 : 1,
									transition: 'opacity 0.3s ease-out',
								}}
								width={
									data.metadata?.imageSize?.width !== undefined
										? data.metadata?.imageSize?.width
										: undefined
								}
								onError={() => {
									setImageError(true);
									setImageLoading(false);
								}}
								onLoad={(e) => {
									const height = e.currentTarget.naturalHeight;
									const width = e.currentTarget.naturalWidth;
									setImageLoading(false);
									// Remeasure after image loads (affects height)
									setTimeout(() => remeasureNode(width, height), 50);
								}}
							/>
						) : (
							<div
								className='absolute inset-0 flex items-center justify-center'
								style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
							>
								<div className='text-center'>
									<Globe
										className='w-8 h-8 mx-auto mb-2'
										style={{ color: 'rgba(255, 255, 255, 0.2)' }}
									/>

									<span
										style={{
											fontSize: '12px',
											color: GlassmorphismTheme.text.disabled,
										}}
									>
										Preview unavailable
									</span>
								</div>
							</div>
						)}
					</div>
				)}

				{/* Title and link section with refined layout */}
				<div className='flex items-start justify-between gap-3'>
					<div className='flex-1 min-w-0'>
						<h3
							style={{
								fontSize: '16px',
								fontWeight: 500,
								color: GlassmorphismTheme.text.high,
								lineHeight: 1.4,
								marginBottom: '4px',
								wordBreak: 'break-word',
							}}
						>
							{title}
						</h3>

						{/* Domain display with subtle styling */}
						{resourceUrl && (
							<div className='flex items-center gap-1.5'>
								<Globe
									className='w-3 h-3 flex-shrink-0'
									style={{ color: 'rgba(147, 197, 253, 0.6)' }}
								/>

								<span
									style={{
										fontSize: '12px',
										color: 'rgba(147, 197, 253, 0.6)',
										letterSpacing: '0.01em',
									}}
								>
									{getDomain(resourceUrl)}
								</span>
							</div>
						)}
					</div>

					{/* External link button with hover effects */}
					{resourceUrl && (
						<Link
							className='group'
							href={resourceUrl}
							rel='noopener noreferrer'
							target='_blank'
						>
							<Button
								className='p-2 rounded-md transition-all duration-200 hover:scale-110'
								variant={'ghost'}
								style={{
									backgroundColor: 'transparent',
									border: `1px solid ${GlassmorphismTheme.borders.default}`,
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor =
										'rgba(147, 197, 253, 0.1)';
									e.currentTarget.style.borderColor =
										'rgba(147, 197, 253, 0.3)';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor = 'transparent';
									e.currentTarget.style.borderColor =
										GlassmorphismTheme.borders.default;
								}}
							>
								<ExternalLink
									className='w-4 h-4'
									style={{ color: 'rgba(147, 197, 253, 0.87)' }}
								/>
							</Button>
						</Link>
					)}
				</div>

				{/* Description with proper emphasis */}
				{data.content && data.content !== title && (
					<p
						style={{
							fontSize: '14px',
							color: GlassmorphismTheme.text.medium,
							lineHeight: 1.6,
							letterSpacing: '0.01em',
						}}
					>
						{data.content}
					</p>
				)}

				{/* AI Summary section with elegant presentation */}
				<AnimatePresence>
					{showSummary && summary && (
						<motion.div
							animate={{ opacity: 1, height: 'auto' }}
							className='overflow-hidden'
							exit={{ opacity: 0, height: 0 }}
							initial={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.3 }}
							onAnimationComplete={() => {
								// Remeasure after animation completes
								remeasureNode();
							}}
						>
							{/* Divider with gradient */}
							<div className='relative py-2'>
								<div
									className='absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px]'
									style={{
										background:
											'linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.2) 30%, rgba(52, 211, 153, 0.2) 70%, transparent)',
									}}
								/>

								<div className='relative flex justify-center'>
									<span
										className='px-3 py-1 rounded-full text-xs font-medium'
										style={{
											backgroundColor: GlassmorphismTheme.elevation[1],
											border: `1px solid ${GlassmorphismTheme.indicators.status.complete}`,
											color: GlassmorphismTheme.indicators.status.complete,
											letterSpacing: '0.05em',
											textTransform: 'uppercase',
										}}
									>
										AI Summary
									</span>
								</div>
							</div>

							{/* Summary content in a subtle container */}
							<div
								className='p-3 rounded-md'
								style={{
									backgroundColor: 'rgba(52, 211, 153, 0.05)',
									border: `1px solid ${GlassmorphismTheme.indicators.status.complete}`,
								}}
							>
								<p
									style={{
										fontSize: '13px',
										color: GlassmorphismTheme.text.medium,
										lineHeight: 1.7,
										letterSpacing: '0.01em',
										margin: 0,
									}}
								>
									{summary}
								</p>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* URL display for debugging - only in development */}
				{process.env.NODE_ENV === 'development' && resourceUrl && (
					<div
						className='mt-2 p-2 rounded'
						style={{
							backgroundColor: 'rgba(255, 255, 255, 0.02)',
							border: `1px solid ${GlassmorphismTheme.borders.default}`,
						}}
					>
						<code
							style={{
								fontSize: '11px',
								color: GlassmorphismTheme.text.disabled,
								wordBreak: 'break-all',
								fontFamily: 'var(--font-geist-mono)',
							}}
						>
							{resourceUrl}
						</code>
					</div>
				)}
			</div>
		</BaseNodeWrapper>
	);
};

const ResourceNode = memo(ResourceNodeComponent);
ResourceNode.displayName = 'ResourceNode';
export default ResourceNode;
