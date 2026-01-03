'use client';

import type { ChatMessage as ChatMessageType } from '@/store/slices/chat-slice';
import { cn } from '@/utils/cn';
import { Sparkles, User } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useMemo, useState } from 'react';

interface ChatMessageProps {
	message: ChatMessageType;
	isStreaming?: boolean;
}

// Format timestamp for display
function formatTime(date: Date): string {
	return new Intl.DateTimeFormat('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
	}).format(date);
}

// Typing indicator component
function TypingIndicator() {
	return (
		<div className='flex items-center gap-1 py-1'>
			{[0, 1, 2].map((i) => (
				<motion.div
					key={i}
					className='h-1.5 w-1.5 rounded-full bg-zinc-400'
					animate={{ opacity: [0.4, 1, 0.4] }}
					transition={{
						duration: 1,
						repeat: Infinity,
						delay: i * 0.2,
						ease: 'easeInOut',
					}}
				/>
			))}
		</div>
	);
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
	const [showTimestamp, setShowTimestamp] = useState(false);
	const shouldReduceMotion = useReducedMotion();

	const isUser = message.role === 'user';
	const isAssistant = message.role === 'assistant';
	const isEmpty = !message.content || message.content.trim() === '';

	// Animation config following guidelines - use string easing to satisfy Motion types
	const transition = shouldReduceMotion
		? { duration: 0 }
		: { duration: 0.2, ease: 'easeOut' as const };

	// Parse markdown-like content for simple formatting
	const formattedContent = useMemo(() => {
		if (isEmpty) return null;

		// Simple markdown processing
		let content = message.content;

		// Bold text
		content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

		// Italic text
		content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');

		// Code blocks
		content = content.replace(
			/```([\s\S]*?)```/g,
			'<pre class="bg-zinc-800/50 rounded p-2 my-2 text-xs overflow-x-auto"><code>$1</code></pre>'
		);

		// Inline code
		content = content.replace(
			/`([^`]+)`/g,
			'<code class="bg-zinc-800/50 px-1 py-0.5 rounded text-xs">$1</code>'
		);

		// Line breaks
		content = content.replace(/\n/g, '<br />');

		return content;
	}, [message.content, isEmpty]);

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={transition}
			className={cn(
				'flex w-full gap-3 py-2 group',
				isUser && 'flex-row-reverse'
			)}
			onMouseEnter={() => setShowTimestamp(true)}
			onMouseLeave={() => setShowTimestamp(false)}
		>
			{/* Avatar */}
			<div
				className={cn(
					'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
					isUser
						? 'bg-primary-500/20 text-primary-400'
						: 'bg-zinc-700/50 text-zinc-300'
				)}
			>
				{isUser ? (
					<User className='h-4 w-4' />
				) : (
					<Sparkles className='h-4 w-4' />
				)}
			</div>

			{/* Message content */}
			<div
				className={cn(
					'flex flex-col max-w-[85%] min-w-0',
					isUser && 'items-end'
				)}
			>
				<div
					className={cn(
						'rounded-lg px-4 py-2.5 text-sm leading-relaxed',
						isUser
							? 'bg-primary-500/20 text-text-primary border border-primary-500/30'
							: 'bg-zinc-800/50 text-text-primary border border-zinc-700/50 backdrop-blur-sm'
					)}
				>
					{isAssistant && isEmpty && isStreaming ? (
						<TypingIndicator />
					) : (
						<div
							className='prose prose-sm prose-invert max-w-none'
							dangerouslySetInnerHTML={{ __html: formattedContent || '' }}
						/>
					)}
				</div>

				{/* Timestamp on hover */}
				<motion.span
					initial={false}
					animate={{ opacity: showTimestamp ? 1 : 0 }}
					transition={{ duration: 0.15 }}
					className={cn(
						'text-[10px] text-zinc-500 mt-1 px-1',
						isUser && 'text-right'
					)}
				>
					{formatTime(
						message.timestamp instanceof Date
							? message.timestamp
							: new Date(message.timestamp)
					)}
				</motion.span>
			</div>
		</motion.div>
	);
}
