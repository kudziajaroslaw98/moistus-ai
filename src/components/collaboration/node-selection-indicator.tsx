'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';
import { CollaborationUser } from '@/types/sharing-types';
import { Edit3, Eye, Lock, MessageSquare } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { getUserCursorColor } from './user-cursor';

interface NodeSelectionIndicatorProps {
	nodeId: string;
	selectedBy: CollaborationUser[];
	currentUserId?: string;
	position?: 'top' | 'bottom' | 'left' | 'right';
	className?: string;
}

// Get user initials
function getInitials(name: string): string {
	return name
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);
}

// Get activity icon
function getActivityIcon(activity?: string) {
	switch (activity) {
		case 'editing':
			return Edit3;
		case 'commenting':
			return MessageSquare;
		case 'viewing':
			return Eye;
		default:
			return null;
	}
}

// Single user indicator
function UserIndicator({
	user,
	isCurrentUser,
	size = 'default',
}: {
	user: CollaborationUser;
	isCurrentUser: boolean;
	size?: 'small' | 'default' | 'large';
}) {
	const sizeClasses = {
		small: 'h-6 w-6 text-xs',
		default: 'h-8 w-8 text-sm',
		large: 'h-10 w-10 text-base',
	};

	const color = getUserCursorColor(user.id);
	const ActivityIcon = getActivityIcon(user.current_activity);

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<motion.div
						initial={{ scale: 0, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0, opacity: 0 }}
						whileHover={{ scale: 1.1 }}
						transition={{
							type: 'spring',
							stiffness: 500,
							damping: 30,
						}}
						className='relative'
					>
						<Avatar
							className={cn(
								sizeClasses[size],
								'ring-2 transition-all duration-200',
								isCurrentUser ? 'ring-zinc-400' : ''
							)}
							style={{
								borderColor: color,
								boxShadow: `0 0 0 2px ${color}40`,
							}}
						>
							<AvatarImage
								src={
									user.avatar_url ||
									`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.display_name)}`
								}
								alt={user.display_name}
							/>

							<AvatarFallback
								className='text-white font-medium'
								style={{ backgroundColor: color }}
							>
								{getInitials(user.display_name)}
							</AvatarFallback>
						</Avatar>

						{/* Activity indicator */}
						{ActivityIcon && (
							<motion.div
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								className='absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center'
							>
								<ActivityIcon className='h-2.5 w-2.5 text-white' />
							</motion.div>
						)}
					</motion.div>
				</TooltipTrigger>

				<TooltipContent side='top' className='bg-zinc-900 border-zinc-700 p-2'>
					<div className='flex items-center gap-2'>
						<span className='font-medium text-zinc-100'>
							{user.display_name}
						</span>

						{isCurrentUser && (
							<Badge variant='secondary' className='text-xs'>
								You
							</Badge>
						)}
					</div>

					{user.current_activity && (
						<p className='text-xs text-zinc-400 mt-1'>
							{user.current_activity === 'editing' && 'Editing'}

							{user.current_activity === 'commenting' && 'Commenting'}

							{user.current_activity === 'viewing' && 'Viewing'}
						</p>
					)}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

export function NodeSelectionIndicator({
	nodeId,
	selectedBy,
	currentUserId,
	position = 'top',
	className,
}: NodeSelectionIndicatorProps) {
	const [isLocked, setIsLocked] = useState(false);
	const maxVisible = 3;

	// Check if current user is selecting this node
	const isCurrentUserSelecting = selectedBy.some((u) => u.id === currentUserId);

	// Sort users: current user first, then by selection time
	const sortedUsers = [...selectedBy].sort((a, b) => {
		if (a.id === currentUserId) return -1;
		if (b.id === currentUserId) return 1;
		return 0;
	});

	const visibleUsers = sortedUsers.slice(0, maxVisible);
	const hiddenCount = Math.max(0, sortedUsers.length - maxVisible);

	// Check if node is locked (someone is editing)
	useEffect(() => {
		setIsLocked(
			selectedBy.some(
				(u) => u.current_activity === 'editing' && u.id !== currentUserId
			)
		);
	}, [selectedBy, currentUserId]);

	if (selectedBy.length === 0) {
		return null;
	}

	const positionClasses = {
		top: '-top-10 left-1/2 -translate-x-1/2',
		bottom: '-bottom-10 left-1/2 -translate-x-1/2',
		left: 'left-0 top-1/2 -translate-y-1/2 -translate-x-full -ml-2',
		right: 'right-0 top-1/2 -translate-y-1/2 translate-x-full ml-2',
	};

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0, scale: 0.8 }}
				animate={{ opacity: 1, scale: 1 }}
				exit={{ opacity: 0, scale: 0.8 }}
				transition={{
					type: 'spring',
					stiffness: 500,
					damping: 30,
				}}
				className={cn(
					'absolute z-20 flex items-center gap-1',
					positionClasses[position],
					className
				)}
			>
				{/* Lock indicator */}
				{isLocked && (
					<motion.div
						initial={{ scale: 0, rotate: -180 }}
						animate={{ scale: 1, rotate: 0 }}
						className='flex items-center justify-center h-8 w-8 rounded-full bg-red-500/20 border-2 border-red-500'
					>
						<Lock className='h-4 w-4 text-red-400' />
					</motion.div>
				)}

				{/* User avatars */}
				<div className='flex -space-x-2'>
					{visibleUsers.map((user, index) => (
						<motion.div
							key={user.id}
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: index * 0.05 }}
							style={{ zIndex: maxVisible - index }}
						>
							<UserIndicator
								user={user}
								isCurrentUser={user.id === currentUserId}
								size='small'
							/>
						</motion.div>
					))}

					{/* Overflow indicator */}
					{hiddenCount > 0 && (
						<motion.div
							initial={{ opacity: 0, scale: 0 }}
							animate={{ opacity: 1, scale: 1 }}
							className='flex items-center justify-center h-6 w-6 rounded-full bg-zinc-800 border-2 border-zinc-700 text-xs font-medium text-zinc-300'
						>
							+{hiddenCount}
						</motion.div>
					)}
				</div>
			</motion.div>
		</AnimatePresence>
	);
}

// Selection outline component
interface SelectionOutlineProps {
	color: string;
	isLocked?: boolean;
	className?: string;
}

export function SelectionOutline({
	color,
	isLocked = false,
	className,
}: SelectionOutlineProps) {
	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: 0.95 }}
			className={cn(
				'absolute inset-0 rounded-lg pointer-events-none',
				className
			)}
			style={{
				boxShadow: isLocked
					? `0 0 0 2px #ef4444, 0 0 8px #ef444466`
					: `0 0 0 2px ${color}, 0 0 8px ${color}66`,
			}}
		>
			{/* Animated corner indicators */}
			<svg className='absolute inset-0 w-full h-full'>
				<defs>
					<pattern
						id='selection-pattern'
						x='0'
						y='0'
						width='8'
						height='8'
						patternUnits='userSpaceOnUse'
					>
						<circle
							cx='1'
							cy='1'
							r='1'
							fill={isLocked ? '#ef4444' : color}
							opacity='0.5'
						/>
					</pattern>
				</defs>

				<motion.rect
					x='0'
					y='0'
					width='100%'
					height='100%'
					fill='none'
					stroke={isLocked ? '#ef4444' : color}
					strokeWidth='2'
					strokeDasharray='5 5'
					rx='8'
					animate={{
						strokeDashoffset: [0, -10],
					}}
					transition={{
						duration: 1,
						repeat: Infinity,
						ease: 'linear',
					}}
				/>
			</svg>

			{/* Lock icon overlay */}
			{isLocked && (
				<motion.div
					initial={{ opacity: 0, scale: 0 }}
					animate={{ opacity: 1, scale: 1 }}
					className='absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-red-500/20 border border-red-500/50'
				>
					<Lock className='h-3 w-3 text-red-400' />

					<span className='text-xs text-red-400 font-medium'>Locked</span>
				</motion.div>
			)}
		</motion.div>
	);
}
