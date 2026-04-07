'use client';

import { cn } from '@/utils/cn';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import Link, { useLinkStatus } from 'next/link';
import {
	type KeyboardEvent,
	type MouseEvent,
	type PointerEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react';

const OPTIMISTIC_PENDING_RESET_MS = 1500;

interface StartMappingLinkProps {
	className: string;
	arrowClassName?: string;
	idleLabel?: string;
	loadingLabel?: string;
	progressBarClassName?: string;
	showArrow?: boolean;
	onNavigateStart?: () => void;
}

interface StartMappingLinkContentProps {
	arrowClassName?: string;
	idleLabel: string;
	loadingLabel: string;
	optimisticPending: boolean;
	progressBarClassName?: string;
	shouldReduceMotion: boolean;
	showArrow: boolean;
}

function isActivationPointer(event: PointerEvent<HTMLAnchorElement>): boolean {
	if (event.pointerType === 'mouse') {
		return (
			event.button === 0 &&
			!event.metaKey &&
			!event.ctrlKey &&
			!event.shiftKey &&
			!event.altKey
		);
	}

	return true;
}

function isActivationClick(event: MouseEvent<HTMLAnchorElement>): boolean {
	return (
		event.button === 0 &&
		!event.metaKey &&
		!event.ctrlKey &&
		!event.shiftKey &&
		!event.altKey
	);
}

function isActivationKey(event: KeyboardEvent<HTMLAnchorElement>): boolean {
	return event.key === 'Enter' || event.key === ' ';
}

function StartMappingLinkContent({
	arrowClassName,
	idleLabel,
	loadingLabel,
	optimisticPending,
	progressBarClassName,
	shouldReduceMotion,
	showArrow,
}: StartMappingLinkContentProps) {
	const { pending } = useLinkStatus();
	const isPending = pending || optimisticPending;

	return (
		<>
			{isPending ? (
				<span
					aria-hidden='true'
					className={cn(
						'pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5 overflow-hidden bg-primary-500/20',
						progressBarClassName
					)}
					data-testid='start-mapping-progress'
				>
					<span
						className={cn(
							'absolute inset-0 bg-gradient-to-r from-primary-400/0 via-primary-300/90 to-primary-400/0',
							shouldReduceMotion ? 'opacity-100' : 'animate-pulse'
						)}
					/>
				</span>
			) : null}

			<span className='inline-flex items-center justify-center gap-2'>
				<span>{isPending ? loadingLabel : idleLabel}</span>
				{isPending ? (
					<Loader2 aria-hidden='true' className='h-4 w-4 animate-spin' />
				) : showArrow ? (
					<ArrowRight aria-hidden='true' className={arrowClassName} />
				) : null}
			</span>
			{isPending ? (
				<span aria-live='polite' className='sr-only'>
					Navigation in progress.
				</span>
			) : null}
		</>
	);
}

export function StartMappingLink({
	arrowClassName = 'h-4 w-4 transition-transform duration-200',
	className,
	idleLabel = 'Start Mapping',
	loadingLabel = 'Opening...',
	progressBarClassName,
	showArrow = false,
	onNavigateStart,
}: StartMappingLinkProps) {
	const shouldReduceMotion = useReducedMotion() ?? false;
	const [optimisticPending, setOptimisticPending] = useState(false);
	const didFireNavigateStartRef = useRef(false);

	const startPendingFeedback = useCallback(
		(notifyNavigationStart: boolean) => {
			setOptimisticPending(true);

			if (notifyNavigationStart && !didFireNavigateStartRef.current) {
				didFireNavigateStartRef.current = true;
				onNavigateStart?.();
			}
		},
		[onNavigateStart]
	);

	useEffect(() => {
		if (!optimisticPending) {
			didFireNavigateStartRef.current = false;
			return;
		}

		const timeoutId = window.setTimeout(() => {
			didFireNavigateStartRef.current = false;
			setOptimisticPending(false);
		}, OPTIMISTIC_PENDING_RESET_MS);

		return () => window.clearTimeout(timeoutId);
	}, [optimisticPending]);

	const handlePointerDown = useCallback(
		(event: PointerEvent<HTMLAnchorElement>) => {
			if (event.defaultPrevented || !isActivationPointer(event)) {
				return;
			}

			startPendingFeedback(false);
		},
		[startPendingFeedback]
	);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLAnchorElement>) => {
			if (event.defaultPrevented || !isActivationKey(event)) {
				return;
			}

			startPendingFeedback(true);
		},
		[startPendingFeedback]
	);

	const handleClick = useCallback(
		(event: MouseEvent<HTMLAnchorElement>) => {
			if (event.defaultPrevented || !isActivationClick(event)) {
				return;
			}

			startPendingFeedback(true);
		},
		[startPendingFeedback]
	);

	return (
		<Link
			href='/dashboard'
			className={className}
			onPointerDown={handlePointerDown}
			onKeyDown={handleKeyDown}
			onClick={handleClick}
			onNavigate={() => startPendingFeedback(true)}
		>
			<StartMappingLinkContent
				arrowClassName={arrowClassName}
				idleLabel={idleLabel}
				loadingLabel={loadingLabel}
				optimisticPending={optimisticPending}
				progressBarClassName={progressBarClassName}
				shouldReduceMotion={shouldReduceMotion}
				showArrow={showArrow}
			/>
		</Link>
	);
}
