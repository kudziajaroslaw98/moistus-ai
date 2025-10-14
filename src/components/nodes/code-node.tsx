'use client';

import { Check, Code, Copy, Maximize2, Minimize2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useCallback, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { BaseNodeWrapper } from './base-node-wrapper';
import { TypedNodeProps } from './core/types';
import { GlassmorphismTheme } from './themes/glassmorphism-theme';

// Custom dark theme optimized for readability
const customDarkTheme = {
	'pre[class*="language-"]': {
		color: GlassmorphismTheme.text.high,
		background: GlassmorphismTheme.elevation.sunken, // Sunken effect - darker than node background
		fontFamily: 'var(--font-geist-mono), monospace',
		fontSize: '13px',
		lineHeight: '1.6',
		letterSpacing: '0.02em',
		border: `1px solid ${GlassmorphismTheme.borders.default}`,
		borderRadius: '6px',
		padding: '1rem',
	},
	'code[class*="language-"]': {
		color: GlassmorphismTheme.text.high,
		background: 'none',
	},
	// Syntax colors - desaturated for dark theme
	comment: { color: GlassmorphismTheme.text.disabled },
	prolog: { color: GlassmorphismTheme.text.disabled },
	doctype: { color: GlassmorphismTheme.text.disabled },
	cdata: { color: GlassmorphismTheme.text.disabled },

	punctuation: { color: GlassmorphismTheme.text.medium },
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
		borderRight: `1px solid ${GlassmorphismTheme.borders.default}`,
	},
	'.line-numbers-rows > span:before': {
		color: GlassmorphismTheme.text.disabled,
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
					background: GlassmorphismTheme.elevation[4],
					color: GlassmorphismTheme.text.high,
					border: `1px solid rgba(52, 211, 153, 0.3)`,
				},
			});
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error('Failed to copy code:', err);
			toast.error('Failed to copy code', {
				style: {
					background: GlassmorphismTheme.elevation[4],
					color: GlassmorphismTheme.text.high,
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
			<div
				className='w-full flex-grow overflow-hidden rounded-lg'
				style={{
					backgroundColor: GlassmorphismTheme.elevation[0], // Darker background for code
					border: `1px solid ${GlassmorphismTheme.borders.default}`,
				}}
			>
				{/* Header with file info and controls */}
				<div
					className='flex items-center justify-between px-4 py-3'
					style={{
						backgroundColor: GlassmorphismTheme.elevation[1], // Elevation 1
						borderBottom: `1px solid ${GlassmorphismTheme.borders.default}`,
					}}
				>
					<div className='flex items-center gap-3'>
						{/* Language indicator */}
						<div className='flex items-center gap-2'>
							<span className='text-base'>{getLanguageIcon(language)}</span>

							<div className='flex flex-col'>
								<span
									style={{
										fontSize: '13px',
										fontWeight: 500,
										color: GlassmorphismTheme.text.high,
										textTransform: 'capitalize',
									}}
								>
									{language}
								</span>

								{fileName && (
									<span
										style={{
											fontSize: '11px',
											color: GlassmorphismTheme.text.disabled,
											fontFamily: 'var(--font-geist-mono)',
										}}
									>
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
								className='!cursor-pointer w-8 h-8 p-0'
								size={'icon'}
								title={isExpanded ? 'Collapse' : 'Expand'}
								variant={'ghost'}
								style={{
									backgroundColor: 'transparent',
									border: `1px solid ${GlassmorphismTheme.borders.hover}`,
								}}
								onClick={() => setIsExpanded(!isExpanded)}
							>
								{isExpanded ? (
									<Minimize2
										className='w-3.5 h-3.5'
										style={{ color: GlassmorphismTheme.text.medium }}
									/>
								) : (
									<Maximize2
										className='w-3.5 h-3.5'
										style={{ color: GlassmorphismTheme.text.medium }}
									/>
								)}
							</Button>
						)}

						{/* Copy button with animation */}
						<Button
							className='!cursor-pointer w-8 h-8 p-0 relative overflow-hidden'
							disabled={copied}
							size={'icon'}
							variant={'ghost'}
							style={{
								backgroundColor: copied
									? 'rgba(52, 211, 153, 0.1)'
									: 'transparent',
								border: copied
									? '1px solid rgba(52, 211, 153, 0.3)'
									: `1px solid ${GlassmorphismTheme.borders.hover}`,
								transition: 'all 0.2s ease',
							}}
							onClick={handleCopy}
						>
							<AnimatePresence mode='wait'>
								{copied ? (
									<motion.div
										animate={{ scale: 1, rotate: 0 }}
										exit={{ scale: 0, rotate: 180 }}
										initial={{ scale: 0, rotate: -180 }}
										key='check'
										transition={{ type: 'spring', stiffness: 400 }}
									>
										<Check
											className='w-3.5 h-3.5'
											style={{ color: 'rgba(52, 211, 153, 0.87)' }}
										/>
									</motion.div>
								) : (
									<motion.div
										animate={{ scale: 1, rotate: 0 }}
										exit={{ scale: 0, rotate: -180 }}
										initial={{ scale: 0, rotate: 180 }}
										key='copy'
										transition={{ type: 'spring', stiffness: 400 }}
									>
										<Copy
											className='w-3.5 h-3.5'
											style={{ color: 'rgba(147, 197, 253, 0.87)' }}
										/>
									</motion.div>
								)}
							</AnimatePresence>
						</Button>
					</div>
				</div>

				{/* Code content with syntax highlighting */}
				<div
					className='relative overflow-auto'
					style={{
						maxHeight: isExpanded ? 'none' : '400px',
						transition: 'max-height 0.3s ease',
					}}
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
							background: GlassmorphismTheme.elevation[0],
							fontSize: '13px',
						}}
						lineNumberStyle={{
							color: GlassmorphismTheme.text.disabled,
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
						<div
							className='absolute bottom-0 left-0 right-0 h-12 pointer-events-none'
							style={{
								background: `linear-gradient(to top, ${GlassmorphismTheme.elevation[0]} 0%, transparent 100%)`,
							}}
						/>
					)}
				</div>
			</div>
		</BaseNodeWrapper>
	);
};

const CodeNode = memo(CodeNodeComponent);
CodeNode.displayName = 'CodeNode';
export default CodeNode;
