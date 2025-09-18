/**
 * Shared Node Content Component
 * 
 * Provides consistent content wrapper styling and behavior across all node types.
 * Handles common content patterns like empty states, loading states, and scrolling.
 */

'use client';

import { ReactNode, forwardRef } from 'react';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'motion/react';
import { GlassmorphismTheme } from '../themes/glassmorphism-theme';

export interface NodeContentProps {
	children: ReactNode;
	className?: string;
	isEmpty?: boolean;
	isLoading?: boolean;
	emptyMessage?: string;
	loadingMessage?: string;
	scrollable?: boolean;
	maxHeight?: string;
	padding?: boolean;
	center?: boolean;
	onClick?: () => void;
	onDoubleClick?: () => void;
}

export const NodeContent = forwardRef<HTMLDivElement, NodeContentProps>(({
	children,
	className = '',
	isEmpty = false,
	isLoading = false,
	emptyMessage = 'Click to add content...',
	loadingMessage = 'Loading...',
	scrollable = false,
	maxHeight,
	padding = true,
	center = false,
	onClick,
	onDoubleClick,
}, ref) => {
	const theme = GlassmorphismTheme;

	const contentStyles = {
		maxHeight: scrollable && maxHeight ? maxHeight : undefined,
		overflow: scrollable ? 'auto' as const : 'visible' as const,
	};

	// Empty state component
	const EmptyState = () => (
		<div 
			className={cn(
				'flex items-center justify-center py-4',
				center && 'text-center'
			)}
			style={{ minHeight: '60px' }}
		>
			<span 
				style={{ 
					color: theme.text.disabled,
					fontSize: '14px',
					fontStyle: 'italic',
				}}
			>
				{emptyMessage}
			</span>
		</div>
	);

	// Loading state component
	const LoadingState = () => (
		<div className="flex items-center justify-center py-4">
			<div className="flex items-center gap-2">
				<motion.div
					className="w-1 h-4 rounded-full"
					style={{ backgroundColor: theme.text.disabled }}
					animate={{ scaleY: [1, 0.5, 1] }}
					transition={{ 
						repeat: Infinity, 
						duration: 0.8,
						delay: 0,
					}}
				/>

				<motion.div
					className="w-1 h-4 rounded-full"
					style={{ backgroundColor: theme.text.disabled }}
					animate={{ scaleY: [1, 0.5, 1] }}
					transition={{ 
						repeat: Infinity, 
						duration: 0.8,
						delay: 0.2,
					}}
				/>

				<motion.div
					className="w-1 h-4 rounded-full"
					style={{ backgroundColor: theme.text.disabled }}
					animate={{ scaleY: [1, 0.5, 1] }}
					transition={{ 
						repeat: Infinity, 
						duration: 0.8,
						delay: 0.4,
					}}
				/>

				<span 
					className="ml-2"
					style={{ 
						color: theme.text.disabled,
						fontSize: '14px',
					}}
				>
					{loadingMessage}
				</span>
			</div>
		</div>
	);

	return (
		<div
			ref={ref}
			className={cn(
				'relative w-full h-full',
				padding && 'p-1',
				center && 'flex items-center justify-center',
				scrollable && 'overflow-hidden',
				className
			)}
			style={contentStyles}
			onClick={onClick}
			onDoubleClick={onDoubleClick}
		>
			<AnimatePresence mode="wait">
				{isLoading ? (
					<motion.div
						key="loading"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
					>
						<LoadingState />
					</motion.div>
				) : isEmpty ? (
					<motion.div
						key="empty"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
					>
						<EmptyState />
					</motion.div>
				) : (
					<motion.div
						key="content"
						initial={{ opacity: 0, y: 5 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -5 }}
						transition={{ duration: 0.2 }}
						className="w-full h-full"
					>
						{children}
					</motion.div>
				)}
			</AnimatePresence>

			{/* Scrollbar styling for webkit browsers */}
			{scrollable && (
				<style jsx>{`
					div::-webkit-scrollbar {
						width: 6px;
					}
					div::-webkit-scrollbar-track {
						background: ${theme.elevation[0]};
						border-radius: 3px;
					}
					div::-webkit-scrollbar-thumb {
						background: ${theme.borders.default};
						border-radius: 3px;
					}
					div::-webkit-scrollbar-thumb:hover {
						background: ${theme.borders.hover};
					}
				`}</style>
			)}
		</div>
	);
});

NodeContent.displayName = 'NodeContent';

// Specialized content containers for different node types

export interface TextContentProps {
	content: string;
	style?: React.CSSProperties;
	className?: string;
	placeholder?: string;
}

export const TextContent = ({ 
	content, 
	style, 
	className = '',
	placeholder = 'Add text...'
}: TextContentProps) => {
	const theme = GlassmorphismTheme;

	return (
		<NodeContent 
			isEmpty={!content}
			emptyMessage={placeholder}
			className={className}
		>
			<div 
				className="w-full break-words"
				style={{
					color: theme.text.high,
					fontSize: '14px',
					lineHeight: 1.6,
					letterSpacing: '0.01em',
					...style,
				}}
			>
				{content}
			</div>
		</NodeContent>
	);
};

export interface CodeContentProps {
	code: string;
	language?: string;
	showLineNumbers?: boolean;
	maxHeight?: string;
	placeholder?: string;
}

export const CodeContent = ({ 
	code, 
	language = 'javascript',
	showLineNumbers = true,
	maxHeight = '400px',
	placeholder = 'Add code...'
}: CodeContentProps) => {
	return (
		<NodeContent
			isEmpty={!code}
			emptyMessage={placeholder}
			scrollable={true}
			maxHeight={maxHeight}
			padding={false}
		>
			<pre 
				className="p-3 rounded-md overflow-x-auto"
				style={{
					backgroundColor: '#0d0d0d',
					border: '1px solid rgba(255, 255, 255, 0.06)',
					fontFamily: 'var(--font-geist-mono)',
					fontSize: '13px',
					lineHeight: 1.6,
				}}
			>
				<code>{code}</code>
			</pre>
		</NodeContent>
	);
};

export interface MediaContentProps {
	src?: string;
	alt?: string;
	loading?: boolean;
	error?: boolean;
	placeholder?: string;
	children?: ReactNode;
}

export const MediaContent = ({
	src,
	alt = '',
	loading = false,
	error = false,
	placeholder = 'No media',
	children,
}: MediaContentProps) => {
	const isEmpty = !src && !children;
	const isLoading = loading && src;

	return (
		<NodeContent
			isEmpty={isEmpty || error}
			isLoading={isLoading}
			emptyMessage={error ? 'Failed to load media' : placeholder}
			loadingMessage="Loading media..."
			padding={false}
			center={isEmpty || error || isLoading}
		>
			{children || (src && <img src={src} alt={alt} className="w-full h-full object-cover" />)}
		</NodeContent>
	);
};

export default {
	NodeContent,
	TextContent,
	CodeContent,
	MediaContent,
};