'use client';

import { cn } from '@/lib/utils';
import { ArrowUpRight } from 'lucide-react';
import { memo } from 'react';
import { GlassmorphismTheme } from '../themes/glassmorphism-theme';

export interface ReferenceContentProps {
	/** Content snippet from referenced node */
	contentSnippet?: string;
	/** Title of the target map */
	targetMapTitle?: string;
	/** Whether reference is valid (has target) */
	hasValidReference?: boolean;
	/** Callback when "Go to Reference" clicked */
	onNavigate?: () => void;
	/** Placeholder when no reference */
	placeholder?: string;
	/** Additional class name */
	className?: string;
}

/**
 * Reference Content Component
 *
 * Pure rendering component for cross-reference display.
 * Used by both canvas nodes and preview system.
 *
 * Features:
 * - Blockquote display of referenced content
 * - Source map attribution
 * - Navigation action button
 */
const ReferenceContentComponent = ({
	contentSnippet,
	targetMapTitle,
	hasValidReference = false,
	onNavigate,
	placeholder = 'No reference selected',
	className,
}: ReferenceContentProps) => {
	const isInteractive = Boolean(onNavigate);

	return (
		<div className={cn('flex flex-col h-full', className)}>
			<div className='p-4 flex-grow'>
				{hasValidReference ? (
					<>
						<blockquote
							className='mt-2 border-l-2 pl-4 italic'
							style={{
								borderColor: GlassmorphismTheme.borders.default,
								color: GlassmorphismTheme.text.medium,
							}}
						>
							&quot;{contentSnippet || 'Referenced content...'}&quot;
						</blockquote>

						<div
							className='mt-3 text-xs'
							style={{ color: GlassmorphismTheme.text.disabled }}
						>
							<span>From: </span>
							<span
								className='font-medium'
								style={{ color: GlassmorphismTheme.text.medium }}
							>
								{targetMapTitle || 'Another Map'}
							</span>
						</div>
					</>
				) : (
					<div
						className='italic text-center py-4'
						style={{ color: GlassmorphismTheme.text.disabled }}
					>
						{placeholder}
					</div>
				)}
			</div>

			{hasValidReference && (
				<div
					onClick={isInteractive ? onNavigate : undefined}
					className={cn(
						'flex items-center justify-center gap-2 p-2 text-xs font-medium rounded-b-sm',
						isInteractive && 'cursor-pointer hover:bg-white/5'
					)}
					style={{
						backgroundColor: `${GlassmorphismTheme.elevation[2]}80`,
						color: GlassmorphismTheme.text.medium,
					}}
				>
					<span>Go to Reference</span>
					<ArrowUpRight className='size-3' />
				</div>
			)}
		</div>
	);
};

export const ReferenceContent = memo(ReferenceContentComponent);
ReferenceContent.displayName = 'ReferenceContent';
