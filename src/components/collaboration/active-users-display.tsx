'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/Tooltip';
import useAppStore from '@/contexts/mind-map/mind-map-store';
import { cn } from '@/lib/utils';
import { ActiveUser } from '@/types/collaboration-types';
import {
	CollaborationUser,
	ShareRole,
	UserActivity,
} from '@/types/sharing-types';
import {
	Circle,
	Edit3,
	Eye,
	MessageSquare,
	MousePointer2,
	Users,
	Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';

interface ActiveUsersDisplayProps {
	mapId: string;
	maxVisible?: number;
	showActivity?: boolean;
	className?: string;
}

// Convert ActiveUser to CollaborationUser for UI consistency
function mapActiveUserToCollaborationUser(
	activeUser: ActiveUser
): CollaborationUser {
	return {
		id: activeUser.id,
		display_name: activeUser.profile?.display_name || activeUser.name,
		email: activeUser.email,
		avatar_url: activeUser.avatar_url,
		role: (activeUser.profile?.role as ShareRole) || 'viewer',
		is_guest: false,
		current_activity: 'viewing' as UserActivity,
		joined_at: activeUser.presence.created_at,
		last_activity: activeUser.presence.last_activity,
		color: activeUser.presence.user_color,
	};
}

// Activity indicator component
function ActivityIndicator({ activity }: { activity: string }) {
	const activityConfig = {
		editing: { icon: Edit3, color: 'text-green-400', pulse: true },
		commenting: { icon: MessageSquare, color: 'text-blue-400', pulse: false },
		viewing: { icon: Eye, color: 'text-zinc-400', pulse: false },
		moving: { icon: MousePointer2, color: 'text-yellow-400', pulse: false },
		idle: { icon: Circle, color: 'text-zinc-600', pulse: false },
	};

	const config =
		activityConfig[activity as keyof typeof activityConfig] ||
		activityConfig.idle;
	const Icon = config.icon;

	return (
		<div className='absolute -bottom-1 -right-1 z-10'>
			<div
				className={cn(
					'relative rounded-full bg-zinc-900 p-0.5',
					config.pulse && 'animate-pulse'
				)}
			>
				<Icon className={cn('h-3 w-3', config.color)} />
			</div>
		</div>
	);
}

// User avatar component
function UserAvatar({
	user,
	showActivity = true,
	size = 'default',
}: {
	user: CollaborationUser;
	showActivity?: boolean;
	size?: 'small' | 'default' | 'large';
}) {
	const sizeClasses = {
		small: 'h-8 w-8',
		default: 'h-10 w-10',
		large: 'h-12 w-12',
	};

	const getInitials = (name: string) => {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	};

	const getRoleBorderColor = (role: string) => {
		switch (role) {
			case 'owner':
				return 'ring-2 ring-purple-500';
			case 'editor':
				return 'ring-2 ring-green-500';
			case 'commenter':
				return 'ring-2 ring-blue-500';
			default:
				return 'ring-2 ring-zinc-600';
		}
	};

	return (
		<div className='relative'>
			<Avatar
				className={cn(
					sizeClasses[size],
					getRoleBorderColor(user.role),
					'transition-all duration-200'
				)}
			>
				<AvatarImage
					src={
						user.avatar_url ||
						`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.display_name)}`
					}
					alt={user.display_name}
				/>

				<AvatarFallback className='bg-zinc-800 text-zinc-200 text-xs'>
					{getInitials(user.display_name)}
				</AvatarFallback>
			</Avatar>

			{showActivity && user.current_activity && (
				<ActivityIndicator activity={user.current_activity} />
			)}
		</div>
	);
}

export function ActiveUsersDisplay({
	mapId,
	maxVisible = 5,
	showActivity = true,
	className,
}: ActiveUsersDisplayProps) {
	const { activeUsers, currentUser } = useAppStore();

	const [isExpanded, setIsExpanded] = useState(false);
	const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);

	// Convert ActiveUser[] to CollaborationUser[] for UI
	const collaborationUsers = useMemo(() => {
		return activeUsers.map(mapActiveUserToCollaborationUser);
	}, [activeUsers]);

	// Sort users: owner first, then by join time
	const sortedUsers = useMemo(() => {
		return [...collaborationUsers].sort((a, b) => {
			if (a.role === 'owner') return -1;
			if (b.role === 'owner') return 1;
			return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
		});
	}, [collaborationUsers]);

	const visibleUsers = isExpanded
		? sortedUsers
		: sortedUsers.slice(0, maxVisible);
	const hiddenCount = Math.max(0, sortedUsers.length - maxVisible);

	const getRoleLabel = (role: string) => {
		switch (role) {
			case 'owner':
				return 'Owner';
			case 'editor':
				return 'Editor';
			case 'commenter':
				return 'Commenter';
			default:
				return 'Viewer';
		}
	};

	const getActivityLabel = (activity: string) => {
		switch (activity) {
			case 'editing':
				return 'Editing';
			case 'commenting':
				return 'Commenting';
			case 'viewing':
				return 'Viewing';
			case 'moving':
				return 'Moving cursor';
			default:
				return 'Idle';
		}
	};

	const formatJoinTime = (joinedAt: string) => {
		const joinTime = new Date(joinedAt);
		const now = new Date();
		const diffMs = now.getTime() - joinTime.getTime();
		const diffMins = Math.floor(diffMs / 60000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;

		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `${diffHours}h ago`;

		return `${Math.floor(diffHours / 24)}d ago`;
	};

	if (sortedUsers.length === 0) {
		return null;
	}

	return (
		<TooltipProvider>
			<div className={cn('flex items-center gap-2', className)}>
				{/* Active user count */}
				<motion.div
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					className='flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700'
				>
					<Users className='h-4 w-4 text-zinc-400' />

					<span className='text-sm font-medium text-zinc-200'>
						{sortedUsers.length}
					</span>

					<span className='text-xs text-zinc-400'>
						{sortedUsers.length === 1 ? 'user' : 'users'}
					</span>

					{sortedUsers.some((u) => u.current_activity === 'editing') && (
						<Zap className='h-3 w-3 text-green-400 animate-pulse' />
					)}
				</motion.div>

				{/* Avatar stack */}
				<div className='flex -space-x-3'>
					<AnimatePresence mode='popLayout'>
						{visibleUsers.map((user, index) => (
							<motion.div
								key={user.id}
								layoutId={`user-${user.id}`}
								initial={{ opacity: 0, scale: 0, x: -20 }}
								animate={{
									opacity: 1,
									scale: 1,
									x: 0,
									zIndex: sortedUsers.length - index,
								}}
								exit={{ opacity: 0, scale: 0, x: -20 }}
								transition={{
									type: 'spring',
									stiffness: 500,
									damping: 30,
									delay: index * 0.05,
								}}
								onHoverStart={() => setHoveredUserId(user.id)}
								onHoverEnd={() => setHoveredUserId(null)}
								style={{
									zIndex:
										hoveredUserId === user.id ? 50 : sortedUsers.length - index,
								}}
								className='relative'
							>
								<Tooltip>
									<TooltipTrigger asChild>
										<motion.div
											whileHover={{ scale: 1.1, y: -4 }}
											transition={{
												type: 'spring',
												stiffness: 400,
												damping: 17,
											}}
										>
											<UserAvatar user={user} showActivity={showActivity} />
										</motion.div>
									</TooltipTrigger>

									<TooltipContent
										side='bottom'
										align='center'
										className='bg-zinc-900 border-zinc-700 p-3 space-y-2'
									>
										<div className='flex items-center gap-3'>
											<UserAvatar
												user={user}
												showActivity={false}
												size='large'
											/>

											<div className='space-y-1'>
												<div className='flex items-center gap-2'>
													<p className='font-medium text-zinc-100'>
														{user.display_name}
													</p>

													{user.id === currentUser?.id && (
														<Badge variant='secondary' className='text-xs'>
															You
														</Badge>
													)}
												</div>

												<div className='flex items-center gap-2'>
													<Badge
														variant='outline'
														className={cn(
															'text-xs',
															user.role === 'owner' &&
																'border-purple-500 text-purple-400',
															user.role === 'editor' &&
																'border-green-500 text-green-400',
															user.role === 'commenter' &&
																'border-blue-500 text-blue-400',
															user.role === 'viewer' &&
																'border-zinc-500 text-zinc-400'
														)}
													>
														{getRoleLabel(user.role)}
													</Badge>

													{user.is_guest && (
														<Badge variant='secondary' className='text-xs'>
															Guest
														</Badge>
													)}
												</div>
											</div>
										</div>

										{user.current_activity && (
											<div className='flex items-center gap-2 text-xs text-zinc-400'>
												<ActivityIndicator activity={user.current_activity} />

												<span>{getActivityLabel(user.current_activity)}</span>
											</div>
										)}

										<div className='text-xs text-zinc-500'>
											Joined {formatJoinTime(user.joined_at)}
										</div>
									</TooltipContent>
								</Tooltip>
							</motion.div>
						))}
					</AnimatePresence>

					{/* Overflow indicator */}
					{!isExpanded && hiddenCount > 0 && (
						<motion.button
							initial={{ opacity: 0, scale: 0 }}
							animate={{ opacity: 1, scale: 1 }}
							whileHover={{ scale: 1.1 }}
							onClick={() => setIsExpanded(true)}
							className='relative z-0 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 border-2 border-zinc-700 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors'
						>
							+{hiddenCount}
						</motion.button>
					)}
				</div>

				{/* Collapse button */}
				{isExpanded && hiddenCount > 0 && (
					<motion.button
						initial={{ opacity: 0, scale: 0 }}
						animate={{ opacity: 1, scale: 1 }}
						onClick={() => setIsExpanded(false)}
						className='ml-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors'
					>
						Show less
					</motion.button>
				)}
			</div>
		</TooltipProvider>
	);
}
