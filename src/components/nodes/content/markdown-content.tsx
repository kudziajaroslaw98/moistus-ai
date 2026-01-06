'use client';

import { GlassmorphismTheme } from '@/components/nodes/themes/glassmorphism-theme';
import { memo } from 'react';
import ReactMarkdown from 'react-markdown';

export interface MarkdownContentProps {
	/** The markdown content to render */
	content: string | null | undefined;
	/** Placeholder text when content is empty */
	placeholder?: string;
	/** Additional class name for the container */
	className?: string;
}

/**
 * Markdown Content Component
 *
 * Pure rendering component for markdown content.
 * Used by both canvas nodes and preview system.
 *
 * Features:
 * - Full markdown support via react-markdown
 * - Custom styling for headers, lists, code, etc.
 * - Consistent theme using GlassmorphismTheme
 * - Placeholder text when empty
 */
const MarkdownContentComponent = ({
	content,
	placeholder = 'Add content...',
	className,
}: MarkdownContentProps) => {
	if (!content) {
		return (
			<div className='text-center py-4'>
				<span
					style={{
						color: GlassmorphismTheme.text.disabled,
						fontSize: '14px',
						fontStyle: 'italic',
					}}
				>
					{placeholder}
				</span>
			</div>
		);
	}

	return (
		<div className={`max-w-none break-words ${className || ''}`}>
			<ReactMarkdown
				components={{
					// Headers with progressive de-emphasis
					h1: ({ children }) => (
						<h1
							className='mb-3 pb-2'
							style={{
								fontSize: '20px',
								fontWeight: 500,
								color: GlassmorphismTheme.text.high,
								borderBottom: `1px solid ${GlassmorphismTheme.borders.default}`,
								lineHeight: 1.3,
							}}
						>
							{children}
						</h1>
					),
					h2: ({ children }) => (
						<h2
							className='mb-2 mt-3'
							style={{
								fontSize: '18px',
								fontWeight: 500,
								color: GlassmorphismTheme.text.high,
								lineHeight: 1.4,
							}}
						>
							{children}
						</h2>
					),
					h3: ({ children }) => (
						<h3
							className='mb-2 mt-2'
							style={{
								fontSize: '16px',
								fontWeight: 500,
								color: GlassmorphismTheme.text.medium,
								lineHeight: 1.5,
							}}
						>
							{children}
						</h3>
					),
					// Paragraphs with proper line height
					p: ({ children }) => (
						<p
							className='mb-3'
							style={{
								color: GlassmorphismTheme.text.medium,
								fontSize: '14px',
								lineHeight: 1.7,
								letterSpacing: '0.01em',
							}}
						>
							{children}
						</p>
					),
					// Lists with subtle bullets
					ul: ({ children }) => (
						<ul className='mb-3 space-y-1 pl-4'>{children}</ul>
					),
					li: ({ children }) => (
						<li
							className='flex items-start gap-2'
							style={{
								color: GlassmorphismTheme.text.medium,
								fontSize: '14px',
								lineHeight: 1.6,
							}}
						>
							<span style={{ color: 'rgba(96, 165, 250, 0.5)' }}>•</span>
							<span className='flex-1'>{children}</span>
						</li>
					),
					// Inline code
					code: ({ children, className }) => {
						const isBlock = className?.includes('language-');

						if (isBlock) {
							return (
								<code
									className={className}
									style={{
										fontFamily: 'var(--font-geist-mono)',
										fontSize: '13px',
										lineHeight: 1.6,
									}}
								>
									{children}
								</code>
							);
						}

						return (
							<code
								className='px-1.5 py-0.5 rounded'
								style={{
									backgroundColor: 'rgba(96, 165, 250, 0.15)',
									color: 'rgba(147, 197, 253, 0.87)',
									fontFamily: 'var(--font-geist-mono)',
									fontSize: '0.9em',
								}}
							>
								{children}
							</code>
						);
					},
					// Code blocks
					pre: ({ children }) => (
						<pre
							className='p-3 rounded-md mb-3 overflow-x-auto'
							style={{
								backgroundColor: GlassmorphismTheme.elevation[0],
								border: `1px solid ${GlassmorphismTheme.borders.default}`,
							}}
						>
							{children}
						</pre>
					),
					// Links - validate href to prevent javascript: URLs (XSS)
					a: ({ children, href }) => {
						const safeHref =
							href &&
							(href.startsWith('http://') ||
								href.startsWith('https://') ||
								href.startsWith('/') ||
								href.startsWith('#') ||
								href.startsWith('mailto:'))
								? href
								: '#';
						return (
							<a
								className='underline underline-offset-2 transition-colors hover:no-underline'
								href={safeHref}
								rel='noopener noreferrer'
								target='_blank'
								style={{ color: 'rgba(147, 197, 253, 0.87)' }}
							>
								{children}
							</a>
						);
					},
					// Blockquotes
					blockquote: ({ children }) => (
						<blockquote
							className='pl-4 py-2 my-3 italic'
							style={{
								borderLeft: '3px solid rgba(96, 165, 250, 0.3)',
								color: GlassmorphismTheme.text.disabled,
								backgroundColor: 'rgba(96, 165, 250, 0.05)',
							}}
						>
							{children}
						</blockquote>
					),
					// Horizontal rules
					hr: () => (
						<hr
							className='my-4'
							style={{
								border: 'none',
								height: '1px',
								background: `linear-gradient(90deg, transparent, ${GlassmorphismTheme.borders.hover} 20%, ${GlassmorphismTheme.borders.hover} 80%, transparent)`,
							}}
						/>
					),
					// Tables
					table: ({ children }) => (
						<div className='overflow-x-auto mb-3'>
							<table
								className='w-full'
								style={{
									borderCollapse: 'collapse',
									fontSize: '14px',
								}}
							>
								{children}
							</table>
						</div>
					),
					th: ({ children }) => (
						<th
							className='text-left p-2'
							style={{
								borderBottom: `2px solid ${GlassmorphismTheme.borders.hover}`,
								color: GlassmorphismTheme.text.high,
								fontWeight: 500,
							}}
						>
							{children}
						</th>
					),
					td: ({ children }) => (
						<td
							className='p-2'
							style={{
								borderBottom: `1px solid ${GlassmorphismTheme.borders.default}`,
								color: GlassmorphismTheme.text.medium,
							}}
						>
							{children}
						</td>
					),
					// Strong emphasis
					strong: ({ children }) => (
						<strong
							style={{
								color: GlassmorphismTheme.text.high,
								fontWeight: 600,
							}}
						>
							{children}
						</strong>
					),
					// Emphasis
					em: ({ children }) => (
						<em
							style={{
								color: GlassmorphismTheme.text.medium,
								fontStyle: 'italic',
							}}
						>
							{children}
						</em>
					),
				}}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
};

export const MarkdownContent = memo(MarkdownContentComponent);
MarkdownContent.displayName = 'MarkdownContent';
