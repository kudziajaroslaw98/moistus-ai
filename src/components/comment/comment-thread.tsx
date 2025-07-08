import { Comment, MapComment, NodeComment } from '@/types/comment-types';
import { cn } from '@/utils/cn';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Button } from '../ui/button';
import { CommentItem } from './comment-item';

interface CommentThreadProps {
	comment: Comment;
	allComments: Comment[];
	depth?: number;
	maxDepth?: number;
	onReply: (commentId: string) => void;
	onEdit: (commentId: string, content: string) => void;
	onDelete: (commentId: string) => void;
	onResolve: (commentId: string) => void;
	onUnresolve: (commentId: string) => void;
	onAddReaction: (commentId: string, emoji: string) => void;
	onRemoveReaction: (commentId: string, reactionId: string) => void;
	currentUserId?: string;
}

export function CommentThread({
	comment,
	allComments,
	depth = 0,
	maxDepth = 5,
	onReply,
	onEdit,
	onDelete,
	onResolve,
	onUnresolve,
	onAddReaction,
	onRemoveReaction,
	currentUserId,
}: CommentThreadProps) {
	const [isExpanded, setIsExpanded] = useState(depth < 2); // Auto-expand first 2 levels

	// Get direct replies to this comment
	const replies = allComments.filter((c) => c.parent_comment_id === comment.id);

	return (
		<div className='space-y-2'>
			<CommentItem
				comment={comment as NodeComment | MapComment}
				depth={depth}
				maxDepth={maxDepth}
				onReply={onReply}
				onEdit={onEdit}
				onDelete={onDelete}
				onResolve={onResolve}
				onUnresolve={onUnresolve}
				onAddReaction={onAddReaction}
				onRemoveReaction={onRemoveReaction}
				currentUserId={currentUserId}
			/>

			{replies.length > 0 && (
				<div className={cn('ml-2', depth > 0 && 'ml-6')}>
					<Button
						variant='ghost'
						size='sm'
						onClick={() => setIsExpanded(!isExpanded)}
						className='mb-2 text-xs text-zinc-400 hover:text-zinc-300 h-6'
					>
						{isExpanded ? (
							<ChevronDown className='size-3 mr-1' />
						) : (
							<ChevronRight className='size-3 mr-1' />
						)}

						{replies.length} {replies.length === 1 ? 'reply' : 'replies'}
					</Button>

					<AnimatePresence>
						{isExpanded && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: 'auto' }}
								exit={{ opacity: 0, height: 0 }}
								className='space-y-2'
							>
								{replies.map((reply) => (
									<CommentThread
										key={reply.id}
										comment={reply}
										allComments={allComments}
										depth={depth + 1}
										maxDepth={maxDepth}
										onReply={onReply}
										onEdit={onEdit}
										onDelete={onDelete}
										onResolve={onResolve}
										onUnresolve={onUnresolve}
										onAddReaction={onAddReaction}
										onRemoveReaction={onRemoveReaction}
										currentUserId={currentUserId}
									/>
								))}
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			)}
		</div>
	);
}
