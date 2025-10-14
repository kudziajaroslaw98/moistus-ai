'use client';

import { cn } from '@/utils/cn';
import { Image as ImageIcon, ImageOff, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Image from 'next/image';
import { memo, useState } from 'react';
import { BaseNodeWrapper } from './base-node-wrapper';
import { type TypedNodeProps } from './core/types';
import { GlassmorphismTheme } from './themes/glassmorphism-theme';

type ImageNodeProps = TypedNodeProps<'imageNode'>;

const ImageNodeComponent = (props: ImageNodeProps) => {
	const { data } = props;
	const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>(
		'loading'
	);
	const [aspectRatio, setAspectRatio] = useState<number>(16 / 9); // Default aspect ratio

	const imageUrl = (data.metadata?.image_url || data.metadata?.imageUrl) as
		| string
		| undefined;
	const showCaption = Boolean(data.metadata?.showCaption);
	const fitMode =
		(data.metadata?.fitMode as 'cover' | 'contain' | 'fill') || 'cover';
	const altText = (data.metadata?.altText as string) || data.content || 'Image';

	const handleImageLoad = (event: any) => {
		const img = event.target;

		if (img.naturalWidth && img.naturalHeight) {
			setAspectRatio(img.naturalWidth / img.naturalHeight);
		}

		setImageState('loaded');
	};

	return (
		<BaseNodeWrapper
			{...props}
			hideNodeType
			elevation={1}
			includePadding={false}
			nodeClassName={cn(['image-node h-full'])}
			nodeIcon={<ImageIcon className='size-4' />}
			nodeType='Image'
		>
			<div className='flex flex-col h-full'>
				{imageUrl ? (
					<div
						className='relative w-full h-full overflow-hidden rounded-lg'
						style={{
							// Dynamic aspect ratio based on image or fallback to 16:9
							aspectRatio: data.metadata?.aspectRatio || aspectRatio,
							backgroundColor: GlassmorphismTheme.elevation[0],
							minHeight: '120px',
							maxHeight: '400px',
						}}
					>
						{/* Loading state with elegant skeleton */}
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

						{/* Error state with helpful feedback */}
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
								<ImageOff
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

								<span
									style={{
										fontSize: '11px',
										color: GlassmorphismTheme.text.disabled,
										marginTop: '4px',
										wordBreak: 'break-all',
										textAlign: 'center',
										maxWidth: '200px',
									}}
								>
									{imageUrl.length > 50
										? imageUrl.substring(0, 50) + '...'
										: imageUrl}
								</span>
							</motion.div>
						) : (
							<>
								{/* Main image with smooth loading transition */}
								<Image
									alt={altText}
									fill={true}
									loading='lazy'
									placeholder='empty'
									priority={false}
									sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
									src={imageUrl}
									className={cn([
										'nodrag pointer-events-none transition-all duration-500',
										fitMode === 'contain' && 'object-contain',
										fitMode === 'cover' && 'object-cover',
										fitMode === 'fill' && 'object-fill',
									])}
									style={{
										opacity: imageState === 'loaded' ? 1 : 0,
										filter: imageState === 'loaded' ? 'none' : 'blur(8px)',
									}}
									onError={() => setImageState('error')}
									onLoad={handleImageLoad}
								/>

								{/* Image overlay gradient for better text readability when caption is shown */}
								{showCaption && imageState === 'loaded' && (
									<div
										className='absolute bottom-0 left-0 right-0 h-20 pointer-events-none'
										style={{
											background:
												'linear-gradient(to top, rgba(18, 18, 18, 0.9) 0%, transparent 100%)',
										}}
									/>
								)}

								{/* Image controls overlay on hover */}
								<motion.div
									className='absolute top-2 right-2 flex gap-2 opacity-0 hover:opacity-100 transition-opacity duration-200'
									initial={{ opacity: 0 }}
									whileHover={{ opacity: 1 }}
								>
									{/* View full size button */}
									<button
										className='p-1.5 rounded-md backdrop-blur-md'
										title='View full size'
										style={{
											backgroundColor: 'rgba(18, 18, 18, 0.8)',
											border: `1px solid ${GlassmorphismTheme.borders.hover}`,
										}}
										onClick={() => window.open(imageUrl, '_blank')}
									>
										<ImageIcon
											className='w-3.5 h-3.5'
											style={{ color: GlassmorphismTheme.text.high }}
										/>
									</button>
								</motion.div>
							</>
						)}

						{/* Loading progress bar */}
						<AnimatePresence>
							{imageState === 'loading' && (
								<motion.div
									animate={{ scaleX: 1 }}
									className='absolute bottom-0 left-0 right-0 h-0.5 origin-left'
									exit={{ opacity: 0 }}
									initial={{ scaleX: 0 }}
									transition={{ duration: 2, ease: 'linear' as const }}
									style={{
										backgroundColor:
											GlassmorphismTheme.indicators.progress.fill,
									}}
								/>
							)}
						</AnimatePresence>
					</div>
				) : (
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
				)}

				{/* Caption area with sophisticated typography */}
				{showCaption && (
					<div
						className='p-4'
						style={{
							backgroundColor: GlassmorphismTheme.elevation[1],
							borderTop: `1px solid ${GlassmorphismTheme.borders.default}`,
						}}
					>
						{data.content ? (
							<div>
								{/* Caption text */}
								<p
									style={{
										fontSize: '13px',
										color: GlassmorphismTheme.text.high,
										lineHeight: 1.6,
										letterSpacing: '0.01em',
										marginBottom: '4px',
									}}
								>
									{data.content}
								</p>

								{/* Image metadata if available */}
								{data.metadata?.photographer && (
									<span
										style={{
											fontSize: '11px',
											color: GlassmorphismTheme.text.disabled,
											fontStyle: 'italic',
										}}
									>
										Photo by {data.metadata.photographer}
									</span>
								)}
							</div>
						) : (
							<span
								style={{
									fontSize: '13px',
									color: GlassmorphismTheme.text.disabled,
									fontStyle: 'italic',
								}}
							>
								No caption added. Double click to add one...
							</span>
						)}

						{/* Image info bar */}
						{imageState === 'loaded' && data.metadata?.showInfo && (
							<div
								className='flex items-center gap-3 mt-3 pt-3'
								style={{
									borderTop: `1px solid ${GlassmorphismTheme.borders.default}`,
								}}
							>
								{data.metadata?.dimensions && (
									<span
										style={{
											fontSize: '11px',
											color: GlassmorphismTheme.text.disabled,
										}}
									>
										{data.metadata.dimensions}
									</span>
								)}

								{data.metadata?.fileSize && (
									<span
										style={{
											fontSize: '11px',
											color: GlassmorphismTheme.text.disabled,
										}}
									>
										{data.metadata.fileSize}
									</span>
								)}

								{data.metadata?.format && (
									<span
										style={{
											fontSize: '11px',
											color: GlassmorphismTheme.text.disabled,
											textTransform: 'uppercase',
										}}
									>
										{data.metadata.format}
									</span>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		</BaseNodeWrapper>
	);
};

const ImageNode = memo(ImageNodeComponent);
ImageNode.displayName = 'ImageNode';
export default ImageNode;
