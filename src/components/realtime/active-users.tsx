import {
	generateFallbackAvatar,
	generateFunName,
} from '@/helpers/user-profile-helpers';
import { cn } from '@/utils/cn';
import { useMemo } from 'react';
import { AvatarStack } from '../ui/avatar-stack';

interface ActiveUsersProps {
	users: string[];
	currentUserId?: string;
	className?: string;
	maxDisplay?: number;
}

export function ActiveUsers({ users, className }: ActiveUsersProps) {
	// Filter out current user and limit display
	const avatars = useMemo(() => {
		return users.map((user) => ({
			name: generateFunName(user),
			image: generateFallbackAvatar(user),
		}));
	}, [users]);

	if (users.length === 0) {
		return (
			<div
				className={cn(
					'flex items-center gap-2 text-xs text-zinc-500',
					className
				)}
			>
				<div className='w-2 h-2 rounded-full bg-zinc-600' />
				<span>Only you</span>
			</div>
		);
	}

	return (
		<div className={cn('flex items-center gap-2', className)}>
			<div className='flex items-center -space-x-2'>
				<AvatarStack avatars={avatars} />
			</div>
		</div>
	);
}
