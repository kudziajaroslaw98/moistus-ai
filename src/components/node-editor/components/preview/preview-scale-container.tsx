'use client';

import { cn } from '@/utils/cn';
import { memo, ReactNode } from 'react';

interface PreviewScrollContainerProps {
	children: ReactNode;
	className?: string;
}

/**
 * Preview Scroll Container
 *
 * Container that fills available width and leaves scrolling to the
 * owning PreviewSection panel so the node editor never gets nested
 * vertical scrollers.
 */
const PreviewScrollContainerComponent = ({
	children,
	className,
}: PreviewScrollContainerProps) => {
	return (
		<div className={cn('w-full overflow-visible', className)}>
			<div className='w-full'>{children}</div>
		</div>
	);
};

export const PreviewScrollContainer = memo(PreviewScrollContainerComponent);
PreviewScrollContainer.displayName = 'PreviewScrollContainer';

// Keep old export name for backwards compatibility
export const PreviewScaleContainer = PreviewScrollContainer;
