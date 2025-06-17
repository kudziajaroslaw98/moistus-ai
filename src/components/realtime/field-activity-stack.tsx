'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/Tooltip';
import useAppStore from '@/store/mind-map-store';
import type { FieldActivityUser } from '@/store/slices/realtime-slice';
import { cn } from '@/utils/cn';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo } from 'react';
import { useShallow } from 'zustand/shallow';

interface FieldActivityStackProps {
	fieldName: string;
	maxUsers?: number;
	showLabels?: boolean;
	size?: 'sm' | 'md' | 'lg';
	animate?: boolean;
	className?: string;
}

const sizeClasses = {
	sm: {
		avatar: 'h-6 w-6 text-xs',
		text: 'text-xs',
		spacing: '-space-x-1',
	},
	md: {
		avatar: 'h-8 w-8 text-sm',
		text: 'text-sm',
		spacing: '-space-x-2',
	},
	lg: {
		avatar: 'h-10 w-10 text-base',
		text: 'text-base',
		spacing: '-space-x-2',
	},
};

export function FieldActivityStack({
	fieldName,
	maxUsers = 4,
	showLabels = false,
	size = 'md',
	animate = true,
	className,
}: FieldActivityStackProps) {
	const { getActiveUsersForField, currentUser } = useAppStore(
		useShallow((state) => ({
			getActiveUsersForField: state.getActiveUsersForField,
			currentUser: state.currentUser,
		}))
	);

	const activeUsers = getActiveUsersForField(fieldName);

	// Filter out current user and sort by last active time
	const filteredUsers = useMemo(() => {
		return activeUsers
			.filter((user) => user.userId !== currentUser?.id)
			.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
	}, [activeUsers, currentUser?.id]);

	const visibleUsers = filteredUsers.slice(0, maxUsers);
	const hiddenCount = Math.max(0, filteredUsers.length - maxUsers);

	if (filteredUsers.length === 0) {
		return null;
	}

	const UserAvatar = ({
		user,
		index,
	}: {
		user: FieldActivityUser;
		index: number;
	}) => {
		const initials = user.displayName
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase())
			.join('')
			.slice(0, 2);

		const isRecentlyActive = Date.now() - user.lastActiveAt < 30000; // 30 seconds

		return (
			<TooltipProvider key={user.userId}>
				<Tooltip>
					<TooltipTrigger asChild>
						<motion.div
							layout={animate}
							initial={animate ? { scale: 0, opacity: 0 } : undefined}
							animate={{ scale: 1, opacity: 1 }}
							exit={animate ? { scale: 0, opacity: 0 } : undefined}
							transition={{
								type: 'spring',
								stiffness: 500,
								damping: 25,
								delay: index * 0.05,
							}}
							className={cn(
								'relative',
								size === 'sm' && 'ring-1 ring-white/20',
								size !== 'sm' && 'ring-2 ring-white/20'
							)}
							style={{
								borderRadius: '50%',
								zIndex: filteredUsers.length - index,
							}}
						>
							<Avatar
								className={cn(
									sizeClasses[size].avatar,
									'border-2 transition-all duration-200',
									isRecentlyActive
										? 'border-green-400 shadow-lg shadow-green-400/20'
										: 'border-zinc-600'
								)}
								style={{
									borderColor: user.color,
									boxShadow: isRecentlyActive
										? `0 0 0 1px ${user.color}40, 0 0 12px ${user.color}20`
										: undefined,
								}}
							>
								<AvatarImage
									src={user.avatarUrl}
									alt={user.displayName}
									className='object-cover'
								/>
								<AvatarFallback
									className={cn(
										'font-semibold text-white',
										sizeClasses[size].text
									)}
									style={{
										backgroundColor: user.color,
									}}
								>
									{initials}
								</AvatarFallback>
							</Avatar>

							{/* Active indicator */}
							{isRecentlyActive && (
								<motion.div
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									className={cn(
										'absolute -bottom-0.5 -right-0.5 rounded-full bg-green-400',
										size === 'sm' && 'h-2 w-2',
										size === 'md' && 'h-2.5 w-2.5',
										size === 'lg' && 'h-3 w-3'
									)}
								>
									<motion.div
										animate={{
											scale: [1, 1.2, 1],
											opacity: [1, 0.8, 1],
										}}
										transition={{
											duration: 2,
											repeat: Infinity,
											ease: 'easeInOut',
										}}
										className='h-full w-full rounded-full bg-green-400'
									/>
								</motion.div>
							)}
						</motion.div>
					</TooltipTrigger>
					<TooltipContent side='top' className='z-50'>
						<div className='text-center'>
							<p className='font-medium'>{user.displayName}</p>
							<p className='text-xs text-zinc-400'>
								{user.displayName} •{' '}
								{isRecentlyActive ? 'Active now' : 'Recently active'}
							</p>
							{user.isAnonymous && (
								<p className='text-xs text-amber-400'>Guest user</p>
							)}
						</div>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		);
	};

	return (
		<div className={cn('flex items-center gap-2', className)}>
			<div className={cn('flex items-center', sizeClasses[size].spacing)}>
				<AnimatePresence mode='popLayout'>
					{visibleUsers.map((user, index) => (
						<UserAvatar key={user.userId} user={user} index={index} />
					))}
				</AnimatePresence>

				{/* Overflow indicator */}
				{hiddenCount > 0 && (
					<motion.div
						initial={animate ? { scale: 0, opacity: 0 } : undefined}
						animate={{ scale: 1, opacity: 1 }}
						className={cn(
							'flex items-center justify-center rounded-full bg-zinc-700 border-2 border-zinc-500 text-zinc-300 font-medium',
							sizeClasses[size].avatar,
							sizeClasses[size].text
						)}
						style={{ zIndex: 0 }}
					>
						+{hiddenCount}
					</motion.div>
				)}
			</div>

			{/* Labels */}
			{showLabels && filteredUsers.length > 0 && (
				<motion.div
					initial={animate ? { opacity: 0, x: -10 } : undefined}
					animate={{ opacity: 1, x: 0 }}
					className='flex flex-col'
				>
					<span
						className={cn('text-zinc-300 font-medium', sizeClasses[size].text)}
					>
						{filteredUsers.length === 1
							? `${filteredUsers[0].displayName} is editing`
							: `${filteredUsers.length} users editing`}
					</span>
					{filteredUsers.length === 1 && (
						<span className='text-xs text-zinc-500'>
							{filteredUsers[0].displayName}
						</span>
					)}
				</motion.div>
			)}
		</div>
	);
}
