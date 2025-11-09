'use client';

import useAppStore from '@/store/mind-map-store';
import { cn } from '@/utils/cn';
import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { memo, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { Button } from '../ui/button';
import { BaseNodeWrapper } from './base-node-wrapper';
import { CommentParticipantAvatars } from './components/comment-participant-avatars';
import { CommentReplyInput } from './components/comment-reply-input';
import { CommentThreadList } from './components/comment-thread-list';
import { type TypedNodeProps } from './core/types';

type CommentNodeProps = TypedNodeProps<'commentNode'>;

/**
 * CommentNode Component
 *
 * Displays a discussion thread on the canvas.
 * Only visible when comment mode is active.
 *
 * Features:
 * - Real-time message updates
 * - @mention support
 * - Emoji reactions
 * - Participant avatars
 * - Prev/next navigation
 */
const CommentNodeComponent = (props: CommentNodeProps) => {
	const { id, data, selected } = props;

	const { comments, commentMessages, fetchMessages, currentUser, nodes } =
		useAppStore(
			useShallow((state) => ({
				comments: state.comments,
				commentMessages: state.commentMessages,
				fetchMessages: state.fetchMessages,
				currentUser: state.currentUser,
				nodes: state.nodes,
			}))
		);

	// Find the comment data for this node
	const commentData = useMemo(() => {
		return comments.find((c) => c.id === id);
	}, [comments, id]);

	// Get messages for this comment
	const messages = useMemo(() => {
		return commentMessages[id] || [];
	}, [commentMessages, id]);

	// Calculate participants from messages
	const participants = useMemo(() => {
		if (messages.length === 0) return [];

		const participantMap = new Map<
			string,
			{
				user_id: string;
				display_name: string;
				avatar_url?: string;
				message_count: number;
			}
		>();

		messages.forEach((msg) => {
			const existing = participantMap.get(msg.user_id);
			const displayName =
				msg.user?.display_name || msg.user?.full_name || 'Unknown User';

			if (existing) {
				existing.message_count++;
			} else {
				participantMap.set(msg.user_id, {
					user_id: msg.user_id,
					display_name: displayName,
					avatar_url: msg.user?.avatar_url,
					message_count: 1,
				});
			}
		});

		return Array.from(participantMap.values()).sort(
			(a, b) => b.message_count - a.message_count
		);
	}, [messages]);

	// Find all comment nodes for navigation
	const commentNodes = useMemo(() => {
		return nodes.filter((node) => node.data.node_type === 'commentNode');
	}, [nodes]);

	const currentIndex = useMemo(() => {
		return commentNodes.findIndex((node) => node.id === id);
	}, [commentNodes, id]);

	const commentNumber = currentIndex + 1;
	const totalComments = commentNodes.length;

	const hasPrev = currentIndex > 0;
	const hasNext = currentIndex < totalComments - 1;

	const prevCommentId = hasPrev ? commentNodes[currentIndex - 1].id : null;
	const nextCommentId = hasNext ? commentNodes[currentIndex + 1].id : null;

	// Fetch messages when component mounts
	useEffect(() => {
		if (commentData) {
			fetchMessages(id);
		}
	}, [id, commentData, fetchMessages]);

	/**
	 * Navigate to another comment
	 */
	const handleNavigate = (targetId: string | null) => {
		if (!targetId) return;

		// Use React Flow's fitView to center the target node
		const targetNode = nodes.find((n) => n.id === targetId);
		if (targetNode) {
			// This will be handled by React Flow's built-in navigation
			// For now, we'll just log it - the actual implementation
			// would use reactFlowInstance.fitView with the target node
			console.log('Navigate to comment:', targetId);
		}
	};

	// Distinctive teal accent color for comment nodes
	const commentAccentColor = 'rgba(20, 184, 166, .4)'; // Teal-500
	const commentGlow = selected
		? '0 0 0 2px rgba(20, 184, 166, 0.4), 0 0 20px rgba(20, 184, 166, 0.2), 0 4px 12px rgba(0, 0, 0, 0.3)'
		: '0 0 0 1px rgba(20, 184, 166, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)';

	return (
		<BaseNodeWrapper
			{...props}
			hideNodeType
			hideAddButton
			hideResizeFrame
			elevation={2}
			includePadding={false}
			nodeClassName='comment-node'
			nodeIcon={<MessageSquare className='size-4' />}
			nodeType='Comment Thread'
			accentColor={commentAccentColor}
		>
			<motion.div
				initial={{ opacity: 0, scale: 0.95, y: 20 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				exit={{ opacity: 0, scale: 0.95, y: 20 }}
				transition={{
					duration: 0.2,
					ease: [0.25, 0.46, 0.45, 0.94], // ease-out-quad
				}}
				className='flex flex-col h-full rounded-lg overflow-hidden nowheel'
				onWheel={(e) => e.stopPropagation()}
				style={{
					border: `2px solid ${commentAccentColor}`,
					boxShadow: commentGlow,
					// Subtle teal background tint for extra distinction
					backgroundImage:
						'linear-gradient(to bottom, rgba(20, 184, 166, 0.04) 0%, transparent 100%)',
				}}
			>
				{/* Header */}
				<div
					className='flex items-center justify-between p-3 border-b'
					style={{
						borderColor: 'rgba(20, 184, 166, 0.2)',
						backgroundImage:
							'linear-gradient(to right, rgba(20, 184, 166, 0.05) 0%, transparent 100%)',
					}}
				>
					<div className='flex items-center gap-3'>
						<MessageSquare
							className='size-4'
							style={{ color: commentAccentColor }}
						/>
						<span className='text-sm font-medium text-text-primary'>
							Comment #{commentNumber}
						</span>

						{/* Participant Avatars */}
						{participants.length > 0 && (
							<CommentParticipantAvatars participants={participants} />
						)}
					</div>

					{/* Navigation */}
					<div className='flex items-center gap-1'>
						<Button
							size='sm'
							variant='ghost'
							disabled={!hasPrev}
							onClick={() => handleNavigate(prevCommentId)}
							className={cn(
								'size-7 p-0',
								hasPrev ? 'text-text-secondary' : 'text-text-disabled'
							)}
							aria-label='Previous comment'
						>
							<ChevronLeft className='size-4' />
						</Button>

						<span className='text-xs px-2 text-text-disabled'>
							{totalComments}
						</span>

						<Button
							size='sm'
							variant='ghost'
							disabled={!hasNext}
							onClick={() => handleNavigate(nextCommentId)}
							className={cn(
								'size-7 p-0',
								hasNext ? 'text-text-secondary' : 'text-text-disabled'
							)}
							aria-label='Next comment'
						>
							<ChevronRight className='size-4' />
						</Button>
					</div>
				</div>

				{/* Thread List */}
				<CommentThreadList
					messages={messages}
					currentUserId={currentUser?.id}
				/>

				{/* Reply Input */}
				<CommentReplyInput commentId={id} />
			</motion.div>
		</BaseNodeWrapper>
	);
};

const CommentNode = memo(CommentNodeComponent);
CommentNode.displayName = 'CommentNode';
export default CommentNode;
