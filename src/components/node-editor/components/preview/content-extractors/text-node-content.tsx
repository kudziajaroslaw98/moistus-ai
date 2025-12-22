'use client';

import { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import { memo, useMemo } from 'react';

interface TextNodeContentProps {
	data: NodeData;
}

/**
 * Text Node Content - Styled text display
 * Extracted from: src/components/nodes/text-node.tsx
 */
const TextNodeContentComponent = ({ data }: TextNodeContentProps) => {
	const { content, metadata } = data;

	const {
		fontSize = '14px',
		fontWeight = 400,
		textAlign = 'center',
		textColor = 'var(--text-text-primary)',
		fontStyle = 'normal',
	} = (metadata as {
		fontSize?: string | number;
		fontWeight?: string | number;
		textAlign?: 'left' | 'center' | 'right';
		textColor?: string;
		fontStyle?: string;
	}) ?? {};

	const textStyle = useMemo(() => {
		const style: React.CSSProperties = {
			textAlign: textAlign || 'center',
			color: textColor || 'rgba(255, 255, 255, 0.87)',
			fontStyle: fontStyle || 'normal',
			fontWeight: fontWeight || 400,
			lineHeight: 1.6,
			letterSpacing: '0.01em',
		};

		if (fontSize) {
			style.fontSize =
				typeof fontSize === 'number' ? `${fontSize}px` : fontSize;
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
				textAlign === 'left' && 'justify-start'
			)}
		>
			{content || (
				<span className='italic text-sm text-text-disabled'>Text...</span>
			)}
		</div>
	);
};

export const TextNodeContent = memo(TextNodeContentComponent);
TextNodeContent.displayName = 'TextNodeContent';
