'use client';

import { cn } from '@/lib/utils';
import { getSafeImageUrl } from '@/utils/secure-image-url';
import { ExternalLink, Globe } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useState } from 'react';
import { GlassmorphismTheme } from '../themes/glassmorphism-theme';

export interface ResourceContentProps {
	/** Resource URL */
	url?: string;
	/** Display title */
	title?: string;
	/** Description text */
	description?: string;
	/** Thumbnail image URL */
	imageUrl?: string;
	/** AI-generated summary */
	summary?: string;
	/** Whether to show thumbnail */
	showThumbnail?: boolean;
	/** Whether to show AI summary */
	showSummary?: boolean;
	/** Callback when external link clicked */
	onLinkClick?: () => void;
	/** Additional class name */
	className?: string;
}

/**
 * Resource Content Component
 *
 * Pure rendering component for URL preview cards.
 * Used by both canvas nodes and preview system.
 *
 * Features:
 * - Thumbnail with loading states
 * - Domain extraction from URL
 * - AI summary section
 * - External link indicator
 */
const ResourceContentComponent = ({
	url,
	title = 'Resource',
	description,
	imageUrl,
	summary,
	showThumbnail = false,
	showSummary = false,
	onLinkClick,
	className,
}: ResourceContentProps) => {
	const [imageError, setImageError] = useState(false);
	const [imageLoading, setImageLoading] = useState(true);

	const safeImageUrl = getSafeImageUrl(imageUrl);

	// Extract domain for display
	const getDomain = (urlString: string) => {
		try {
			const domain = new URL(urlString).hostname;
			return domain.replace('www.', '');
		} catch {
			return 'link';
		}
	};

	return (
		<div className={cn('flex flex-col gap-3', className)}>
			{/* Thumbnail */}
			{showThumbnail && safeImageUrl && (
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
						/* eslint-disable-next-line @next/next/no-img-element */
						<img
							alt={title}
							className='object-cover absolute inset-0 w-full h-full'
							loading='lazy'
							src={safeImageUrl}
							onError={() => {
								setImageError(true);
								setImageLoading(false);
							}}
							onLoad={() => setImageLoading(false)}
							style={{
								opacity: imageLoading ? 0 : 1,
								transition: 'opacity 0.3s ease-out',
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

			{/* Title and link section */}
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

					{/* Domain display */}
					{url && (
						<div className='flex items-center gap-1.5'>
							<Globe
								className='w-3 h-3 shrink-0'
								style={{ color: 'rgba(147, 197, 253, 0.6)' }}
							/>
							<span
								style={{
									fontSize: '12px',
									color: 'rgba(147, 197, 253, 0.6)',
									letterSpacing: '0.01em',
								}}
							>
								{getDomain(url)}
							</span>
						</div>
					)}
				</div>

				{/* External link indicator */}
				{url && (
					<div
						onClick={onLinkClick}
						className={cn(
							'p-2 rounded-md',
							onLinkClick && 'cursor-pointer hover:bg-white/5'
						)}
						style={{
							backgroundColor: 'transparent',
							border: `1px solid ${GlassmorphismTheme.borders.default}`,
						}}
					>
						<ExternalLink
							className='w-4 h-4'
							style={{ color: 'rgba(147, 197, 253, 0.87)' }}
						/>
					</div>
				)}
			</div>

			{/* Description */}
			{description && description !== title && (
				<p
					style={{
						fontSize: '14px',
						color: GlassmorphismTheme.text.medium,
						lineHeight: 1.6,
						letterSpacing: '0.01em',
					}}
				>
					{description}
				</p>
			)}

			{/* AI Summary section */}
			{showSummary && summary && (
				<div>
					{/* Divider */}
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

					{/* Summary content */}
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
				</div>
			)}
		</div>
	);
};

export const ResourceContent = memo(ResourceContentComponent);
ResourceContent.displayName = 'ResourceContent';
