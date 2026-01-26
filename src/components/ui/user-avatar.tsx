'use client';

import type { PublicUserProfile } from '@/types/user-profile-types';
import { cn } from '@/utils/cn';
import { User } from 'lucide-react';
import { memo } from 'react';

interface UserAvatarProps {
	user?: PublicUserProfile | null;
	size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
	className?: string;
	showTooltip?: boolean;
	fallbackText?: string;
	onClick?: () => void;
}

const sizeClasses = {
	xs: 'size-4 text-[8px]',
	sm: 'size-6 text-xs',
	md: 'size-8 text-sm',
	lg: 'size-10 text-base',
	xl: 'size-12 text-lg',
	'2xl': 'size-16 text-xl',
};

const UserAvatarComponent = ({
	user,
	size = 'md',
	className,
	showTooltip = false,
	fallbackText,
	onClick,
}: UserAvatarProps) => {
	const displayName = user?.display_name || user?.full_name;
	const initials = displayName
		? displayName
				.split(' ')
				.map((name) => name.charAt(0))
				.join('')
				.toUpperCase()
				.slice(0, 2)
		: fallbackText?.charAt(0)?.toUpperCase() || '?';

	const avatarContent = user?.avatar_url ? (
		<img
			alt={displayName || 'User avatar'}
			className='size-full object-cover'
			src={user.avatar_url}
			onError={(e) => {
				// Fallback to initials if image fails to load
				const target = e.target as HTMLImageElement;
				target.style.display = 'none';
			}}
		/>
	) : (
		<div className='size-full flex items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600 text-white font-bold'>
			{initials}
		</div>
	);

	const avatar = (
		<div
			onClick={onClick}
			title={showTooltip ? displayName || 'Unknown User' : undefined}
			className={cn(
				'rounded-full overflow-hidden border-2 border-zinc-600 bg-zinc-800 flex items-center justify-center transition-all cursor-pointer hover:border-zinc-500',
				sizeClasses[size],
				onClick && 'hover:scale-105',
				className
			)}
		>
			{avatarContent}

			{!user?.avatar_url && <User className='size-1/2 text-zinc-400' />}
		</div>
	);

	return avatar;
};

export const UserAvatar = memo(UserAvatarComponent);
UserAvatar.displayName = 'UserAvatar';
