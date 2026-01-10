'use client';

import { Avatar as BaseAvatar } from '@base-ui/react/avatar';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

function Avatar({
	className,
	...props
}: ComponentProps<typeof BaseAvatar.Root>) {
	return (
		<BaseAvatar.Root
			data-slot='avatar'
			className={cn(
				'relative flex size-8 shrink-0 overflow-hidden rounded-full ring-2 ring-zinc-950',
				className
			)}
			{...props}
		/>
	);
}

function AvatarImage({
	className,
	...props
}: ComponentProps<typeof BaseAvatar.Image>) {
	return (
		<BaseAvatar.Image
			className={cn('aspect-square size-full', className)}
			data-slot='avatar-image'
			{...props}
		/>
	);
}

function AvatarFallback({
	className,
	...props
}: ComponentProps<typeof BaseAvatar.Fallback>) {
	return (
		<BaseAvatar.Fallback
			data-slot='avatar-fallback'
			className={cn(
				'bg-zinc-900 flex size-full items-center justify-center rounded-full',
				className
			)}
			{...props}
		/>
	);
}

export { Avatar, AvatarFallback, AvatarImage };
