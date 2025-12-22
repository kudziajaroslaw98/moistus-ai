'use client';

import { GlassmorphismTheme } from '@/components/nodes/themes/glassmorphism-theme';
import { NodeData } from '@/types/node-data';
import { getProxiedImageUrl } from '@/utils/image-proxy';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useState } from 'react';

interface ImageNodeContentProps {
	data: NodeData;
}

/**
 * Image Node Content - Image display with loading states
 * Extracted from: src/components/nodes/image-node.tsx
 */
const ImageNodeContentComponent = ({ data }: ImageNodeContentProps) => {
	const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>(
		'loading'
	);

	const rawImageUrl = (data.metadata?.imageUrl ||
		(data.metadata as Record<string, unknown>)?.image_url) as
		| string
		| undefined;
	const showCaption = Boolean(data.metadata?.showCaption);
	const imageUrl = getProxiedImageUrl(rawImageUrl);
	const altText =
		(data.metadata?.altText as string) || data.content || 'Image';

	if (!imageUrl) {
		return (
			<div
				className='flex h-32 w-full items-center justify-center rounded-lg'
				style={{
					backgroundColor: 'rgba(255, 255, 255, 0.02)',
					border: `1px dashed ${GlassmorphismTheme.borders.hover}`,
				}}
			>
				<div className='text-center'>
					<ImageIcon
						className='w-8 h-8 mx-auto mb-2'
						style={{ color: 'rgba(255, 255, 255, 0.2)' }}
					/>
					<span
						style={{
							fontSize: '12px',
							color: GlassmorphismTheme.text.disabled,
						}}
					>
						No image URL provided
					</span>
				</div>
			</div>
		);
	}

	return (
		<div className='flex flex-col h-full'>
			<div
				className='relative w-full overflow-hidden rounded-lg'
				style={{
					aspectRatio: '16/9',
					backgroundColor: GlassmorphismTheme.elevation[0],
					minHeight: '120px',
					maxHeight: '200px',
				}}
			>
				{/* Loading state */}
				<AnimatePresence>
					{imageState === 'loading' && (
						<motion.div
							animate={{ opacity: 1 }}
							className='absolute inset-0 flex items-center justify-center'
							exit={{ opacity: 0 }}
							initial={{ opacity: 0 }}
							style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}
						>
							<motion.div
								animate={{ rotate: 360 }}
								transition={{
									duration: 1.5,
									repeat: Infinity,
									ease: 'linear' as const,
								}}
							>
								<Loader2
									className='w-6 h-6'
									style={{ color: 'rgba(255, 255, 255, 0.2)' }}
								/>
							</motion.div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Error state */}
				{imageState === 'error' ? (
					<motion.div
						animate={{ opacity: 1, scale: 1 }}
						className='absolute inset-0 flex flex-col items-center justify-center p-4'
						initial={{ opacity: 0, scale: 0.95 }}
						style={{
							backgroundColor: 'rgba(239, 68, 68, 0.05)',
							border: `1px solid ${GlassmorphismTheme.indicators.status.error}`,
						}}
					>
						<ImageIcon
							className='w-8 h-8 mb-2'
							style={{ color: GlassmorphismTheme.indicators.status.error }}
						/>
						<span
							style={{
								fontSize: '13px',
								color: GlassmorphismTheme.text.medium,
								textAlign: 'center',
							}}
						>
							Unable to load image
						</span>
					</motion.div>
				) : (
					/* eslint-disable-next-line @next/next/no-img-element */
					<img
						alt={altText}
						loading='lazy'
						onError={() => setImageState('error')}
						onLoad={() => setImageState('loaded')}
						src={imageUrl}
						className='object-cover absolute inset-0 w-full h-full'
						style={{
							opacity: imageState === 'loaded' ? 1 : 0,
							filter: imageState === 'loaded' ? 'none' : 'blur(8px)',
							transition: 'opacity 0.3s ease-out, filter 0.3s ease-out',
						}}
					/>
				)}
			</div>

			{/* Caption area */}
			{showCaption && (
				<div
					className='p-3'
					style={{
						backgroundColor: GlassmorphismTheme.elevation[1],
						borderTop: `1px solid ${GlassmorphismTheme.borders.default}`,
					}}
				>
					{data.content ? (
						<p
							style={{
								fontSize: '13px',
								color: GlassmorphismTheme.text.high,
								lineHeight: 1.6,
								letterSpacing: '0.01em',
							}}
						>
							{data.content}
						</p>
					) : (
						<span
							style={{
								fontSize: '13px',
								color: GlassmorphismTheme.text.disabled,
								fontStyle: 'italic',
							}}
						>
							No caption
						</span>
					)}
				</div>
			)}
		</div>
	);
};

export const ImageNodeContent = memo(ImageNodeContentComponent);
ImageNodeContent.displayName = 'ImageNodeContent';
