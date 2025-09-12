'use client';

import { NodeData } from '@/types/node-data';
import { Node, NodeProps } from '@xyflow/react';
import { 
	Code, 
	Copy, 
	Check, 
	Terminal, 
	FileCode,
	Maximize2,
	Minimize2 
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { memo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { BaseNodeWrapper } from './base-node-wrapper';

// Custom dark theme optimized for readability
const customDarkTheme = {
	'pre[class*="language-"]': {
		color: 'rgba(255, 255, 255, 0.87)',
		background: '#0d0d0d', // Darker than node background for contrast
		fontFamily: 'var(--font-geist-mono), monospace',
		fontSize: '13px',
		lineHeight: '1.6',
		letterSpacing: '0.02em',
	},
	'code[class*="language-"]': {
		color: 'rgba(255, 255, 255, 0.87)',
		background: 'none',
	},
	// Syntax colors - desaturated for dark theme
	comment: { color: 'rgba(255, 255, 255, 0.38)' },
	prolog: { color: 'rgba(255, 255, 255, 0.38)' },
	doctype: { color: 'rgba(255, 255, 255, 0.38)' },
	cdata: { color: 'rgba(255, 255, 255, 0.38)' },
	
	punctuation: { color: 'rgba(255, 255, 255, 0.60)' },
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
		borderRight: '1px solid rgba(255, 255, 255, 0.06)',
	},
	'.line-numbers-rows > span:before': {
		color: 'rgba(255, 255, 255, 0.2)',
	},
};

type CodeNodeProps = NodeProps<Node<NodeData>>;

const CodeNodeComponent = (props: CodeNodeProps) => {
	const { id, data } = props;
	const [copied, setCopied] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);

	const codeContent = data.content || '';
	const language = (data.metadata?.language as string) || 'javascript';
	const showLineNumbers = Boolean(data.metadata?.showLineNumbers ?? true);
	const fileName = data.metadata?.fileName as string | undefined;
	const isExecutable = Boolean(data.metadata?.isExecutable);

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
					background: '#272727',
					color: 'rgba(255, 255, 255, 0.87)',
					border: '1px solid rgba(52, 211, 153, 0.3)',
				},
			});
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error('Failed to copy code:', err);
			toast.error('Failed to copy code', {
				style: {
					background: '#272727',
					color: 'rgba(255, 255, 255, 0.87)',
					border: '1px solid rgba(239, 68, 68, 0.3)',
				},
			});
		}
	}, [codeContent]);

	// Calculate line count for display
	const lineCount = codeContent.split('\n').length;

	return (
		<BaseNodeWrapper
			{...props}
			nodeClassName='code-node'
			nodeType='Code'
			nodeIcon={<Code className='size-4' />}
			includePadding={false}
			hideNodeType
			elevation={1}
		>
			<div className='w-full flex-grow overflow-hidden rounded-lg'
				style={{
					backgroundColor: '#0d0d0d', // Darker background for code
					border: '1px solid rgba(255, 255, 255, 0.06)',
				}}>
				
				{/* Header with file info and controls */}
				<div className='flex items-center justify-between px-4 py-3'
					style={{
						backgroundColor: '#1E1E1E', // Elevation 1
						borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
					}}>
					<div className='flex items-center gap-3'>
						{/* Language indicator */}
						<div className='flex items-center gap-2'>
							<span className='text-base'>{getLanguageIcon(language)}</span>
							<div className='flex flex-col'>
								<span style={{
									fontSize: '13px',
									fontWeight: 500,
									color: 'rgba(255, 255, 255, 0.87)',
									textTransform: 'capitalize',
								}}>
									{language}
								</span>
								{fileName && (
									<span style={{
										fontSize: '11px',
										color: 'rgba(255, 255, 255, 0.38)',
										fontFamily: 'var(--font-geist-mono)',
									}}>
										{fileName}
									</span>
								)}
							</div>
						</div>

						{/* Line count badge */}
						<div className='px-2 py-0.5 rounded'
							style={{
								backgroundColor: 'rgba(255, 255, 255, 0.05)',
								border: '1px solid rgba(255, 255, 255, 0.1)',
							}}>
							<span style={{
								fontSize: '11px',
								color: 'rgba(255, 255, 255, 0.6)',
							}}>
								{lineCount} {lineCount === 1 ? 'line' : 'lines'}
							</span>
						</div>

						{/* Executable indicator */}
						{isExecutable && (
							<div className='flex items-center gap-1 px-2 py-0.5 rounded'
								style={{
									backgroundColor: 'rgba(52, 211, 153, 0.1)',
									border: '1px solid rgba(52, 211, 153, 0.2)',
								}}>
								<Terminal className='w-3 h-3' 
									style={{ color: 'rgba(52, 211, 153, 0.87)' }} />
								<span style={{
									fontSize: '11px',
									color: 'rgba(52, 211, 153, 0.87)',
									fontWeight: 500,
								}}>
									Executable
								</span>
							</div>
						)}
					</div>

					{/* Action buttons */}
					<div className='flex items-center gap-2'>
						{/* Expand/Collapse for long code */}
						{lineCount > 20 && (
							<Button
								onClick={() => setIsExpanded(!isExpanded)}
								size={'icon'}
								variant={'ghost'}
								className='!cursor-pointer w-8 h-8 p-0'
								style={{
									backgroundColor: 'transparent',
									border: '1px solid rgba(255, 255, 255, 0.1)',
								}}
								title={isExpanded ? 'Collapse' : 'Expand'}
							>
								{isExpanded ? (
									<Minimize2 className='w-3.5 h-3.5' 
										style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
								) : (
									<Maximize2 className='w-3.5 h-3.5' 
										style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
								)}
							</Button>
						)}

						{/* Copy button with animation */}
						<Button
							onClick={handleCopy}
							size={'icon'}
							variant={'ghost'}
							className='!cursor-pointer w-8 h-8 p-0 relative overflow-hidden'
							style={{
								backgroundColor: copied 
									? 'rgba(52, 211, 153, 0.1)' 
									: 'transparent',
								border: copied 
									? '1px solid rgba(52, 211, 153, 0.3)' 
									: '1px solid rgba(255, 255, 255, 0.1)',
								transition: 'all 0.2s ease',
							}}
							disabled={copied}
						>
							<AnimatePresence mode='wait'>
								{copied ? (
									<motion.div
										key='check'
										initial={{ scale: 0, rotate: -180 }}
										animate={{ scale: 1, rotate: 0 }}
										exit={{ scale: 0, rotate: 180 }}
										transition={{ type: 'spring', stiffness: 400 }}
									>
										<Check className='w-3.5 h-3.5' 
											style={{ color: 'rgba(52, 211, 153, 0.87)' }} />
									</motion.div>
								) : (
									<motion.div
										key='copy'
										initial={{ scale: 0, rotate: 180 }}
										animate={{ scale: 1, rotate: 0 }}
										exit={{ scale: 0, rotate: -180 }}
										transition={{ type: 'spring', stiffness: 400 }}
									>
										<Copy className='w-3.5 h-3.5' 
											style={{ color: 'rgba(147, 197, 253, 0.87)' }} />
									</motion.div>
								)}
							</AnimatePresence>
						</Button>
					</div>
				</div>

				{/* Code content with syntax highlighting */}
				<div className='relative overflow-auto'
					style={{
						maxHeight: isExpanded ? 'none' : '400px',
						transition: 'max-height 0.3s ease',
					}}>
					<SyntaxHighlighter
						language={language}
						style={customDarkTheme}
						showLineNumbers={showLineNumbers}
						wrapLines={true}
						wrapLongLines={true}
						customStyle={{
							margin: 0,
							padding: '1rem',
							background: '#0d0d0d',
							fontSize: '13px',
						}}
						lineNumberStyle={{
							color: 'rgba(255, 255, 255, 0.2)',
							fontSize: '11px',
							minWidth: '3em',
							paddingRight: '1em',
							userSelect: 'none',
						}}
						codeTagProps={{
							style: {
								fontFamily: 'var(--font-geist-mono)',
								lineHeight: '1.6',
								letterSpacing: '0.02em',
							},
						}}
					>
						{codeContent || '// Add code snippet here...'}
					</SyntaxHighlighter>

					{/* Gradient overlay for collapsed state */}
					{!isExpanded && lineCount > 20 && (
						<div className='absolute bottom-0 left-0 right-0 h-12 pointer-events-none'
							style={{
								background: 'linear-gradient(to top, #0d0d0d 0%, transparent 100%)',
							}}
						/>
					)}
				</div>

				{/* Footer with execution status or metadata */}
				{data.metadata?.lastExecuted && (
					<div className='px-4 py-2'
						style={{
							backgroundColor: '#1E1E1E',
							borderTop: '1px solid rgba(255, 255, 255, 0.06)',
						}}>
						<div className='flex items-center justify-between'>
							<span style={{
								fontSize: '11px',
								color: 'rgba(255, 255, 255, 0.38)',
							}}>
								Last executed: {new Date(data.metadata.lastExecuted).toLocaleString()}
							</span>
							{data.metadata?.executionTime && (
								<span style={{
									fontSize: '11px',
									color: 'rgba(52, 211, 153, 0.6)',
								}}>
									{data.metadata.executionTime}ms
								</span>
							)}
						</div>
					</div>
				)}
			</div>
		</BaseNodeWrapper>
	);
};

const CodeNode = memo(CodeNodeComponent);
CodeNode.displayName = 'CodeNode';
export default CodeNode;