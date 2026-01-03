'use client';

import { cn } from '@/lib/utils';
import { Check, Code, Copy, Maximize2, Minimize2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { BaseNodeWrapper } from './base-node-wrapper';
import { CodeContent } from './content/code-content';
import { TypedNodeProps } from './core/types';

type CodeNodeProps = TypedNodeProps<'codeNode'>;

/**
 * Code Node Component
 *
 * Displays syntax-highlighted code with interactive features:
 * - Copy to clipboard
 * - Expand/collapse for long code
 * - Language icon and file name display
 *
 * Uses shared CodeContent from content/code-content.tsx
 */
const CodeNodeComponent = (props: CodeNodeProps) => {
	const { data } = props;
	const [copied, setCopied] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);

	const codeContent = data.content || '';
	const language = (data.metadata?.language as string) || 'javascript';
	const showLineNumbers = Boolean(data.metadata?.showLineNumbers ?? true);
	const fileName = data.metadata?.fileName as string | undefined;

	const handleCopy = useCallback(async () => {
		if (!codeContent) return;

		try {
			await navigator.clipboard.writeText(codeContent);
			setCopied(true);
			toast.success('Code copied to clipboard!', {
				style: {
					background: 'var(--color-bg-elevated)',
					color: 'var(--color-text-primary)',
					border: `1px solid rgba(52, 211, 153, 0.3)`,
				},
			});
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error('Failed to copy code:', err);
			toast.error('Failed to copy code', {
				style: {
					background: 'var(--color-bg-elevated)',
					color: 'var(--color-text-primary)',
					border: `1px solid rgba(239, 68, 68, 0.3)`,
				},
			});
		}
	}, [codeContent]);

	// Calculate line count for display
	const lineCount = codeContent.split('\n').length;

	// Header action buttons
	const headerActions = (
		<>
			{/* Expand/Collapse for long code */}
			{lineCount > 20 && (
				<Button
					className='!cursor-pointer w-8 h-8 p-0 bg-transparent border border-border-strong'
					onClick={() => setIsExpanded(!isExpanded)}
					size={'icon'}
					title={isExpanded ? 'Collapse' : 'Expand'}
					variant={'ghost'}
				>
					{isExpanded ? (
						<Minimize2 className='w-3.5 h-3.5 text-text-secondary' />
					) : (
						<Maximize2 className='w-3.5 h-3.5 text-text-secondary' />
					)}
				</Button>
			)}

			{/* Copy button with animation */}
			<Button
				className='!cursor-pointer w-8 h-8 p-0 relative border overflow-hidden transition-all duration-200 ease-spring'
				disabled={copied}
				onClick={handleCopy}
				size={'icon'}
				variant={'ghost'}
				style={{
					backgroundColor: copied ? 'rgba(52, 211, 153, 0.1)' : 'transparent',
					borderColor: copied
						? 'rgba(52, 211, 153, 0.3)'
						: `var(--color-border-hover)`,
				}}
			>
				<AnimatePresence mode='wait'>
					{copied ? (
						<motion.div
							animate={{ scale: 1, rotate: 0 }}
							exit={{ scale: 0, rotate: 180 }}
							initial={{ scale: 0, rotate: -180 }}
							key='check'
							transition={{ type: 'spring', duration: 0.3 }}
						>
							<Check className='w-3.5 h-3.5 text-success-500' />
						</motion.div>
					) : (
						<motion.div
							animate={{ scale: 1, rotate: 0 }}
							exit={{ scale: 0, rotate: -180 }}
							initial={{ scale: 0, rotate: 180 }}
							key='copy'
							transition={{ type: 'spring', duration: 0.3 }}
						>
							<Copy className='w-3.5 h-3.5 text-text-secondary' />
						</motion.div>
					)}
				</AnimatePresence>
			</Button>
		</>
	);

	// Gradient overlay for collapsed state
	const codeOverlay =
		!isExpanded && lineCount > 20 ? (
			<div className='absolute bottom-0 left-0 right-0 h-12 pointer-events-none bg-linear-to-t from-elevation-0 to-transparent' />
		) : null;

	return (
		<BaseNodeWrapper
			{...props}
			hideNodeType
			elevation={1}
			includePadding={false}
			nodeClassName='code-node'
			nodeIcon={<Code className='size-4' />}
			nodeType='Code'
		>
			<CodeContent
				code={codeContent}
				language={language}
				showLineNumbers={showLineNumbers}
				fileName={fileName}
				maxHeight={isExpanded ? 'none' : '400px'}
				headerActions={headerActions}
				codeOverlay={codeOverlay}
				codeClassName={cn(
					'transition-all duration-300 ease-spring',
					isExpanded ? 'max-h-none' : 'max-h-100'
				)}
			/>
		</BaseNodeWrapper>
	);
};

const CodeNode = memo(CodeNodeComponent);
CodeNode.displayName = 'CodeNode';
export default CodeNode;
