'use client';

import {
	MAP_PREVIEW_HEIGHT,
	MAP_PREVIEW_WIDTH,
	type MapPreview as MapPreviewData,
} from '@/helpers/dashboard/map-preview';
import { cn } from '@/utils/cn';
import { motion, useReducedMotion } from 'motion/react';

const EASE_OUT_QUART = [0.165, 0.84, 0.44, 1] as const;

interface MapPreviewProps {
	preview?: MapPreviewData;
	isLoading?: boolean;
	thumbnailUrl?: string | null;
	className?: string;
}

/** Edge from the center of one rect to the center of another. */
function edgePath(
	from: MapPreviewData['nodes'][number],
	to: MapPreviewData['nodes'][number]
) {
	const x1 = from.x + from.w / 2;
	const y1 = from.y + from.h / 2;
	const x2 = to.x + to.w / 2;
	const y2 = to.y + to.h / 2;
	return `M${x1} ${y1}L${x2} ${y2}`;
}

/**
 * Dotted canvas with a scaled outline of the map's real layout. Shows the
 * map's own thumbnail image when one is set, and a quiet pulse while loading.
 */
export function MapPreview({
	preview,
	isLoading = false,
	thumbnailUrl,
	className,
}: MapPreviewProps) {
	const shouldReduceMotion = useReducedMotion() ?? false;
	const nodes = preview?.nodes ?? [];

	return (
		<div
			aria-hidden='true'
			className={cn(
				'relative flex items-center justify-center overflow-hidden bg-[#0b0c0f]',
				'bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1.3px)] bg-[size:18px_18px]',
				className
			)}
		>
			{thumbnailUrl ? (
				// eslint-disable-next-line @next/next/no-img-element -- user-set external URL; next/image would proxy any host
				<img
					alt=''
					className='size-full object-cover'
					loading='lazy'
					src={thumbnailUrl}
				/>
			) : nodes.length > 0 ? (
				<motion.svg
					animate={{ opacity: 1 }}
					className='h-[75%] w-[85%]'
					fill='none'
					initial={shouldReduceMotion ? false : { opacity: 0 }}
					transition={{ duration: 0.3, ease: EASE_OUT_QUART }}
					viewBox={`0 0 ${MAP_PREVIEW_WIDTH} ${MAP_PREVIEW_HEIGHT}`}
				>
					<g stroke='#6c757d' strokeWidth='1.2'>
						{preview?.edges.map(([from, to]) => (
							<path d={edgePath(nodes[from], nodes[to])} key={`${from}-${to}`} />
						))}
					</g>

					{nodes.map((rect, index) => (
						<rect
							fill={index === 0 ? '#2a2a2a' : '#1e1e1e'}
							height={rect.h}
							key={index}
							rx={Math.min(4, rect.h / 3)}
							width={rect.w}
							x={rect.x}
							y={rect.y}
							stroke={
								index === 0 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.22)'
							}
						/>
					))}
				</motion.svg>
			) : isLoading ? (
				<div className='h-4 w-14 rounded bg-white/[0.04] motion-safe:animate-pulse' />
			) : (
				// Empty map: one faint node outline.
				<div className='h-4 w-14 rounded border border-dashed border-white/15' />
			)}
		</div>
	);
}
