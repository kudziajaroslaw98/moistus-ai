'use client';

import useAppStore from '@/store/mind-map-store';
import { Send } from 'lucide-react';
import { motion } from 'motion/react';
import { memo, useRef, useState, type KeyboardEvent } from 'react';
import { useShallow } from 'zustand/shallow';
import { Button } from '../../ui/button';
import { GlassmorphismTheme } from '../themes/glassmorphism-theme';

interface CommentReplyInputProps {
	commentId: string;
}

/**
 * Input component for replying to comment threads
 * Supports @mentions and keyboard shortcuts
 */
const CommentReplyInputComponent = ({ commentId }: CommentReplyInputProps) => {
	const [content, setContent] = useState('');
	const [mentions, setMentions] = useState<string[]>([]);
	const [isSending, setIsSending] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const { addMessage } = useAppStore(
		useShallow((state) => ({
			addMessage: state.addMessage,
		}))
	);

	/**
	 * Auto-resize textarea as user types
	 */
	const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const textarea = e.target;
		setContent(textarea.value);

		// Auto-resize
		textarea.style.height = 'auto';
		textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;

		// Parse @mentions (simple implementation - can be enhanced)
		const mentionPattern = /@(\w+)/g;
		const foundMentions: string[] = [];
		let match;
		while ((match = mentionPattern.exec(textarea.value)) !== null) {
			foundMentions.push(match[1]);
		}
		setMentions(foundMentions);
	};

	/**
	 * Send message
	 */
	const handleSend = async () => {
		if (!content.trim() || isSending) return;

		setIsSending(true);

		try {
			await addMessage(commentId, {
				content: content.trim(),
				mentioned_users: mentions,
			});

			// Clear input on success
			setContent('');
			setMentions([]);
			if (textareaRef.current) {
				textareaRef.current.style.height = 'auto';
			}
		} catch (error) {
			console.error('Error sending message:', error);
		} finally {
			setIsSending(false);
		}
	};

	/**
	 * Handle keyboard shortcuts
	 * Enter = send
	 * Shift+Enter = newline
	 */
	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				duration: 0.2,
				ease: [0.25, 0.46, 0.45, 0.94], // ease-out-quad
			}}
			className='flex gap-2 p-3 border-t'
			style={{
				borderColor: GlassmorphismTheme.borders.default,
			}}
		>
			<textarea
				ref={textareaRef}
				value={content}
				onChange={handleInput}
				onKeyDown={handleKeyDown}
				placeholder='Write a reply... (use @name to mention)'
				className='flex-1 resize-none outline-none bg-transparent transition-all min-h-[36px] max-h-[120px] py-2 px-3 rounded-md'
				style={{
					color: GlassmorphismTheme.text.high,
					backgroundColor: GlassmorphismTheme.elevation[0],
					border: `1px solid ${GlassmorphismTheme.borders.default}`,
					fontSize: '14px',
					lineHeight: 1.5,
				}}
				onFocus={(e) => {
					e.target.style.borderColor = 'rgba(20, 184, 166, 0.5)';
				}}
				onBlur={(e) => {
					e.target.style.borderColor = GlassmorphismTheme.borders.default;
				}}
				aria-label='Reply to comment'
			/>

			<Button
				size='icon'
				variant='default'
				disabled={!content.trim() || isSending}
				onClick={handleSend}
				className='shrink-0'
				style={{
					backgroundColor: content.trim()
						? 'rgba(20, 184, 166, 0.87)'
						: GlassmorphismTheme.elevation[2],
					color: content.trim()
						? GlassmorphismTheme.text.high
						: GlassmorphismTheme.text.disabled,
					opacity: isSending ? 0.6 : 1,
				}}
				aria-label='Send message'
			>
				<Send className='size-4' />
			</Button>
		</motion.div>
	);
};

export const CommentReplyInput = memo(CommentReplyInputComponent);
CommentReplyInput.displayName = 'CommentReplyInput';
