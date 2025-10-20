'use client';

import useAppStore from '@/store/mind-map-store';
import type { CommentMessage, GroupedReaction } from '@/types/comment';
import { Smile } from 'lucide-react';
import { motion } from 'motion/react';
import { memo, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { Button } from '../../ui/button';
import { GlassmorphismTheme } from '../themes/glassmorphism-theme';

interface CommentReactionsProps {
	message: CommentMessage;
}

/**
 * Display and manage emoji reactions on a comment message
 */
const CommentReactionsComponent = ({ message }: CommentReactionsProps) => {
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const { addReaction, removeReaction, currentUser } = useAppStore(
		useShallow((state) => ({
			addReaction: state.addReaction,
			removeReaction: state.removeReaction,
			currentUser: state.currentUser,
		}))
	);

	// Common emoji reactions
	const quickEmojis = ['👍', '❤️', '😊', '🎉', '🤔', '👀'];

	/**
	 * Group reactions by emoji and check if current user reacted
	 */
	const groupedReactions = useMemo((): GroupedReaction[] => {
		const reactions = message.reactions || [];
		const grouped = new Map<string, GroupedReaction>();

		reactions.forEach((reaction) => {
			const existing = grouped.get(reaction.emoji);
			if (existing) {
				existing.count++;
				existing.user_ids.push(reaction.user_id);
				if (currentUser && reaction.user_id === currentUser.id) {
					existing.has_current_user = true;
				}
			} else {
				grouped.set(reaction.emoji, {
					emoji: reaction.emoji,
					count: 1,
					user_ids: [reaction.user_id],
					has_current_user: currentUser
						? reaction.user_id === currentUser.id
						: false,
				});
			}
		});

		return Array.from(grouped.values());
	}, [message.reactions, currentUser]);

	/**
	 * Handle reaction click (add or remove)
	 */
	const handleReactionClick = async (
		emoji: string,
		hasCurrentUser: boolean
	) => {
		if (!currentUser) return;

		if (hasCurrentUser) {
			// Find and remove user's reaction
			const reaction = message.reactions?.find(
				(r) => r.emoji === emoji && r.user_id === currentUser.id
			);
			if (reaction) {
				await removeReaction(reaction.id);
			}
		} else {
			// Add new reaction
			await addReaction(message.id, { emoji });
		}
	};

	/**
	 * Handle quick emoji click from picker
	 */
	const handleQuickEmojiClick = async (emoji: string) => {
		if (!currentUser) return;

		const existingGroup = groupedReactions.find((g) => g.emoji === emoji);
		if (existingGroup?.has_current_user) {
			const reaction = message.reactions?.find(
				(r) => r.emoji === emoji && r.user_id === currentUser.id
			);
			if (reaction) {
				await removeReaction(reaction.id);
			}
		} else {
			await addReaction(message.id, { emoji });
		}

		setShowEmojiPicker(false);
	};

	return (
		<div className='flex items-center gap-2 flex-wrap relative'>
			{/* Existing Reactions */}
			{groupedReactions.map((reaction, index) => (
				<motion.button
					key={reaction.emoji}
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{
						duration: 0.15,
						delay: index * 0.03,
						ease: [0.25, 0.46, 0.45, 0.94], // ease-out-quad
					}}
					className='flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all hover:scale-105'
					style={{
						backgroundColor: reaction.has_current_user
							? 'rgba(20, 184, 166, 0.2)'
							: GlassmorphismTheme.elevation[1],
						border: `1px solid ${
							reaction.has_current_user
								? 'rgba(20, 184, 166, 0.3)'
								: GlassmorphismTheme.borders.default
						}`,
						color: GlassmorphismTheme.text.high,
					}}
					title={`${reaction.count} ${reaction.count > 1 ? 'people' : 'person'} reacted`}
					onClick={() =>
						handleReactionClick(reaction.emoji, reaction.has_current_user)
					}
				>
					<span>{reaction.emoji}</span>
					<span
						className='font-medium'
						style={{ color: GlassmorphismTheme.text.medium }}
					>
						{reaction.count}
					</span>
				</motion.button>
			))}

			{/* Add Reaction Button */}
			<div className='relative'>
				<Button
					size='sm'
					variant='ghost'
					className='size-7 p-0'
					style={{
						color: GlassmorphismTheme.text.disabled,
					}}
					onClick={() => setShowEmojiPicker(!showEmojiPicker)}
					aria-label='Add reaction'
				>
					<Smile className='size-4' />
				</Button>

				{/* Quick Emoji Picker */}
				{showEmojiPicker && (
					<motion.div
						initial={{ opacity: 0, scale: 0.9, y: -10 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.9, y: -10 }}
						transition={{
							duration: 0.15,
							ease: [0.25, 0.46, 0.45, 0.94],
						}}
						className='absolute bottom-full mb-2 left-0 flex gap-1 p-2 rounded-lg shadow-lg z-10'
						style={{
							backgroundColor: GlassmorphismTheme.elevation[2],
							border: `1px solid ${GlassmorphismTheme.borders.default}`,
						}}
					>
						{quickEmojis.map((emoji, index) => (
							<motion.button
								key={emoji}
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{
									duration: 0.15,
									delay: index * 0.03,
									ease: [0.215, 0.61, 0.355, 1],
								}}
								className='size-8 flex items-center justify-center rounded hover:bg-opacity-10 transition-colors text-lg'
								style={{
									backgroundColor: 'transparent',
								}}
								onClick={() => handleQuickEmojiClick(emoji)}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor =
										GlassmorphismTheme.elevation[1];
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor = 'transparent';
								}}
							>
								{emoji}
							</motion.button>
						))}
					</motion.div>
				)}
			</div>
		</div>
	);
};

export const CommentReactions = memo(CommentReactionsComponent);
CommentReactions.displayName = 'CommentReactions';
