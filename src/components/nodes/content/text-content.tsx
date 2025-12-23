'use client';

import { cn } from '@/lib/utils';
import { memo, useMemo } from 'react';

export interface TextContentProps {
	/** Text content to display */
	content?: string | null;
	/** Font size (number for px, or string with unit) */
	fontSize?: string | number;
	/** Font weight */
	fontWeight?: string | number;
	/** Text alignment */
	textAlign?: 'left' | 'center' | 'right';
	/** Text color (CSS color value) */
	textColor?: string;
	/** Font style (normal, italic) */
	fontStyle?: string;
	/** Placeholder when no content */
	placeholder?: string;
	/** Additional class name */
	className?: string;
}

/**
 * Text Content Component
 *
 * Pure rendering component for styled text display.
 * Used by both canvas nodes and preview system.
 *
 * Features:
 * - Customizable font size, weight, style
 * - Text alignment options
 * - Custom text color
 */
const TextContentComponent = ({
	content,
	fontSize = '14px',
	fontWeight = 400,
	textAlign = 'center',
	textColor = 'rgba(255, 255, 255, 0.87)',
	fontStyle = 'normal',
	placeholder = 'Text...',
	className,
}: TextContentProps) => {
	const textStyle = useMemo(() => {
		const style: React.CSSProperties = {
			textAlign,
			color: textColor,
			fontStyle,
			fontWeight: fontWeight as number,
			lineHeight: 1.6,
			letterSpacing: '0.01em',
		};

		if (fontSize) {
			style.fontSize = typeof fontSize === 'number' ? `${fontSize}px` : fontSize;
		}

		return style;
	}, [fontSize, fontWeight, fontStyle, textAlign, textColor]);

	return (
		<div
			style={textStyle}
			className={cn(
				'flex items-center min-h-8 w-full',
				textAlign === 'center' && 'justify-center',
				textAlign === 'right' && 'justify-end',
				textAlign === 'left' && 'justify-start',
				className
			)}
		>
			{content || (
				<span className='italic text-sm text-text-disabled'>{placeholder}</span>
			)}
		</div>
	);
};

export const TextContent = memo(TextContentComponent);
TextContent.displayName = 'TextContent';
