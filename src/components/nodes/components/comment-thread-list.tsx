'use client';

import type { CommentMessage } from '@/types/comment';
import { cn } from '@/utils/cn';
import { motion } from 'motion/react';
import { memo, ReactNode, useEffect, useRef } from 'react';
import { CommentReactions } from './comment-reactions';

/**
 * Format a date as relative time (e.g., "2 hours ago")
 */
const formatRelativeTime = (date: Date): string => {
	const now = new Date();
	const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (seconds < 60) return 'just now';
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
	if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
	if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
	return `${Math.floor(seconds / 2592000)}mo ago`;
};

interface CommentThreadListProps {
	messages: CommentMessage[];
	currentUserId?: string;
}

/**
 * Display a list of messages in a comment thread
 * with smooth stagger animations
 */
const CommentThreadListComponent = ({
	messages,
	currentUserId,
}: CommentThreadListProps) => {
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	/**
	 * Auto-scroll to bottom when messages change
	 */
	useEffect(() => {
		if (scrollContainerRef.current) {
			scrollContainerRef.current.scrollTop =
				scrollContainerRef.current.scrollHeight;
		}
	}, [messages]);

	/**
	 * Get initials from display name
	 */
	const getInitials = (name: string): string => {
		return name
			.split(' ')
			.map((part) => part[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	};

	/**
	 * Generate consistent color for user based on their ID
	 */
	const getUserColor = (userId: string): string => {
		const colors = [
			'rgba(96, 165, 250, 0.3)', // Blue
			'rgba(167, 139, 250, 0.3)', // Purple
			'rgba(244, 114, 182, 0.3)', // Pink
			'rgba(251, 146, 60, 0.3)', // Orange
			'rgba(34, 197, 94, 0.3)', // Green
			'rgba(234, 179, 8, 0.3)', // Yellow
		];
		const hash = userId
			.split('')
			.reduce((acc, char) => acc + char.charCodeAt(0), 0);
		return colors[hash % colors.length];
	};

	/**
	 * Highlight @mentions in message content
	 */
	const renderContentWithMentions = (content: string): ReactNode => {
		const mentionPattern = /(@\w+)/g;
		const parts = content.split(mentionPattern);

		return parts.map((part, index) => {
			if (part.startsWith('@')) {
				return (
					<span
						className='font-medium px-1 rounded'
						key={index}
						style={{
							backgroundColor: 'rgba(20, 184, 166, 0.2)',
							color: 'rgba(20, 184, 166, 0.87)',
						}}
					>
						{part}
					</span>
				);
			}
			return <span key={index}>{part}</span>;
		});
	};

	if (messages.length === 0) {
		return (
			<div className='flex-1 flex items-center justify-center p-4 h-full max-h-[455px]'>
				<span className='text-sm text-center text-text-disabled flex-1 h-full'>
					No messages yet. Start the conversation!
				</span>
			</div>
		);
	}

	// Fixed height for ~5 messages (each message ~56px) with scrolling
	// Total: header(52px) + threadList(max 280px) + input(~68px) = ~400px
	return (
		<div
			className='flex flex-col overflow-y-scroll p-3 gap-3 nowheel max-h-[455px] flex-1'
			onWheel={(e) => e.stopPropagation()}
			ref={scrollContainerRef}
		>
			{messages.map((message, index) => {
				const displayName =
					message.user?.display_name ||
					message.user?.full_name ||
					'Unknown User';
				const isCurrentUser = currentUserId === message.user_id;

				return (
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className='flex gap-2'
						initial={{ opacity: 0, y: 10 }}
						key={message.id}
						transition={{
							duration: 0.2,
							delay: index * 0.05, // 50ms stagger
							ease: [0.215, 0.61, 0.355, 1], // ease-out-cubic
						}}
					>
						{/* Avatar */}
						<div
							className='shrink-0 size-8 rounded-full flex items-center justify-center border-2 border-elevation-4 '
							style={{
								backgroundColor: getUserColor(message.user_id),
							}}
						>
							{message.user?.avatar_url ? (
								<img
									alt={displayName}
									className='size-full rounded-full object-cover'
									src={message.user.avatar_url}
								/>
							) : (
								<span className='text-xs font-medium text-text-primary'>
									{getInitials(displayName)}
								</span>
							)}
						</div>

						{/* Message Content */}
						<div className='flex-1 min-w-0'>
							{/* Header */}
							<div className='flex items-baseline gap-2 mb-1'>
								<span
									className={cn(
										'text-sm font-medium',
										isCurrentUser
											? 'text-[rgba(20,184,166,0.87)]'
											: 'text-text-primary'
									)}
								>
									{displayName}

									{isCurrentUser && (
										<span className='ml-1 text-xs font-normal text-text-disabled'>
											(you)
										</span>
									)}
								</span>

								<span
									className='text-xs text-text-disabled'
									title={new Date(message.created_at).toLocaleString()}
								>
									{formatRelativeTime(new Date(message.created_at))}
								</span>
							</div>

							{/* Message Text */}
							<p className='text-sm mb-2 whitespace-pre-wrap break-words text-text-secondary leadin-5'>
								{renderContentWithMentions(message.content)}
							</p>

							{/* Reactions */}
							<CommentReactions message={message} />
						</div>
					</motion.div>
				);
			})}
		</div>
	);
};

export const CommentThreadList = memo(CommentThreadListComponent);
CommentThreadList.displayName = 'CommentThreadList';
