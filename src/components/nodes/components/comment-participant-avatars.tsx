'use client';

import type { CommentParticipant } from '@/types/comment';
import { motion } from 'motion/react';
import { memo } from 'react';
import { GlassmorphismTheme } from '../themes/glassmorphism-theme';

interface CommentParticipantAvatarsProps {
	participants: CommentParticipant[];
	maxDisplay?: number;
}

/**
 * Display participant avatars in a stacked arrangement
 */
const CommentParticipantAvatarsComponent = ({
	participants,
	maxDisplay = 4,
}: CommentParticipantAvatarsProps) => {
	const displayParticipants = participants.slice(0, maxDisplay);
	const remainingCount = Math.max(0, participants.length - maxDisplay);

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

	if (participants.length === 0) {
		return null;
	}

	return (
		<div className='flex items-center -space-x-2'>
			{displayParticipants.map((participant, index) => (
				<motion.div
					animate={{ opacity: 1, scale: 1, x: 0 }}
					className='relative flex items-center justify-center size-8 rounded-full border-2 cursor-pointer '
					initial={{ opacity: 0, scale: 0.8, x: -10 }}
					key={participant.user_id}
					title={`${participant.display_name} (${participant.message_count} messages)`}
					style={{
						backgroundColor: getUserColor(participant.user_id),
						borderColor: GlassmorphismTheme.elevation[4],
					}}
					transition={{
						duration: 0.2,
						delay: (index + 1) * 0.05,
						ease: [0.215, 0.61, 0.355, 1], // ease-out-cubic
					}}
				>
					{participant.avatar_url ? (
						<img
							alt={participant.display_name}
							className='size-full rounded-full object-cover'
							src={participant.avatar_url}
						/>
					) : (
						<span
							className='text-xs font-medium'
							style={{ color: GlassmorphismTheme.text.high }}
						>
							{getInitials(participant.display_name)}
						</span>
					)}
				</motion.div>
			))}

			{remainingCount > 0 && (
				<motion.div
					animate={{ opacity: 1, scale: 1 }}
					className='relative flex items-center justify-center size-8 rounded-full border-2'
					initial={{ opacity: 0, scale: 0.8 }}
					title={`+${remainingCount} more participant${remainingCount > 1 ? 's' : ''}`}
					style={{
						backgroundColor: GlassmorphismTheme.elevation[2],
						borderColor: GlassmorphismTheme.elevation[4],
					}}
					transition={{
						duration: 0.2,
						delay: displayParticipants.length * 0.05,
						ease: [0.215, 0.61, 0.355, 1],
					}}
				>
					<span
						className='text-xs font-medium'
						style={{ color: GlassmorphismTheme.text.medium }}
					>
						+{remainingCount}
					</span>
				</motion.div>
			)}
		</div>
	);
};

export const CommentParticipantAvatars = memo(
	CommentParticipantAvatarsComponent
);
CommentParticipantAvatars.displayName = 'CommentParticipantAvatars';
