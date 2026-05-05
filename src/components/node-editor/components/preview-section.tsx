'use client';

import { cn } from '@/utils/cn';
import { PreviewNodeRenderer } from './preview';

interface PreviewSectionProps {
	preview: any;
	nodeType: string;
	hasInput: boolean;
	className?: string;
}

const theme = {
	preview:
		'h-full min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6 flex flex-col justify-start',
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
			<div className={theme.preview}>
				{preview ? (
					<PreviewNodeRenderer nodeType={nodeType} preview={preview} />
				) : (
					<div className={theme.previewContent}>
						{hasInput ? 'Type to see preview...' : 'Start typing to preview.'}
					</div>
				)}
			</div>
		</div>
	);
};
