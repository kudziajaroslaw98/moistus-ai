import { cn } from '@/utils/cn';

interface ActiveUser {
	id: string;
	name?: string;
	email?: string;
	avatar?: string;
}

interface ActiveUsersProps {
	users: string[];
	currentUserId?: string;
	className?: string;
	maxDisplay?: number;
}

// Generate consistent colors for users
function getUserColor(userId: string): string {
	const colors = [
		'#ef4444', // red-500
		'#f97316', // orange-500
		'#eab308', // yellow-500
		'#22c55e', // green-500
		'#06b6d4', // cyan-500
		'#3b82f6', // blue-500
		'#8b5cf6', // violet-500
		'#ec4899', // pink-500
		'#f59e0b', // amber-500
		'#10b981', // emerald-500
	];

	// Create a simple hash from userId to get consistent color
	let hash = 0;
	for (let i = 0; i < userId.length; i++) {
		hash = ((hash << 5) - hash + userId.charCodeAt(i)) & 0xffffffff;
	}

	return colors[Math.abs(hash) % colors.length];
}

// Get user initials from ID (fallback if no name available)
function getUserInitials(userId: string): string {
	if (!userId) return '?';

	// If it looks like an email, use first letter of each part
	if (userId.includes('@')) {
		const [localPart] = userId.split('@');
		return localPart.slice(0, 2).toUpperCase();
	}

	// Otherwise just use first 2 characters
	return userId.slice(0, 2).toUpperCase();
}

export function ActiveUsers({
	users,
	currentUserId,
	className,
	maxDisplay = 5
}: ActiveUsersProps) {
	// Filter out current user and limit display
	const otherUsers = users.filter(userId => userId !== currentUserId);
	const displayUsers = otherUsers.slice(0, maxDisplay);
	const remainingCount = Math.max(0, otherUsers.length - maxDisplay);

	if (otherUsers.length === 0) {
		return (
			<div className={cn('flex items-center gap-2 text-xs text-zinc-500', className)}>
				<div className='w-2 h-2 rounded-full bg-zinc-600' />
				<span>Only you</span>
			</div>
		);
	}

	return (
		<div className={cn('flex items-center gap-2', className)}>
			<div className='flex items-center -space-x-2'>
				{displayUsers.map((userId) => {
					const userColor = getUserColor(userId);
					const initials = getUserInitials(userId);

					return (
						<div
							key={userId}
							className='w-8 h-8 rounded-full border-2 border-zinc-800 flex items-center justify-center text-xs font-medium text-white relative'
							style={{ backgroundColor: userColor }}
							title={`Active: ${userId}`}
						>
							{initials}
							<div
								className='absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-zinc-800 animate-pulse'
								style={{ backgroundColor: userColor }}
							/>
						</div>
					);
				})}

				{remainingCount > 0 && (
					<div
						className='w-8 h-8 rounded-full border-2 border-zinc-800 bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-300'
						title={`+${remainingCount} more users`}
					>
						+{remainingCount}
					</div>
				)}
			</div>

			<div className='text-xs text-zinc-400'>
				{otherUsers.length === 1 ? '1 other user' : `${otherUsers.length} other users`}
			</div>
		</div>
	);
}

export { getUserColor };
