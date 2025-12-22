'use client';

import { cn } from '@/lib/utils';
import { memo, ReactNode } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { codeSyntaxTheme, getLanguageIcon } from './code-syntax-theme';

export interface CodeContentProps {
	/** The code to display */
	code: string;
	/** Programming language for syntax highlighting */
	language?: string;
	/** Whether to show line numbers */
	showLineNumbers?: boolean;
	/** Optional file name to display */
	fileName?: string;
	/** Maximum height before scrolling (CSS value) */
	maxHeight?: string;
	/** Additional class name for the container */
	className?: string;
	/** Additional class name for the code scroll container */
	codeClassName?: string;
	/** Whether to show the header with language info */
	showHeader?: boolean;
	/** Optional action buttons to render in header (copy, expand, etc.) */
	headerActions?: ReactNode;
	/** Optional content to render after the code (e.g., gradient overlay) */
	codeOverlay?: ReactNode;
}

/**
 * Code Content Component
 *
 * Pure rendering component for syntax-highlighted code.
 * Used by both canvas nodes and preview system.
 *
 * Features:
 * - Syntax highlighting via Prism
 * - Language icon and name display
 * - Optional file name
 * - Line numbers
 * - Scrollable container with max height
 * - Customizable header actions (for copy/expand buttons)
 * - Code overlay support (for gradient fade)
 */
const CodeContentComponent = ({
	code,
	language = 'javascript',
	showLineNumbers = true,
	fileName,
	maxHeight = '300px',
	className,
	codeClassName,
	showHeader = true,
	headerActions,
	codeOverlay,
}: CodeContentProps) => {
	const displayCode = code || '// Add code snippet here...';

	return (
		<div
			className={cn(
				'w-full grow overflow-hidden rounded-lg bg-base border border-border-default',
				className
			)}
		>
			{/* Header with file info and optional actions */}
			{showHeader && (
				<div className='flex items-center justify-between px-4 py-3 bg-base border-b border-b-border-default'>
					<div className='flex items-center gap-3'>
						<div className='flex items-center gap-2'>
							<span className='text-base'>{getLanguageIcon(language)}</span>
							<div className='flex flex-col'>
								<span className='text-[13px] font-medium text-text-primary capitalize'>
									{language}
								</span>
								{fileName && (
									<span className='text-[11px] text-text-disabled font-mono'>
										{fileName}
									</span>
								)}
							</div>
						</div>
					</div>
					{/* Action buttons slot */}
					{headerActions && (
						<div className='flex items-center gap-2'>{headerActions}</div>
					)}
				</div>
			)}

			{/* Code content */}
			<div
				className={cn('relative overflow-auto', codeClassName)}
				style={{ maxHeight }}
			>
				<SyntaxHighlighter
					language={language}
					showLineNumbers={showLineNumbers}
					style={codeSyntaxTheme}
					wrapLines={true}
					wrapLongLines={true}
					codeTagProps={{
						style: {
							fontFamily: 'var(--font-geist-mono)',
							lineHeight: '1.6',
							letterSpacing: '0.02em',
						},
					}}
					customStyle={{
						margin: 0,
						padding: '1rem',
						background: 'var(--color-bg-base)',
						fontSize: '13px',
					}}
					lineNumberStyle={{
						color: 'var(--color-text-tertiary)',
						fontSize: '11px',
						minWidth: '3em',
						paddingRight: '1em',
						userSelect: 'none',
					}}
				>
					{displayCode}
				</SyntaxHighlighter>

				{/* Optional overlay (e.g., gradient for collapsed state) */}
				{codeOverlay}
			</div>
		</div>
	);
};

export const CodeContent = memo(CodeContentComponent);
CodeContent.displayName = 'CodeContent';
