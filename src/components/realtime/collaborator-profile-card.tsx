'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type {
	ActivityState,
	RealtimeUser,
} from '@/hooks/realtime/use-realtime-presence-room';
import { usePublicProfile } from '@/hooks/use-public-profile';
import { cn } from '@/lib/utils';
import {
	Briefcase,
	Edit3,
	Eye,
	MapPin,
	Mouse,
	MoveIcon,
	Type,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect } from 'react';

interface CollaboratorProfileCardProps {
	user: RealtimeUser;
}

const ACTIVITY_CONFIG: Record<
	ActivityState,
	{ label: string; icon: React.ReactNode; color: string }
> = {
	idle: {
		label: 'Idle',
		icon: <Eye className='size-3' />,
		color: 'text-zinc-400',
	},
	editing: {
		label: 'Editing',
		icon: <Edit3 className='size-3' />,
		color: 'text-blue-400',
	},
	dragging: {
		label: 'Dragging',
		icon: <MoveIcon className='size-3' />,
		color: 'text-purple-400',
	},
	typing: {
		label: 'Typing',
		icon: <Type className='size-3' />,
		color: 'text-green-400',
	},
	viewing: {
		label: 'Viewing',
		icon: <Mouse className='size-3' />,
		color: 'text-zinc-400',
	},
};

function ProfileSkeleton() {
	return (
		<div className='space-y-3 p-4'>
			<div className='flex items-start gap-3'>
				<div className='size-12 rounded-full bg-zinc-800 animate-pulse' />
				<div className='flex-1 space-y-2'>
					<div className='h-4 bg-zinc-800 rounded animate-pulse w-24' />
					<div className='h-3 bg-zinc-800 rounded animate-pulse w-16' />
				</div>
			</div>
			<div className='space-y-2'>
				<div className='h-3 bg-zinc-800 rounded animate-pulse w-full' />
				<div className='h-3 bg-zinc-800 rounded animate-pulse w-3/4' />
			</div>
		</div>
	);
}

export function CollaboratorProfileCard({
	user,
}: CollaboratorProfileCardProps) {
	const { profile, isLoading, error } = usePublicProfile(user.id);

	const activityState = user.activityState || 'idle';
	const activityConfig = ACTIVITY_CONFIG[activityState];

	// Debug: log only when profile data changes (not on every render)
	useEffect(() => {
		if (!isLoading && (profile || error)) {
			console.log('[ProfileCard] Data loaded:', {
				userId: user.id,
				userName: user.name,
				profileFound: !!profile,
				profileName: profile?.full_name || profile?.display_name,
				hasBio: !!profile?.bio,
				hasLocation: !!profile?.location,
				hasCompany: !!profile?.company,
				error: error?.message,
			});
		}
	}, [isLoading, profile, error, user.id, user.name]);

	if (isLoading) {
		return <ProfileSkeleton />;
	}

	// Prioritize the actual name from presence over the profile fallback
	const displayName =
		user.name || profile?.display_name || profile?.full_name || 'Collaborator';
	const bio = profile?.bio || user.bio;
	const location = profile?.location || user.location;
	const company = profile?.company || user.company;
	const jobTitle = profile?.job_title || user.jobTitle;
	const isAnonymous = profile?.isAnonymous ?? false;

	return (
		<div className='overflow-hidden'>
			{/* Header */}
			<div className='flex items-start gap-3 p-4 pb-3'>
				<Avatar className='size-12 ring-2 ring-zinc-700'>
					<AvatarImage src={user.image} alt={displayName} />
					<AvatarFallback className='text-sm font-medium'>
						{displayName
							?.split(' ')
							?.map((word) => word[0])
							?.slice(0, 2)
							?.join('')
							?.toUpperCase()}
					</AvatarFallback>
				</Avatar>

				<div className='flex-1 min-w-0'>
					<h4 className='text-sm font-semibold text-text-high truncate'>
						{displayName}
					</h4>

					{/* Activity Status */}
					<motion.div
						initial={{ opacity: 0, y: -4 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.2,
							ease: [0.25, 0.46, 0.45, 0.94],
						}}
						className='flex items-center gap-1.5 mt-1'
					>
						<motion.div
							animate={{
								scale: [1, 1.2, 1],
							}}
							transition={{
								duration: 2,
								repeat: Number.POSITIVE_INFINITY,
								ease: 'easeInOut',
							}}
							className='size-2 rounded-full bg-green-500'
						/>
						<span
							className={cn(
								'text-xs flex items-center gap-1',
								activityConfig.color
							)}
						>
							{activityConfig.icon}
							{activityConfig.label}
						</span>
					</motion.div>
				</div>
			</div>

			{/* Bio */}
			{bio && (
				<div className='px-4 pb-3'>
					<p className='text-xs text-text-medium line-clamp-2 leading-relaxed'>
						{bio}
					</p>
				</div>
			)}

			{/* Profile Details */}
			{(location || company || jobTitle) && (
				<div className='px-4 pb-4 space-y-2'>
					{jobTitle && company && (
						<div className='flex items-center gap-2 text-xs text-text-medium'>
							<Briefcase className='size-3 text-text-low shrink-0' />
							<span className='truncate'>
								{jobTitle} at {company}
							</span>
						</div>
					)}

					{jobTitle && !company && (
						<div className='flex items-center gap-2 text-xs text-text-medium'>
							<Briefcase className='size-3 text-text-low shrink-0' />
							<span className='truncate'>{jobTitle}</span>
						</div>
					)}

					{!jobTitle && company && (
						<div className='flex items-center gap-2 text-xs text-text-medium'>
							<Briefcase className='size-3 text-text-low shrink-0' />
							<span className='truncate'>{company}</span>
						</div>
					)}

					{location && (
						<div className='flex items-center gap-2 text-xs text-text-medium'>
							<MapPin className='size-3 text-text-low shrink-0' />
							<span className='truncate'>{location}</span>
						</div>
					)}
				</div>
			)}

			{/* Anonymous User Notice */}
			{isAnonymous && (
				<div className='px-4 pb-4'>
					<div className='text-xs text-text-low bg-zinc-900/50 rounded px-2 py-1.5'>
						Anonymous collaborator
					</div>
				</div>
			)}
		</div>
	);
}
