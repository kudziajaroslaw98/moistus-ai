import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/Tooltip';
import { RealtimeUserSelection } from '@/hooks/use-realtime-selection-presence-room';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

const avatarStackVariants = cva(
	'*:data-[slot=avatar]:ring-sky-500 flex *:data-[slot=avatar]:ring-2',
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
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof avatarStackVariants> {
	avatars: RealtimeUserSelection[];
	maxAvatarsAmount?: number;
}

const AvatarStack = ({
	className,
	orientation,
	size,
	avatars,
	maxAvatarsAmount = 3,
	...props
}: AvatarStackProps) => {
	if (!avatars || avatars.length === 0) return null;

	const shownAvatars = avatars.slice(0, maxAvatarsAmount);
	const hiddenAvatars = avatars.slice(maxAvatarsAmount);

	return (
		<div
			className={cn(
				avatarStackVariants({ orientation, size }),
				className,
				orientation === 'horizontal' ? '-space-x-0' : '-space-y-0'
			)}
			{...props}
		>
			{shownAvatars.map((avatar, index) => (
				<Tooltip key={`${avatar.name}-${avatar.image}-${index}`}>
					<TooltipTrigger asChild>
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
			))}

			{hiddenAvatars.length ? (
				<Tooltip key='hidden-avatars'>
					<TooltipTrigger asChild>
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
