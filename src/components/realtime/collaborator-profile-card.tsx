'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type {
	ActivityState,
	RealtimeUser,
} from '@/hooks/realtime/use-realtime-presence-room';
import { usePublicProfile } from '@/hooks/use-public-profile';
import { cn } from '@/lib/utils';
import {
	ChevronDown,
	ChevronUp,
	Clock,
	Edit3,
	Eye,
	Mouse,
	MoveIcon,
	Type,
	User2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

interface CollaboratorProfileCardProps {
	user: RealtimeUser;
	mapOwnerId?: string;
}

// Activity configuration with ring colors for subtle tinting
const ACTIVITY_CONFIG: Record<
	ActivityState,
	{ label: string; icon: React.ReactNode; color: string; ringColor: string }
> = {
	idle: {
		label: 'Idle',
		icon: <Eye className='size-3' />,
		color: 'text-text-tertiary',
		ringColor: 'rgba(113, 113, 122, 0.3)', // zinc-500
	},
	editing: {
		label: 'Editing',
		icon: <Edit3 className='size-3' />,
		color: 'text-blue-400',
		ringColor: 'rgba(96, 165, 250, 0.4)', // blue-400
	},
	dragging: {
		label: 'Moving',
		icon: <MoveIcon className='size-3' />,
		color: 'text-purple-400',
		ringColor: 'rgba(192, 132, 252, 0.4)', // purple-400
	},
	typing: {
		label: 'Typing',
		icon: <Type className='size-3' />,
		color: 'text-green-400',
		ringColor: 'rgba(74, 222, 128, 0.4)', // green-400
	},
	viewing: {
		label: 'Viewing',
		icon: <Mouse className='size-3' />,
		color: 'text-zinc-400',
		ringColor: 'rgba(161, 161, 170, 0.3)', // zinc-400
	},
};

// Skeleton matching the new simplified layout
function ProfileSkeleton() {
	return (
		<div className='overflow-hidden'>
			{/* Hero skeleton */}
			<div className='flex items-center gap-4 p-5 pb-4'>
				<div className='size-14 rounded-full bg-zinc-800/60 animate-pulse' />
				<div className='flex-1 space-y-2.5'>
					<div className='flex items-center gap-2'>
						<div className='h-5 bg-zinc-800/60 rounded animate-pulse w-28' />
						<div className='h-4 bg-zinc-800/60 rounded-full animate-pulse w-16' />
					</div>
					<div className='h-3.5 bg-zinc-800/40 rounded animate-pulse w-20' />
				</div>
			</div>

			{/* Session meta skeleton */}
			<div className='flex items-center gap-3 px-5 py-3 border-t border-zinc-800/50'>
				<div className='h-3 bg-zinc-800/40 rounded animate-pulse w-20' />
				<div className='h-3 w-px bg-zinc-800/40' />
				<div className='h-3 bg-zinc-800/40 rounded animate-pulse w-16' />
			</div>
		</div>
	);
}

interface ExpandableBioProps {
	bio: string;
}

function ExpandableBio({ bio }: ExpandableBioProps) {
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<div className='space-y-2'>
			<motion.p
				initial={false}
				animate={{
					height: isExpanded ? 'auto' : undefined,
				}}
				className={cn(
					'text-sm text-text-secondary leading-relaxed',
					!isExpanded && 'line-clamp-2'
				)}
				transition={{
					duration: 0.3,
					ease: [0.215, 0.61, 0.355, 1], // ease-out-cubic
				}}
			>
				{bio}
			</motion.p>

			{bio.length > 100 && (
				<button
					aria-expanded={isExpanded}
					aria-label={isExpanded ? 'View less' : 'View more'}
					className='text-xs font-medium text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base rounded inline-flex items-center gap-1 transition-colors duration-200'
					onClick={() => setIsExpanded(!isExpanded)}
				>
					{isExpanded ? (
						<>
							View less <ChevronUp className='size-3' />
						</>
					) : (
						<>
							View more <ChevronDown className='size-3' />
						</>
					)}
				</button>
			)}
		</div>
	);
}

interface SessionMetaProps {
	joinedAt?: string;
	lastSeenAt?: string;
}

// Consolidated session info - replaces the verbose MetricsGrid
function SessionMeta({ joinedAt, lastSeenAt }: SessionMetaProps) {
	const sessionDuration = joinedAt
		? Math.floor((Date.now() - new Date(joinedAt).getTime()) / 60000)
		: 0;

	const formatDuration = (minutes: number) => {
		if (minutes < 1) return 'Just joined';
		if (minutes < 60) return `${minutes}m`;
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
	};

	const isRecentlyActive = () => {
		if (!lastSeenAt) return false;
		const minutesAgo = Math.floor(
			(Date.now() - new Date(lastSeenAt).getTime()) / 60000
		);
		return minutesAgo < 2;
	};

	return (
		<div className='flex items-center gap-3 px-5 py-3 border-t border-zinc-800/50'>
			{/* Session duration */}
			<div className='flex items-center gap-1.5 text-xs text-text-secondary'>
				<Clock className='size-3 text-text-tertiary' />
				<span>{formatDuration(sessionDuration)}</span>
			</div>

			{/* Divider */}
			<div className='h-3 w-px bg-zinc-700/50' />

			{/* Active status */}
			<div className='flex items-center gap-1.5 text-xs text-text-tertiary'>
				<div
					className={cn(
						'size-1.5 rounded-full',
						isRecentlyActive() ? 'bg-green-500' : 'bg-zinc-600'
					)}
				/>
				<span>{isRecentlyActive() ? 'Active now' : 'Away'}</span>
			</div>
		</div>
	);
}

interface RoleBadgeProps {
	isOwner: boolean;
}

function RoleBadge({ isOwner }: RoleBadgeProps) {
	if (isOwner) {
		return (
			<span className='inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-amber-400/90 bg-amber-950/30 border border-amber-700/20'>
				Owner
			</span>
		);
	}

	return (
		<span className='inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-text-tertiary bg-zinc-800/40 border border-zinc-700/30'>
			Collaborator
		</span>
	);
}

interface ActivityAvatarProps {
	user: RealtimeUser;
	displayName: string;
	activityState: ActivityState;
	isAnonymous: boolean;
}

// Avatar with activity-tinted ring and optional anonymous badge
function ActivityAvatar({
	user,
	displayName,
	activityState,
	isAnonymous,
}: ActivityAvatarProps) {
	const { ringColor } = ACTIVITY_CONFIG[activityState];

	const initials = displayName
		?.split(' ')
		?.map((word) => word[0])
		?.slice(0, 2)
		?.join('')
		?.toUpperCase();

	return (
		<div className='relative shrink-0'>
			<Avatar
				className='size-14 ring-2 transition-all duration-200 hover:scale-[1.02]'
				style={{ '--tw-ring-color': ringColor } as React.CSSProperties}
			>
				<AvatarImage alt={displayName} src={user.image} />
				<AvatarFallback className='text-sm font-semibold bg-zinc-800'>
					{initials || '?'}
				</AvatarFallback>
			</Avatar>

			{/* Anonymous badge overlay */}
			{isAnonymous && (
				<div
					aria-label='Guest user'
					className='absolute -bottom-0.5 -right-0.5 size-5 rounded-full bg-zinc-900 flex items-center justify-center ring-2 ring-zinc-950'
				>
					<User2 className='size-2.5 text-zinc-400' />
				</div>
			)}
		</div>
	);
}

export function CollaboratorProfileCard({
	user,
	mapOwnerId,
}: CollaboratorProfileCardProps) {
	const { profile, isLoading, error } = usePublicProfile(user.id);

	const activityState = user.activityState || 'idle';
	const isOwner = mapOwnerId ? user.id === mapOwnerId : false;

	if (isLoading) {
		return <ProfileSkeleton />;
	}

	const displayName =
		profile?.display_name || profile?.full_name || 'Collaborator';
	const email = user.name || '';
	const bio = profile?.bio;
	const isAnonymous = profile?.is_anonymous ?? false;

	// Don't show email if it matches display name (avoids redundancy)
	const showEmail = email && email !== displayName;

	const activityConfig = ACTIVITY_CONFIG[activityState];

	return (
		<div className='overflow-hidden'>
			{/* Hero Section */}
			<div className='flex items-center gap-4 p-5 pb-4'>
				<ActivityAvatar
					activityState={activityState}
					displayName={displayName}
					isAnonymous={isAnonymous}
					user={user}
				/>

				<div className='flex-1 min-w-0 flex flex-col gap-1'>
					{/* Name + Role */}
					<div className='flex items-center gap-2'>
						<h4 className='text-base font-semibold text-text-primary truncate leading-tight'>
							{displayName}
						</h4>
						<RoleBadge isOwner={isOwner} />
					</div>

					{/* Activity label (inline, no pill) */}
					<div
						className={cn(
							'flex items-center gap-1.5 text-xs font-medium',
							activityConfig.color
						)}
					>
						{activityConfig.icon}
						<span>{activityConfig.label}</span>
					</div>

					{/* Email/username if different from display name */}
					{showEmail && (
						<span className='text-xs text-text-tertiary truncate'>
							{isAnonymous ? 'Guest' : email}
						</span>
					)}
				</div>
			</div>

			{/* Bio Section */}
			{bio && (
				<div className='px-5 pb-4'>
					<ExpandableBio bio={bio} />
				</div>
			)}

			{/* Session Meta */}
			<SessionMeta joinedAt={user.joinedAt} lastSeenAt={user.lastSeenAt} />
		</div>
	);
}
