import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

function Card({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			className={cn(
				'flex flex-col gap-6 rounded-xl shadow-sm py-6 bg-elevation-2 border border-border-default text-text-high',
				className
			)}
			data-slot='card'
			{...props}
		/>
	);
}

function CardHeader({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-header'
			className={cn(
				'@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
				className
			)}
			{...props}
		/>
	);
}

function CardTitle({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			className={cn('leading-none font-semibold', className)}
			data-slot='card-title'
			{...props}
		/>
	);
}

function CardDescription({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			className={cn('text-muted-foreground text-sm', className)}
			data-slot='card-description'
			{...props}
		/>
	);
}

function CardAction({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-action'
			className={cn(
				'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
				className
			)}
			{...props}
		/>
	);
}

function CardContent({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			className={cn('px-6', className)}
			data-slot='card-content'
			{...props}
		/>
	);
}

function CardFooter({ className, ...props }: ComponentProps<'div'>) {
	return (
		<div
			className={cn('flex items-center px-6 [.border-t]:pt-6', className)}
			data-slot='card-footer'
			{...props}
		/>
	);
}

export {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
};
