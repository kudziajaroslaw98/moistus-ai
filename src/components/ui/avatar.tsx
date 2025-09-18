'use client';

import * as AvatarPrimitive from '@radix-ui/react-avatar';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

function Avatar({
	className,
	...props
}: ComponentProps<typeof AvatarPrimitive.Root>) {
	return (
		<AvatarPrimitive.Root
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
}: ComponentProps<typeof AvatarPrimitive.Image>) {
	return (
		<AvatarPrimitive.Image
			data-slot='avatar-image'
			className={cn('aspect-square size-full', className)}
			{...props}
		/>
	);
}

function AvatarFallback({
	className,
	...props
}: ComponentProps<typeof AvatarPrimitive.Fallback>) {
	return (
		<AvatarPrimitive.Fallback
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
