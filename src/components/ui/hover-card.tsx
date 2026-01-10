'use client';

import { PreviewCard } from '@base-ui/react/preview-card';
import { createContext, type ComponentProps, type ReactNode, useContext } from 'react';

import { cn } from '@/lib/utils';

// Context to pass delay props from Root to Trigger (backwards compatibility)
interface HoverCardContextValue {
	delay?: number;
	closeDelay?: number;
}
const HoverCardContext = createContext<HoverCardContextValue>({});

interface HoverCardProps extends ComponentProps<typeof PreviewCard.Root> {
	/** @deprecated Use delay on Trigger instead. Kept for backwards compatibility. */
	openDelay?: number;
	/** @deprecated Use closeDelay on Trigger instead. Kept for backwards compatibility. */
	closeDelay?: number;
}

function HoverCard({
	openDelay,
	closeDelay,
	...props
}: HoverCardProps) {
	return (
		<HoverCardContext.Provider value={{ delay: openDelay, closeDelay }}>
			<PreviewCard.Root data-slot='hover-card' {...props} />
		</HoverCardContext.Provider>
	);
}

interface HoverCardTriggerProps
	extends ComponentProps<typeof PreviewCard.Trigger> {
	/** @deprecated Use `render` prop instead. Renders children as the trigger element. */
	asChild?: boolean;
	children?: ReactNode;
}

function HoverCardTrigger({
	asChild,
	children,
	delay: delayProp,
	closeDelay: closeDelayProp,
	...props
}: HoverCardTriggerProps) {
	const { delay: contextDelay, closeDelay: contextCloseDelay } = useContext(HoverCardContext);

	// Props on Trigger take precedence over context (Root)
	const delay = delayProp ?? contextDelay;
	const closeDelay = closeDelayProp ?? contextCloseDelay;

	if (asChild) {
		// When asChild is true, pass children through render prop
		return (
			<PreviewCard.Trigger
				data-slot='hover-card-trigger'
				delay={delay}
				closeDelay={closeDelay}
				render={children as React.ReactElement}
				{...props}
			/>
		);
	}
	return (
		<PreviewCard.Trigger
			data-slot='hover-card-trigger'
			delay={delay}
			closeDelay={closeDelay}
			{...props}
		>
			{children}
		</PreviewCard.Trigger>
	);
}

function HoverCardContent({
	className,
	align = 'center',
	side = 'bottom',
	sideOffset = 4,
	...props
}: ComponentProps<typeof PreviewCard.Popup> & {
	align?: 'start' | 'center' | 'end';
	side?: 'top' | 'bottom' | 'left' | 'right';
	sideOffset?: number;
}) {
	return (
		<PreviewCard.Portal data-slot='hover-card-portal'>
			<PreviewCard.Positioner align={align} side={side} sideOffset={sideOffset}>
				<PreviewCard.Popup
					data-slot='hover-card-content'
					className={cn(
						'bg-elevated/95 backdrop-blur-sm text-text-primary border-zinc-800/60 data-[open]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95 data-[open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-80 rounded-lg border p-0 shadow-xl shadow-black/20 outline-hidden',
						className
					)}
					{...props}
				/>
			</PreviewCard.Positioner>
		</PreviewCard.Portal>
	);
}

export { HoverCard, HoverCardContent, HoverCardTrigger };
