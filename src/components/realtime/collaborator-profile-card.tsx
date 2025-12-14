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
	Edit3,
	Eye,
	Mouse,
	MoveIcon,
	Type,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface CollaboratorProfileCardProps {
	user: RealtimeUser;
	mapOwnerId?: string; // ID of the map owner to determine role
}

const ACTIVITY_CONFIG: Record<
	ActivityState,
	{ label: string; icon: React.ReactNode; color: string; bgColor: string }
> = {
	idle: {
		label: 'Idle',
		icon: <Eye className='size-3' />,
		color: 'text-text-primary',
		bgColor: 'border border-border-default',
	},
	editing: {
		label: 'Editing',
		icon: <Edit3 className='size-3' />,
		color: 'text-blue-400',
		bgColor: 'bg-blue-950/50',
	},
	dragging: {
		label: 'Dragging',
		icon: <MoveIcon className='size-3' />,
		color: 'text-purple-400',
		bgColor: 'bg-purple-950/50',
	},
	typing: {
		label: 'Typing',
		icon: <Type className='size-3' />,
		color: 'text-green-400',
		bgColor: 'bg-green-950/50',
	},
	viewing: {
		label: 'Viewing',
		icon: <Mouse className='size-3' />,
		color: 'text-zinc-400',
		bgColor: 'bg-zinc-800/50',
	},
};

function ProfileSkeleton() {
	return (
		<div className='space-y-4 p-5'>
			<div className='flex items-start gap-4'>
				<div className='size-16 rounded-full bg-zinc-800 animate-pulse' />

				<div className='flex-1 space-y-2'>
					<div className='h-5 bg-zinc-800 rounded animate-pulse w-32' />

					<div className='h-3 bg-zinc-800 rounded animate-pulse w-20' />
				</div>
			</div>

			<div className='grid grid-cols-2 gap-3'>
				<div className='h-16 bg-zinc-800 rounded animate-pulse' />

				<div className='h-16 bg-zinc-800 rounded animate-pulse' />

				<div className='h-16 bg-zinc-800 rounded animate-pulse' />

				<div className='h-16 bg-zinc-800 rounded animate-pulse' />
			</div>
		</div>
	);
}

interface MetricItemProps {
	label: string;
	value: string | number;
	variant?: 'default' | 'accent';
}

function MetricItem({ label, value, variant = 'default' }: MetricItemProps) {
	return (
		<div className='flex flex-col items-start gap-1'>
			<span className='text-[10px] uppercase tracking-wide text-text-tertiary font-medium'>
				{label}
			</span>

			<span
				className={cn(
					'text-base font-semibold',
					variant === 'accent' ? 'text-accent' : 'text-text-primary'
				)}
			>
				{value}
			</span>
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

interface MetricsGridProps {
	activityState: ActivityState;
	joinedAt?: string;
	lastSeenAt?: string;
}

function MetricsGrid({
	activityState,
	joinedAt,
	lastSeenAt,
}: MetricsGridProps) {
	const activityConfig = ACTIVITY_CONFIG[activityState];

	// Calculate session duration from real joinedAt timestamp
	const sessionDuration = joinedAt
		? Math.floor((Date.now() - new Date(joinedAt).getTime()) / 60000)
		: 0;

	const formatDuration = (minutes: number) => {
		if (minutes < 1) return 'Just joined';
		if (minutes < 60) return `${minutes}m`;
		const hours = Math.floor(minutes / 60);
		return `${hours}h ${minutes % 60}m`;
	};

	// Calculate time since last seen
	const getLastSeenText = () => {
		if (!lastSeenAt) return 'Unknown';

		const minutesAgo = Math.floor(
			(Date.now() - new Date(lastSeenAt).getTime()) / 60000
		);

		if (minutesAgo < 1) return 'Now';
		if (minutesAgo === 1) return '1m ago';
		if (minutesAgo < 60) return `${minutesAgo}m ago`;

		const hoursAgo = Math.floor(minutesAgo / 60);
		if (hoursAgo === 1) return '1h ago';
		if (hoursAgo < 24) return `${hoursAgo}h ago`;

		const daysAgo = Math.floor(hoursAgo / 24);
		return `${daysAgo}d ago`;
	};

	return (
		<div className='grid grid-cols-2 gap-3'>
			{/* Activity Status */}
			<div className='flex flex-col gap-2'>
				<span className='text-[10px] uppercase tracking-wide text-text-tertiary font-medium'>
					Activity
				</span>

				<div
					className={cn(
						'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full w-fit',
						activityConfig.bgColor
					)}
				>
					<span
						className={cn(
							'text-xs font-medium flex gap-1 justify-center items-center',
							activityConfig.color
						)}
					>
						<span>{activityConfig.icon}</span>

						<span className='ml-1'>{activityConfig.label}</span>
					</span>
				</div>
			</div>

			{/* Session Duration */}
			<MetricItem label='Session' value={formatDuration(sessionDuration)} />

			{/* Status */}
			<MetricItem
				label='Status'
				value='Online'
				variant={activityState !== 'idle' ? 'accent' : 'default'}
			/>

			{/* Last Seen */}
			<MetricItem label='Last Seen' value={getLastSeenText()} />
		</div>
	);
}

interface RoleBadgeProps {
	isOwner: boolean;
}

function RoleBadge({ isOwner }: RoleBadgeProps) {
	if (isOwner) {
		return (
			<span className='inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-overlay text-text-primary border border-border-strong'>
				Owner
			</span>
		);
	}

	return (
		<span className='inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800/50 text-text-secondary border border-zinc-700/50'>
			Collaborator
		</span>
	);
}

export function CollaboratorProfileCard({
	user,
	mapOwnerId,
}: CollaboratorProfileCardProps) {
	const { profile, isLoading, error } = usePublicProfile(user.id);

	const activityState = user.activityState || 'idle';
	const isOwner = mapOwnerId ? user.id === mapOwnerId : false;

	// Debug: log only when profile data changes (not on every render)
	useEffect(() => {
		if (!isLoading && (profile || error)) {
			console.log('[ProfileCard] Data loaded:', {
				userId: user.id,
				userName: user.name,
				profileFound: !!profile,
				profileName: profile?.full_name || profile?.display_name,
				hasBio: !!profile?.bio,
				error: error?.message,
			});
		}
	}, [isLoading, profile, error, user.id, user.name]);

	if (isLoading) {
		return <ProfileSkeleton />;
	}

	// Prioritize the actual name from presence over the profile fallback
	const displayName =
		profile?.display_name || profile?.full_name || 'Collaborator';
	const email = user.name || 'Unknown';
	const bio = profile?.bio;
	const isAnonymous = profile?.is_anonymous ?? false;

	return (
		<div className='overflow-hidden'>
			{/* Hero Section - Name & Avatar */}
			<div className='flex items-center gap-4 p-5 pb-4'>
				<Avatar className='size-16 ring-2 ring-zinc-700 shrink-0'>
					<AvatarImage alt={displayName} src={user.image} />

					<AvatarFallback className='text-base font-semibold'>
						{displayName
							?.split(' ')
							?.map((word) => word[0])
							?.slice(0, 2)
							?.join('')
							?.toUpperCase()}
					</AvatarFallback>
				</Avatar>

				<div className='flex-1 min-w-0 pt-1 flex flex-col gap-1.5'>
					<div className='flex items-center gap-2'>
						<h4 className='text-lg font-semibold text-text-primary truncate leading-tight'>
							{displayName}
						</h4>

						<RoleBadge isOwner={isOwner} />
					</div>

					{/* Email */}
					{email && (
						<div className='flex items-center gap-1.5'>
							<span className='text-xs text-text-secondary truncate'>
								{email}
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Bio Section */}
			{bio && (
				<div className='px-5 pb-4'>
					<ExpandableBio bio={bio} />
				</div>
			)}

			{/* Metrics Grid */}
			<div className='px-5 pb-4'>
				<MetricsGrid
					activityState={activityState}
					joinedAt={user.joinedAt}
					lastSeenAt={user.lastSeenAt}
				/>
			</div>

			{/* Anonymous User Notice */}
			{isAnonymous && (
				<div className='px-5 pb-5'>
					<div className='text-xs text-text-tertiary bg-zinc-900/50 rounded px-2.5 py-1.5'>
						Anonymous collaborator
					</div>
				</div>
			)}
		</div>
	);
}
