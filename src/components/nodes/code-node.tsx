'use client';

import { cn } from '@/lib/utils';
import { Check, Code, Copy, Maximize2, Minimize2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useCallback, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { BaseNodeWrapper } from './base-node-wrapper';
import { TypedNodeProps } from './core/types';

// Custom dark theme optimized for readability
const customDarkTheme = {
	'pre[class*="language-"]': {
		color: 'var(--color-text-primary)',
		background: 'var(--color-bg-elevated)',
		fontFamily: 'var(--font-geist-mono), monospace',
		fontSize: '13px',
		lineHeight: '1.6',
		letterSpacing: '0.02em',
		border: `1px solid var(--color-border-default)`,
		borderRadius: '6px',
		padding: '1rem',
	},
	'code[class*="language-"]': {
		color: 'var(--color-text-primary)',
		background: 'none',
	},
	// Syntax colors - desaturated for dark theme
	comment: { color: 'var(--color-text-tertiary)' },
	prolog: { color: 'var(--color-text-tertiary)' },
	doctype: { color: 'var(--color-text-tertiary)' },
	cdata: { color: 'var(--color-text-tertiary)' },

	punctuation: { color: 'var(--color-text-secondary)' },
	property: { color: 'rgba(147, 197, 253, 0.87)' }, // Desaturated blue
	tag: { color: 'rgba(239, 68, 68, 0.87)' }, // Desaturated red
	boolean: { color: 'rgba(251, 191, 36, 0.87)' }, // Desaturated amber
	number: { color: 'rgba(251, 191, 36, 0.87)' },
	constant: { color: 'rgba(251, 191, 36, 0.87)' },
	symbol: { color: 'rgba(251, 191, 36, 0.87)' },
	deleted: { color: 'rgba(239, 68, 68, 0.87)' },

	selector: { color: 'rgba(52, 211, 153, 0.87)' }, // Desaturated emerald
	'attr-name': { color: 'rgba(52, 211, 153, 0.87)' },
	string: { color: 'rgba(52, 211, 153, 0.87)' },
	char: { color: 'rgba(52, 211, 153, 0.87)' },
	builtin: { color: 'rgba(52, 211, 153, 0.87)' },
	inserted: { color: 'rgba(52, 211, 153, 0.87)' },

	operator: { color: 'rgba(167, 139, 250, 0.87)' }, // Desaturated violet
	entity: { color: 'rgba(167, 139, 250, 0.87)' },
	url: { color: 'rgba(167, 139, 250, 0.87)' },
	variable: { color: 'rgba(167, 139, 250, 0.87)' },

	atrule: { color: 'rgba(251, 191, 36, 0.87)' },
	'attr-value': { color: 'rgba(147, 197, 253, 0.87)' },
	function: { color: 'rgba(251, 146, 60, 0.87)' }, // Desaturated orange
	'class-name': { color: 'rgba(251, 146, 60, 0.87)' },

	keyword: { color: 'rgba(167, 139, 250, 0.87)' },
	regex: { color: 'rgba(251, 191, 36, 0.87)' },
	important: { color: 'rgba(239, 68, 68, 0.87)', fontWeight: 'bold' },
	bold: { fontWeight: 'bold' },
	italic: { fontStyle: 'italic' },

	// Line numbers
	'.line-numbers .line-numbers-rows': {
		borderRight: `1px solid var(--color-border-default)`,
	},
	'.line-numbers-rows > span:before': {
		color: 'var(--color-text-tertiary)',
	},
};

type CodeNodeProps = TypedNodeProps<'codeNode'>;

const CodeNodeComponent = (props: CodeNodeProps) => {
	const { id, data } = props;
	const [copied, setCopied] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);

	const codeContent = data.content || '';
	const language = (data.metadata?.language as string) || 'javascript';
	const showLineNumbers = Boolean(data.metadata?.showLineNumbers ?? true);
	const fileName = data.metadata?.fileName as string | undefined;

	// Get language icon based on language
	const getLanguageIcon = (lang: string) => {
		const icons: Record<string, string> = {
			javascript: '🟨',
			typescript: '🔷',
			python: '🐍',
			java: '☕',
			rust: '🦀',
			go: '🐹',
			cpp: '⚙️',
			csharp: '🎯',
			html: '🌐',
			css: '🎨',
			sql: '💾',
			bash: '🖥️',
			jsx: '⚛️',
			tsx: '⚛️',
		};
		return icons[lang.toLowerCase()] || '📄';
	};

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
			<div className='w-full flex-grow overflow-hidden rounded-lg bg-base border border-border-default'>
				{/* Header with file info and controls */}
				<div className='flex items-center justify-between px-4 py-3 bg-base border-b border-b-border-default'>
					<div className='flex items-center gap-3'>
						{/* Language indicator */}
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

					{/* Action buttons */}
					<div className='flex items-center gap-2'>
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
								backgroundColor: copied
									? 'rgba(52, 211, 153, 0.1)'
									: 'transparent',
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
					</div>
				</div>

				{/* Code content with syntax highlighting */}
				<div
					className={cn(
						'relative overflow-auto transition-all duration-300 ease-spring',
						isExpanded ? 'max-h-none' : 'max-h-[400px]'
					)}
				>
					<SyntaxHighlighter
						language={language}
						showLineNumbers={showLineNumbers}
						style={customDarkTheme}
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
						{codeContent || '// Add code snippet here...'}
					</SyntaxHighlighter>

					{/* Gradient overlay for collapsed state */}
					{!isExpanded && lineCount > 20 && (
						<div className='absolute bottom-0 left-0 right-0 h-12 pointer-events-none bg-linear-to-t  from-elevation-0 to-transparent' />
					)}
				</div>
			</div>
		</BaseNodeWrapper>
	);
};

const CodeNode = memo(CodeNodeComponent);
CodeNode.displayName = 'CodeNode';
export default CodeNode;
