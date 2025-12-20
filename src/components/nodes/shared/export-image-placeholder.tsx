'use client';

import { cn } from '@/utils/cn';
import { Globe, Image as ImageIcon } from 'lucide-react';
import { GlassmorphismTheme } from '../themes/glassmorphism-theme';

interface ExportImagePlaceholderProps {
	/** The original image URL - used to extract domain */
	imageUrl: string;
	/** Additional className for container */
	className?: string;
	/** Type of placeholder - resource has link styling, image is neutral */
	variant?: 'resource' | 'image';
}

/**
 * Extract domain from URL for display
 */
function getDomain(url: string): string {
	try {
		const domain = new URL(url).hostname;
		return domain.replace('www.', '');
	} catch {
		return 'external source';
	}
}

/**
 * Export Image Placeholder
 *
 * Styled placeholder that replaces external images during export.
 * This avoids CORS issues with html-to-image canvas rendering.
 *
 * Hidden by default, shown only during export mode via CSS:
 * - Normal mode: hidden (display: none)
 * - Export mode: visible (parent has .export-mode class)
 */
export function ExportImagePlaceholder({
	imageUrl,
	className,
	variant = 'image',
}: ExportImagePlaceholderProps) {
	const domain = getDomain(imageUrl);
	const isResource = variant === 'resource';

	return (
		<div
			className={cn(
				'absolute inset-0 hidden items-center justify-center flex-col gap-2 p-4',
				className
			)}
			data-export-placeholder
			style={{
				backgroundColor: GlassmorphismTheme.elevation[0],
				border: `1px solid ${GlassmorphismTheme.borders.default}`,
				borderRadius: '0.5rem',
			}}
		>
			{/* Icon */}
			<div
				className="flex items-center justify-center rounded-lg p-3"
				style={{
					backgroundColor: GlassmorphismTheme.elevation[2],
					border: `1px solid ${GlassmorphismTheme.borders.default}`,
				}}
			>
				{isResource ? (
					<Globe
						className="w-6 h-6"
						style={{ color: 'rgba(147, 197, 253, 0.6)' }}
					/>
				) : (
					<ImageIcon
						className="w-6 h-6"
						style={{ color: 'rgba(255, 255, 255, 0.4)' }}
					/>
				)}
			</div>

			{/* Domain name */}
			<span
				className="text-center font-medium"
				style={{
					fontSize: '13px',
					color: isResource
						? 'rgba(147, 197, 253, 0.87)'
						: GlassmorphismTheme.text.high,
					letterSpacing: '0.01em',
				}}
			>
				{domain}
			</span>

			{/* Label */}
			<span
				className="text-center"
				style={{
					fontSize: '11px',
					color: GlassmorphismTheme.text.disabled,
					letterSpacing: '0.02em',
					textTransform: 'uppercase',
				}}
			>
				External image
			</span>
		</div>
	);
}

export default ExportImagePlaceholder;
