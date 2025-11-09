'use client';

import { cn } from '@/utils/cn';
import { motion } from 'motion/react';
import { PreviewRenderer } from './preview-renderer';

interface PreviewSectionProps {
	preview: any;
	nodeType: string;
	hasInput: boolean;
	className?: string;
}

const theme = {
	preview:
		'bg-zinc-900/50 border border-zinc-800 rounded-md p-3 mt-0 min-h-[60px] max-h-[216px] overflow-auto flex flex-col',
	previewLabel:
		'text-xs text-zinc-500 uppercase tracking-wider mb-1 flex-shrink-0',
	previewContent: 'text-sm flex-1',
};

export const PreviewSection: React.FC<PreviewSectionProps> = ({
	preview,
	nodeType,
	hasInput,
	className,
}) => {
	return (
		<div className={cn('flex-1 min-w-0', className)}>
			<motion.div
				animate={{ opacity: 1 }}
				className={theme.previewLabel}
				initial={{ opacity: 0 }}
				transition={{ duration: 0.2 }}
			>
				Preview
			</motion.div>
			<motion.div
				layout
				animate={{ opacity: 1, y: 0, scale: 1 }}
				className={theme.preview}
				exit={{ opacity: 0, y: -20, scale: 0.95 }}
				initial={{ opacity: 0, y: -20, scale: 0.95 }}
				transition={{ duration: 0.25, ease: 'easeOut' as const }}
			>
				<PreviewRenderer nodeType={nodeType} preview={preview} />
			</motion.div>

			{/* Placeholder when no preview */}
			{!preview && hasInput && (
				<motion.div
					animate={{ opacity: 0.5, x: 0 }}
					className={cn(theme.preview, 'border-dashed opacity-50')}
					exit={{ opacity: 0, x: 20 }}
					initial={{ opacity: 0, x: 20 }}
					transition={{ duration: 0.2 }}
				>
					<div className={theme.previewLabel}>Preview</div>

					<div className={cn(theme.previewContent, 'text-zinc-500')}>
						Type to see preview...
					</div>
				</motion.div>
			)}
		</div>
	);
};
