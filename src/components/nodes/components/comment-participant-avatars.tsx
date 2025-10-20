'use client';

import type { CommentParticipant } from '@/types/comment';
import { motion } from 'motion/react';
import { memo } from 'react';

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
					key={participant.user_id}
					initial={{ opacity: 0, scale: 0.8, x: -10 }}
					animate={{ opacity: 1, scale: 1, x: 0 }}
					transition={{
						duration: 0.2,
						delay: (index + 1) * 0.05,
						ease: [0.215, 0.61, 0.355, 1], // ease-out-cubic
					}}
					className='relative flex items-center justify-center size-8 rounded-full border-2 cursor-pointer border-elevation-4'
					style={{
						backgroundColor: getUserColor(participant.user_id),
					}}
					title={`${participant.display_name} (${participant.message_count} messages)`}
				>
					{participant.avatar_url ? (
						<img
							src={participant.avatar_url}
							alt={participant.display_name}
							className='size-full rounded-full object-cover'
						/>
					) : (
						<span className='text-xs font-medium text-text-high'>
							{getInitials(participant.display_name)}
						</span>
					)}
				</motion.div>
			))}

			{remainingCount > 0 && (
				<motion.div
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{
						duration: 0.2,
						delay: displayParticipants.length * 0.05,
						ease: [0.215, 0.61, 0.355, 1],
					}}
					className='relative flex items-center justify-center size-8 rounded-full border-2 bg-elevation-2 border-elevation-4'
					title={`+${remainingCount} more participant${remainingCount > 1 ? 's' : ''}`}
				>
					<span className='text-xs font-medium text-text-medium'>
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
