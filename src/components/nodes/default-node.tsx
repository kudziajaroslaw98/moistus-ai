'use client';

import { NodeData } from '@/types/node-data';
import { cn } from '@/utils/cn';
import { Node, NodeProps } from '@xyflow/react';
import { FileText } from 'lucide-react';
import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { BaseNodeWrapper } from './base-node-wrapper';
import { GlassmorphismTheme } from './themes/glassmorphism-theme';

const MarkdownWrapperComponent = ({ content }: { content: string }) => {
	// Custom markdown components following Material Design dark theme principles
	return (
		<ReactMarkdown
			components={{
				// Headers with progressive de-emphasis
				h1: ({children}) => (
					<h1 className='mb-3 pb-2' style={{
						fontSize: '20px',
						fontWeight: 500,
						color: GlassmorphismTheme.text.high, // High emphasis
						borderBottom: `1px solid ${GlassmorphismTheme.borders.default}`,
						lineHeight: 1.3,
					}}>
						{children}
					</h1>
				),
				h2: ({children}) => (
					<h2 className='mb-2 mt-3' style={{
						fontSize: '18px',
						fontWeight: 500,
						color: GlassmorphismTheme.text.high,
						lineHeight: 1.4,
					}}>
						{children}
					</h2>
				),
				h3: ({children}) => (
					<h3 className='mb-2 mt-2' style={{
						fontSize: '16px',
						fontWeight: 500,
						color: GlassmorphismTheme.text.medium, // Medium emphasis
						lineHeight: 1.5,
					}}>
						{children}
					</h3>
				),
				// Paragraphs with proper line height for readability
				p: ({children}) => (
					<p className='mb-3' style={{
						color: GlassmorphismTheme.text.medium,
						fontSize: '14px',
						lineHeight: 1.7,
						letterSpacing: '0.01em',
					}}>
						{children}
					</p>
				),
				// Lists with subtle bullets
				ul: ({children}) => (
					<ul className='mb-3 space-y-1 pl-4'>
						{children}
					</ul>
				),
				li: ({children}) => (
					<li className='flex items-start gap-2' style={{
						color: GlassmorphismTheme.text.medium,
						fontSize: '14px',
						lineHeight: 1.6,
					}}>
						<span style={{ color: 'rgba(96, 165, 250, 0.5)' }}>•</span>
						<span className='flex-1'>{children}</span>
					</li>
				),
				// Inline code with elevation
				code: ({children, className}) => {
					// Check if it's a code block (has language class)
					const isBlock = className?.includes('language-');
					
					if (isBlock) {
						return (
							<code className={className} style={{
								fontFamily: 'var(--font-geist-mono)',
								fontSize: '13px',
								lineHeight: 1.6,
							}}>
								{children}
							</code>
						);
					}
					
					// Inline code
					return (
						<code className='px-1.5 py-0.5 rounded' style={{
							backgroundColor: 'rgba(96, 165, 250, 0.15)',
							color: 'rgba(147, 197, 253, 0.87)',
							fontFamily: 'var(--font-geist-mono)',
							fontSize: '0.9em',
						}}>
							{children}
						</code>
					);
				},
				// Code blocks with proper elevation
				pre: ({children}) => (
					<pre className='p-3 rounded-md mb-3 overflow-x-auto' style={{
						backgroundColor: GlassmorphismTheme.elevation[0], // Base elevation
						border: `1px solid ${GlassmorphismTheme.borders.default}`,
					}}>
						{children}
					</pre>
				),
				// Links with accessible color
				a: ({children, href}) => (
					<a 
						href={href} 
						className='underline underline-offset-2 transition-colors hover:no-underline'
						style={{
							color: 'rgba(147, 197, 253, 0.87)',
						}}
						target='_blank'
						rel='noopener noreferrer'
					>
						{children}
					</a>
				),
				// Blockquotes with subtle accent
				blockquote: ({children}) => (
					<blockquote className='pl-4 py-2 my-3 italic' style={{
						borderLeft: '3px solid rgba(96, 165, 250, 0.3)',
						color: GlassmorphismTheme.text.disabled,
						backgroundColor: 'rgba(96, 165, 250, 0.05)',
					}}>
						{children}
					</blockquote>
				),
				// Horizontal rules
				hr: () => (
					<hr className='my-4' style={{
						border: 'none',
						height: '1px',
						background: `linear-gradient(90deg, transparent, ${GlassmorphismTheme.borders.hover} 20%, ${GlassmorphismTheme.borders.hover} 80%, transparent)`,
					}} />
				),
				// Tables with proper dark theme styling
				table: ({children}) => (
					<div className='overflow-x-auto mb-3'>
						<table className='w-full' style={{
							borderCollapse: 'collapse',
							fontSize: '14px',
						}}>
							{children}
						</table>
					</div>
				),
				th: ({children}) => (
					<th className='text-left p-2' style={{
						borderBottom: `2px solid ${GlassmorphismTheme.borders.hover}`,
						color: GlassmorphismTheme.text.high,
						fontWeight: 500,
					}}>
						{children}
					</th>
				),
				td: ({children}) => (
					<td className='p-2' style={{
						borderBottom: `1px solid ${GlassmorphismTheme.borders.default}`,
						color: GlassmorphismTheme.text.medium,
					}}>
						{children}
					</td>
				),
				// Strong emphasis
				strong: ({children}) => (
					<strong style={{
						color: GlassmorphismTheme.text.high,
						fontWeight: 600,
					}}>
						{children}
					</strong>
				),
				// Emphasis
				em: ({children}) => (
					<em style={{
						color: GlassmorphismTheme.text.medium,
						fontStyle: 'italic',
					}}>
						{children}
					</em>
				),
			}}
		>
			{content}
		</ReactMarkdown>
	);
};

const MarkdownWrapper = memo(MarkdownWrapperComponent);
MarkdownWrapper.displayName = 'MarkdownWrapper';

const DefaultNodeComponent = (props: NodeProps<Node<NodeData>>) => {
	const { id, data } = props;

	return (
		<BaseNodeWrapper
			{...props}
			nodeClassName={cn(['basic-node h-full'])}
			nodeType='Note'
			nodeIcon={<FileText className='size-4' />}
			hideNodeType
			elevation={1}
		>
			{data.content ? (
				<div className='max-w-none break-words'>
					<MarkdownWrapper content={data.content} />
				</div>
			) : (
				<div className='text-center py-4'>
					<span style={{ 
						color: GlassmorphismTheme.text.disabled, 
						fontSize: '14px',
						fontStyle: 'italic'
					}}>
						Click to add content...
					</span>
				</div>
			)}
		</BaseNodeWrapper>
	);
};

const DefaultNode = memo(DefaultNodeComponent);
DefaultNode.displayName = 'DefaultNode';
export default DefaultNode;