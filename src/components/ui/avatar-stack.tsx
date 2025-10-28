import { CollaboratorProfileCard } from '@/components/realtime/collaborator-profile-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/Tooltip';
import type { RealtimeUser } from '@/hooks/realtime/use-realtime-presence-room';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

const avatarStackVariants = cva(
	'*:data-[slot=avatar]:ring-zinc-950 flex *:data-[slot=avatar]:ring-2',
	{
		variants: {
			orientation: {
				vertical: 'flex-row',
				horizontal: 'flex-col',
			},
			size: {
				sm: '*:data-[slot=avatar]:size-6 -space-x-3 -space-y-3',
				md: '*:data-[slot=avatar]:size-8 -space-x-4 -space-y-4',
				lg: '*:data-[slot=avatar]:size-10 -space-x-5 -space-y-5',
				xl: '*:data-[slot=avatar]:size-12 -space-x-6 -space-y-6',
			},
		},
		defaultVariants: {
			orientation: 'vertical',
			size: 'md',
		},
	}
);

export interface AvatarStackProps
	extends HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof avatarStackVariants> {
	avatars: ({ image: string; name: string } | RealtimeUser)[];
	maxAvatarsAmount?: number;
	showProfileCard?: boolean;
	mapOwnerId?: string; // ID of the map owner to show role badges
}

const AvatarStack = ({
	className,
	orientation,
	size,
	avatars,
	maxAvatarsAmount = 3,
	showProfileCard = false,
	mapOwnerId,
	...props
}: AvatarStackProps) => {
	if (!avatars || avatars.length === 0) return null;

	const shownAvatars = avatars.slice(0, maxAvatarsAmount);
	const hiddenAvatars = avatars.slice(maxAvatarsAmount);

	// Helper to check if avatar has full user data
	const isRealtimeUser = (
		avatar: { image: string; name: string } | RealtimeUser
	): avatar is RealtimeUser => {
		return 'id' in avatar;
	};

	return (
		<div
			className={cn(
				avatarStackVariants({ orientation, size }),
				className,
				orientation === 'horizontal' ? '-space-x-0' : '-space-y-0'
			)}
			{...props}
		>
			{shownAvatars.map((avatar, index) => {
				const key = isRealtimeUser(avatar)
					? `${avatar.id}-${index}`
					: `${avatar.name}-${avatar.image}-${index}`;

				// Use HoverCard for profile cards, Tooltip for simple view
				if (showProfileCard && isRealtimeUser(avatar)) {
					return (
						<HoverCard key={key} openDelay={500} closeDelay={200}>
							<HoverCardTrigger asChild>
								<Avatar className='hover:z-10 transition-transform hover:scale-110 cursor-pointer'>
									<AvatarImage src={avatar.image} />
									<AvatarFallback>
										{avatar.name
											?.split(' ')
											?.map((word) => word[0])
											?.slice(0, 2)
											?.join('')
											?.toUpperCase()}
									</AvatarFallback>
								</Avatar>
							</HoverCardTrigger>
							<HoverCardContent align='start' side='bottom'>
								<CollaboratorProfileCard user={avatar} mapOwnerId={mapOwnerId} />
							</HoverCardContent>
						</HoverCard>
					);
				}

				// Fallback to simple tooltip
				return (
					<Tooltip key={key}>
						<TooltipTrigger>
							<Avatar className='hover:z-10'>
								<AvatarImage src={avatar.image} />
								<AvatarFallback>
									{avatar.name
										?.split(' ')
										?.map((word) => word[0])
										?.slice(0, 2)
										?.join('')
										?.toUpperCase()}
								</AvatarFallback>
							</Avatar>
						</TooltipTrigger>
						<TooltipContent>
							<p>{avatar.name}</p>
						</TooltipContent>
					</Tooltip>
				);
			})}

			{hiddenAvatars.length ? (
				<Tooltip key='hidden-avatars'>
					<TooltipTrigger>
						<Avatar>
							<AvatarFallback>
								+{avatars.length - shownAvatars.length}
							</AvatarFallback>
						</Avatar>
					</TooltipTrigger>

					<TooltipContent>
						{hiddenAvatars.map(({ name }, index) => (
							<p key={`${name}-${index}`}>{name}</p>
						))}
					</TooltipContent>
				</Tooltip>
			) : null}
		</div>
	);
};

export { AvatarStack, avatarStackVariants };
