'use client';

import { cn } from '@/utils/cn';
import { getProxiedImageUrl, isExternalImageUrl } from '@/utils/image-proxy';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Image from 'next/image';
import { memo, useCallback, useState } from 'react';
import { BaseNodeWrapper } from './base-node-wrapper';
import { ImageContent, type ImageLoadState } from './content/image-content';
import { type TypedNodeProps } from './core/types';
import { ExportImagePlaceholder } from './shared/export-image-placeholder';
import { GlassmorphismTheme } from './themes/glassmorphism-theme';

type ImageNodeProps = TypedNodeProps<'imageNode'>;

/**
 * Image Node Component
 *
 * Displays images with loading states and interactive features.
 * Uses shared ImageContent for external images, Next.js Image for internal.
 *
 * Features:
 * - Loading spinner and progress bar
 * - Error state with helpful feedback
 * - Export placeholder for external images
 * - View full size control on hover
 * - Caption with photographer credit
 * - Image info bar (dimensions, file size, format)
 */
const ImageNodeComponent = (props: ImageNodeProps) => {
	const { data } = props;
	const [imageState, setImageState] = useState<ImageLoadState>('loading');
	const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);

	const rawImageUrl = (data.metadata?.image_url || data.metadata?.imageUrl) as
		| string
		| undefined;
	const showCaption = Boolean(data.metadata?.showCaption);

	// Use proxy for external images to bypass CORS
	const imageUrl = getProxiedImageUrl(rawImageUrl);
	const needsExportPlaceholder = isExternalImageUrl(rawImageUrl);
	const fitMode =
		(data.metadata?.fitMode as 'cover' | 'contain' | 'fill') || 'cover';
	const altText = (data.metadata?.altText as string) || data.content || 'Image';

	const handleImageLoad = useCallback(
		(event: { naturalWidth: number; naturalHeight: number }) => {
			if (event.naturalWidth && event.naturalHeight) {
				setAspectRatio(event.naturalWidth / event.naturalHeight);
			}
			setImageState('loaded');
		},
		[]
	);

	// Build caption props
	const captionProps = showCaption
		? {
				content: data.content ?? undefined,
				placeholder: 'No caption added. Double click to add one...',
				photographer: data.metadata?.photographer as string | undefined,
				showInfo: Boolean(imageState === 'loaded' && data.metadata?.showInfo),
				infoItems: [
					data.metadata?.dimensions && { label: 'Dimensions', value: String(data.metadata.dimensions) },
					data.metadata?.fileSize && { label: 'Size', value: String(data.metadata.fileSize) },
					data.metadata?.format && { label: 'Format', value: String(data.metadata.format).toUpperCase() },
				].filter(Boolean) as Array<{ label: string; value: string }>,
			}
		: undefined;

	// Controls overlay for hover
	const controlsOverlay = imageState === 'loaded' && imageUrl && (
		<motion.div
			className='absolute top-2 right-2 flex gap-2 opacity-0 hover:opacity-100 transition-opacity duration-200'
			initial={{ opacity: 0 }}
			whileHover={{ opacity: 1 }}
		>
			<button
				className='p-1.5 rounded-md backdrop-blur-md'
				onClick={() => window.open(imageUrl, '_blank')}
				title='View full size'
				style={{
					backgroundColor: 'rgba(18, 18, 18, 0.8)',
					border: `1px solid ${GlassmorphismTheme.borders.hover}`,
				}}
			>
				<ImageIcon
					className='w-3.5 h-3.5'
					style={{ color: GlassmorphismTheme.text.high }}
				/>
			</button>
		</motion.div>
	);

	// Export placeholder for external images
	const exportPlaceholder = needsExportPlaceholder && rawImageUrl && (
		<ExportImagePlaceholder imageUrl={rawImageUrl} variant='image' />
	);

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
			{needsExportPlaceholder ? (
				// External images: Use shared ImageContent with native img
				<div data-export-image-container>
					{exportPlaceholder}
					<ImageContent
						imageUrl={imageUrl}
						altText={altText}
						fitMode={fitMode}
						aspectRatio={data.metadata?.aspectRatio || aspectRatio}
						maxHeight='400px'
						minHeight='120px'
						rawUrlForError={rawImageUrl}
						onLoad={handleImageLoad}
						imageOverlay={controlsOverlay}
						showLoadingBar={true}
						caption={captionProps}
						showCaptionGradient={showCaption}
					/>
				</div>
			) : (
				// Internal images: Use Next.js Image for optimization
				<InternalImageRenderer
					imageUrl={imageUrl}
					altText={altText}
					fitMode={fitMode}
					aspectRatio={data.metadata?.aspectRatio || aspectRatio}
					showCaption={showCaption}
					captionProps={captionProps}
					imageState={imageState}
					onStateChange={setImageState}
					onAspectRatioChange={setAspectRatio}
					controlsOverlay={controlsOverlay}
				/>
			)}
		</BaseNodeWrapper>
	);
};

/**
 * Internal image renderer using Next.js Image component
 * Separate component to handle the optimized image rendering
 */
interface InternalImageRendererProps {
	imageUrl: string | undefined;
	altText: string;
	fitMode: 'cover' | 'contain' | 'fill';
	aspectRatio: string | number;
	showCaption: boolean;
	captionProps?: {
		content?: string;
		placeholder?: string;
		photographer?: string;
		showInfo?: boolean;
		infoItems?: Array<{ label: string; value: string }>;
	};
	imageState: ImageLoadState;
	onStateChange: (state: ImageLoadState) => void;
	onAspectRatioChange: (ratio: number) => void;
	controlsOverlay: React.ReactNode;
}

const InternalImageRenderer = ({
	imageUrl,
	altText,
	fitMode,
	aspectRatio,
	showCaption,
	captionProps,
	imageState,
	onStateChange,
	onAspectRatioChange,
	controlsOverlay,
}: InternalImageRendererProps) => {
	const handleImageLoad = (event: any) => {
		const img = event.target;
		if (img.naturalWidth && img.naturalHeight) {
			onAspectRatioChange(img.naturalWidth / img.naturalHeight);
		}
		onStateChange('loaded');
	};

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
					<span style={{ fontSize: '12px', color: GlassmorphismTheme.text.disabled }}>
						No image URL provided
					</span>
				</div>
			</div>
		);
	}

	return (
		<div className='flex flex-col h-full'>
			<div
				className='relative w-full h-full overflow-hidden rounded-lg'
				data-export-image-container
				style={{
					aspectRatio: typeof aspectRatio === 'number' ? aspectRatio : aspectRatio,
					backgroundColor: GlassmorphismTheme.elevation[0],
					minHeight: '120px',
					maxHeight: '400px',
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
								transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' as const }}
							>
								<Loader2 className='w-6 h-6' style={{ color: 'rgba(255, 255, 255, 0.2)' }} />
							</motion.div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Next.js optimized Image */}
				<Image
					alt={altText}
					data-export-image
					fill={true}
					loading='lazy'
					onError={() => onStateChange('error')}
					onLoad={handleImageLoad}
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
				/>

				{/* Caption gradient */}
				{showCaption && imageState === 'loaded' && (
					<div
						className='absolute bottom-0 left-0 right-0 h-20 pointer-events-none'
						style={{
							background: 'linear-gradient(to top, rgba(18, 18, 18, 0.9) 0%, transparent 100%)',
						}}
					/>
				)}

				{/* Controls overlay */}
				{controlsOverlay}

				{/* Loading progress bar */}
				<AnimatePresence>
					{imageState === 'loading' && (
						<motion.div
							animate={{ scaleX: 1 }}
							className='absolute bottom-0 left-0 right-0 h-0.5 origin-left'
							exit={{ opacity: 0 }}
							initial={{ scaleX: 0 }}
							transition={{ duration: 2, ease: 'linear' as const }}
							style={{ backgroundColor: GlassmorphismTheme.indicators.progress.fill }}
						/>
					)}
				</AnimatePresence>
			</div>

			{/* Caption section */}
			{captionProps && (
				<div
					className='p-4'
					style={{
						backgroundColor: GlassmorphismTheme.elevation[1],
						borderTop: `1px solid ${GlassmorphismTheme.borders.default}`,
					}}
				>
					{captionProps.content ? (
						<div>
							<p
								style={{
									fontSize: '13px',
									color: GlassmorphismTheme.text.high,
									lineHeight: 1.6,
									letterSpacing: '0.01em',
									marginBottom: '4px',
								}}
							>
								{captionProps.content}
							</p>
							{captionProps.photographer && (
								<span
									style={{
										fontSize: '11px',
										color: GlassmorphismTheme.text.disabled,
										fontStyle: 'italic',
									}}
								>
									Photo by {captionProps.photographer}
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
							{captionProps.placeholder}
						</span>
					)}

					{captionProps.showInfo && captionProps.infoItems && captionProps.infoItems.length > 0 && (
						<div
							className='flex items-center gap-3 mt-3 pt-3'
							style={{ borderTop: `1px solid ${GlassmorphismTheme.borders.default}` }}
						>
							{captionProps.infoItems.map((item, index) => (
								<span key={index} style={{ fontSize: '11px', color: GlassmorphismTheme.text.disabled }}>
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

const ImageNode = memo(ImageNodeComponent);
ImageNode.displayName = 'ImageNode';
export default ImageNode;
