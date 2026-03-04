'use client';

import useAppStore from '@/store/mind-map-store';
import type { MentionableUser } from '@/types/notification';
import { slugifyCollaborator } from '@/utils/collaborator-utils';
import { cn } from '@/utils/cn';
import { Send } from 'lucide-react';
import { motion } from 'motion/react';
import { memo, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useShallow } from 'zustand/shallow';
import { Button } from '../../ui/button';

interface CommentReplyInputProps {
	commentId: string;
}

/**
 * Input component for replying to comment threads
 * Supports @mentions and keyboard shortcuts
 */
const CommentReplyInputComponent = ({ commentId }: CommentReplyInputProps) => {
	const [content, setContent] = useState('');
	const [mentionSlugs, setMentionSlugs] = useState<string[]>([]);
	const [mentionableUsers, setMentionableUsers] = useState<MentionableUser[]>([]);
	const [isSending, setIsSending] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const { addMessage, mapId, currentShares } = useAppStore(
		useShallow((state) => ({
			addMessage: state.addMessage,
			mapId: state.mapId,
			currentShares: state.currentShares,
		}))
	);

	const mentionSlugToUserId = useMemo(() => {
		const map = new Map<string, string>();
		if (mentionableUsers.length > 0) {
			for (const user of mentionableUsers) {
				map.set(user.slug.toLowerCase(), user.userId);
			}
			return map;
		}

		for (const share of currentShares ?? []) {
			const slug = slugifyCollaborator(share);
			if (slug) {
				map.set(slug.toLowerCase(), share.user_id);
			}
		}
		return map;
	}, [mentionableUsers, currentShares]);

	useEffect(() => {
		if (!mapId) {
			setMentionableUsers([]);
			return;
		}

		const abortController = new AbortController();
		const fetchMentionableUsers = async () => {
			try {
				const response = await fetch(`/api/maps/${mapId}/mentionable-users`, {
					signal: abortController.signal,
				});
				if (!response.ok) {
					return;
				}
				const result = await response.json();
				if (result?.status === 'success' && Array.isArray(result?.data?.users)) {
					setMentionableUsers(result.data.users as MentionableUser[]);
				}
			} catch (error) {
				if ((error as Error).name === 'AbortError') {
					return;
				}
				console.warn('[comment-reply-input] failed to load mentionable users', error);
			}
		};

		void fetchMentionableUsers();
		return () => abortController.abort();
	}, [mapId]);

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
			foundMentions.push(match[1].toLowerCase());
		}
		setMentionSlugs(foundMentions);
	};

	/**
	 * Send message
	 */
	const handleSend = async () => {
		if (!content.trim() || isSending) return;

		setIsSending(true);
		const mentionedUserIds = Array.from(
			new Set(
				mentionSlugs
					.map((slug) => mentionSlugToUserId.get(slug))
					.filter((userId): userId is string => Boolean(userId))
			)
		);

		try {
			await addMessage(commentId, {
				content: content.trim(),
				mentioned_users: mentionedUserIds,
			});

			// Clear input on success
			setContent('');
			setMentionSlugs([]);
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
			animate={{ opacity: 1, y: 0 }}
			className='flex gap-2 p-3 border-t border-border-default nowheel'
			initial={{ opacity: 0, y: 10 }}
			transition={{
				duration: 0.2,
				ease: [0.25, 0.46, 0.45, 0.94], // ease-out-quad
			}}
		>
			<textarea
				aria-label='Reply to comment'
				className='flex-1 resize-none outline-none transition-all min-h-[36px] max-h-[120px] py-2 px-3 rounded-md text-text-primary bg-base border border-border-default text-sm leading-5 focus:border-cyan-500/50 nodrag'
				onChange={handleInput}
				onKeyDown={handleKeyDown}
				placeholder='Write a reply... (use @name to mention)'
				ref={textareaRef}
				value={content}
			/>

			<Button
				aria-label='Send message'
				disabled={!content.trim() || isSending}
				onClick={handleSend}
				size='icon'
				variant='default'
				className={cn(
					'shrink-0',
					content.trim() ? 'bg-[rgba(20,184,166,0.87)]' : 'bg-elevated',
					content.trim() ? 'text-text-primary' : 'text-text-disabled',
					isSending ? 'opacity-60' : ''
				)}
			>
				<Send className='size-4' />
			</Button>
		</motion.div>
	);
};

export const CommentReplyInput = memo(CommentReplyInputComponent);
CommentReplyInput.displayName = 'CommentReplyInput';
