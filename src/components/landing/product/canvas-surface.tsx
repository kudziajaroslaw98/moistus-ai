import { cn } from '@/utils/cn';
import type { CSSProperties, ReactNode } from 'react';

interface CanvasSurfaceProps {
	children: ReactNode;
	label: string;
	className?: string;
}

/**
 * Static stand-in for the React Flow canvas: near-black ground with the same
 * dot grid as the app, dimmed so it reads as texture on a marketing page.
 * Callers set the dot spacing with `[background-size:...]` classes.
 */
export function CanvasSurface({
	children,
	label,
	className,
}: CanvasSurfaceProps) {
	return (
		<div
			aria-label={label}
			role='img'
			className={cn(
				'relative overflow-hidden rounded-[20px] border border-white/8 bg-[#040404] text-left',
				'[background-image:radial-gradient(circle,rgba(255,255,255,0.12)_0.6px,transparent_1px)] [background-size:16px_16px]',
				className
			)}
		>
			{children}
		</div>
	);
}

interface StageProps {
	children: ReactNode;
	width: number;
	height: number;
	className?: string;
}

/** Fixed-size coordinate space centred in the frame; callers scale it with classes. */
export function Stage({ children, width, height, className }: StageProps) {
	const style: CSSProperties = {
		width,
		height,
		marginLeft: -width / 2,
		marginTop: -height / 2,
	};

	return (
		<div
			className={cn('absolute left-1/2 top-1/2', className)}
			style={style}
		>
			{children}
		</div>
	);
}
