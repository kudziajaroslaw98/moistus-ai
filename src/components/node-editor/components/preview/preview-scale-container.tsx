'use client';

import { cn } from '@/utils/cn';
import { memo, ReactNode } from 'react';

interface PreviewScrollContainerProps {
	children: ReactNode;
	className?: string;
	maxHeight?: number;
}

/**
 * Preview Scroll Container
 *
 * Container that fills available width and adds a scrollbar
 * when content height exceeds maxHeight. Simple and maintains
 * 1:1 visual fidelity of the preview.
 */
const PreviewScrollContainerComponent = ({
	children,
	className,
	maxHeight = 320,
}: PreviewScrollContainerProps) => {
	return (
		<div
			className={cn('w-full overflow-y-auto overflow-x-hidden', className)}
			style={{ maxHeight }}
		>
			<div className="w-full">{children}</div>
		</div>
	);
};

export const PreviewScrollContainer = memo(PreviewScrollContainerComponent);
PreviewScrollContainer.displayName = 'PreviewScrollContainer';

// Keep old export name for backwards compatibility
export const PreviewScaleContainer = PreviewScrollContainer;
