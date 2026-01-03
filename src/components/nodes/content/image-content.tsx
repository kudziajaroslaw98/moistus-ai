'use client';

import { cn } from '@/lib/utils';
import { Image as ImageIcon, ImageOff, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { memo, ReactNode, useCallback, useState } from 'react';
import { GlassmorphismTheme } from '../themes/glassmorphism-theme';

export type ImageLoadState = 'loading' | 'loaded' | 'error';

export interface ImageContentProps {
	/** Image URL (already proxied if needed) */
	imageUrl: string | undefined;
	/** Alt text for accessibility */
	altText?: string;
	/** Object fit mode */
	fitMode?: 'cover' | 'contain' | 'fill';
	/** Aspect ratio (CSS value like "16/9" or number) */
	aspectRatio?: string | number;
	/** Maximum height (CSS value) */
	maxHeight?: string;
	/** Minimum height (CSS value) */
	minHeight?: string;
	/** Raw URL to display in error state */
	rawUrlForError?: string;
	/** Called when image loads with natural dimensions */
	onLoad?: (event: { naturalWidth: number; naturalHeight: number }) => void;
	/** Additional class for container */
	className?: string;
	/** Content to render over the image (controls, export placeholder, etc.) */
	imageOverlay?: ReactNode;
	/** Whether to show loading progress bar at bottom */
	showLoadingBar?: boolean;
	/** Caption section */
	caption?: {
		content?: string;
		placeholder?: string;
		photographer?: string;
		showInfo?: boolean;
		infoItems?: Array<{ label: string; value: string }>;
	};
	/** Show caption gradient overlay on image */
	showCaptionGradient?: boolean;
}

/**
 * Image Content Component
 *
 * Pure rendering component for images with loading states.
 * Used by both canvas nodes and preview system.
 *
 * Features:
 * - Loading spinner with animation
 * - Error state with truncated URL
 * - Smooth fade-in on load
 * - Optional caption with photographer credit
 * - Slots for overlay content (controls, export placeholder)
 */
const ImageContentComponent = ({
	imageUrl,
	altText = 'Image',
	fitMode = 'cover',
	aspectRatio = '16/9',
	maxHeight = '400px',
	minHeight = '120px',
	rawUrlForError,
	onLoad,
	className,
	imageOverlay,
	showLoadingBar = false,
	caption,
	showCaptionGradient = false,
}: ImageContentProps) => {
	const [imageState, setImageState] = useState<ImageLoadState>('loading');

	const handleImageLoad = useCallback(
		(event: React.SyntheticEvent<HTMLImageElement>) => {
			const img = event.currentTarget;
			if (img.naturalWidth && img.naturalHeight) {
				onLoad?.({ naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
			}
			setImageState('loaded');
		},
		[onLoad]
	);

	// No URL placeholder
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

	const displayUrl = rawUrlForError || imageUrl;

	return (
		<div className={cn('flex flex-col h-full', className)}>
			{/* Image container */}
			<div
				className='relative w-full h-full overflow-hidden rounded-lg'
				style={{
					aspectRatio: typeof aspectRatio === 'number' ? aspectRatio : aspectRatio,
					backgroundColor: GlassmorphismTheme.elevation[0],
					minHeight,
					maxHeight,
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
						{displayUrl && (
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
								{displayUrl.length > 50 ? displayUrl.substring(0, 50) + '...' : displayUrl}
							</span>
						)}
					</motion.div>
				) : (
					<>
						{/* Main image */}
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							alt={altText}
							loading='lazy'
							onError={() => setImageState('error')}
							onLoad={handleImageLoad}
							src={imageUrl}
							className={cn([
								'nodrag pointer-events-none transition-all duration-500 absolute inset-0 w-full h-full',
								fitMode === 'contain' && 'object-contain',
								fitMode === 'cover' && 'object-cover',
								fitMode === 'fill' && 'object-fill',
							])}
							style={{
								opacity: imageState === 'loaded' ? 1 : 0,
								filter: imageState === 'loaded' ? 'none' : 'blur(8px)',
							}}
						/>

						{/* Caption gradient overlay */}
						{showCaptionGradient && imageState === 'loaded' && (
							<div
								className='absolute bottom-0 left-0 right-0 h-20 pointer-events-none'
								style={{
									background: 'linear-gradient(to top, rgba(18, 18, 18, 0.9) 0%, transparent 100%)',
								}}
							/>
						)}

						{/* Custom overlay content (controls, export placeholder) */}
						{imageOverlay}
					</>
				)}

				{/* Loading progress bar */}
				{showLoadingBar && (
					<AnimatePresence>
						{imageState === 'loading' && (
							<motion.div
								animate={{ scaleX: 1 }}
								className='absolute bottom-0 left-0 right-0 h-0.5 origin-left'
								exit={{ opacity: 0 }}
								initial={{ scaleX: 0 }}
								transition={{ duration: 2, ease: 'linear' as const }}
								style={{
									backgroundColor: GlassmorphismTheme.indicators.progress.fill,
								}}
							/>
						)}
					</AnimatePresence>
				)}
			</div>

			{/* Caption section */}
			{caption && (
				<div
					className='p-3'
					style={{
						backgroundColor: GlassmorphismTheme.elevation[1],
						borderTop: `1px solid ${GlassmorphismTheme.borders.default}`,
					}}
				>
					{caption.content ? (
						<div>
							<p
								style={{
									fontSize: '13px',
									color: GlassmorphismTheme.text.high,
									lineHeight: 1.6,
									letterSpacing: '0.01em',
									marginBottom: caption.photographer ? '4px' : 0,
								}}
							>
								{caption.content}
							</p>
							{caption.photographer && (
								<span
									style={{
										fontSize: '11px',
										color: GlassmorphismTheme.text.disabled,
										fontStyle: 'italic',
									}}
								>
									Photo by {caption.photographer}
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
							{caption.placeholder || 'No caption'}
						</span>
					)}

					{/* Image info items */}
					{caption.showInfo && caption.infoItems && caption.infoItems.length > 0 && (
						<div
							className='flex items-center gap-3 mt-3 pt-3'
							style={{
								borderTop: `1px solid ${GlassmorphismTheme.borders.default}`,
							}}
						>
							{caption.infoItems.map((item, index) => (
								<span
									key={index}
									style={{
										fontSize: '11px',
										color: GlassmorphismTheme.text.disabled,
									}}
								>
									{item.value}
								</span>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export const ImageContent = memo(ImageContentComponent);
ImageContent.displayName = 'ImageContent';
