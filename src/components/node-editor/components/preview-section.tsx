'use client';

import { cn } from '@/utils/cn';
import { motion } from 'motion/react';
import { PreviewNodeRenderer } from './preview';

interface PreviewSectionProps {
	preview: any;
	nodeType: string;
	hasInput: boolean;
	className?: string;
}

const theme = {
	preview:
		'min-h-[260px] max-h-[360px] overflow-y-auto overflow-x-hidden rounded-sm bg-zinc-950/20 p-4 flex flex-col justify-center',
	previewContent: 'text-sm text-zinc-500',
};

export const PreviewSection: React.FC<PreviewSectionProps> = ({
	preview,
	nodeType,
	hasInput,
	className,
}) => {
	return (
		<div
			className={cn('flex-1 min-w-0', className)}
			data-testid='preview-section'
		>
			<motion.div
				layout
				animate={{ opacity: 1, y: 0, scale: 1 }}
				className={theme.preview}
				exit={{ opacity: 0, y: -20, scale: 0.95 }}
				initial={{ opacity: 0, y: -20, scale: 0.95 }}
				transition={{ duration: 0.25, ease: 'easeOut' as const }}
			>
				{preview ? (
					<PreviewNodeRenderer nodeType={nodeType} preview={preview} />
				) : (
					<div className={theme.previewContent}>
						{hasInput ? 'Type to see preview...' : 'Start typing to preview.'}
					</div>
				)}
			</motion.div>
		</div>
	);
};
