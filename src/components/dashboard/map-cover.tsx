import { getMapCoverSpec } from '@/helpers/dashboard/map-cover';
import { cn } from '@/utils/cn';
import { useId } from 'react';

// Echoes trail up and to the right, back to front; the last one is the letter.
// The letter starts at x=185 on purpose: wide ones run off the right edge.
const ECHOES = [
	{ dx: 30, dy: -22, opacity: 0.12 },
	{ dx: 20, dy: -14, opacity: 0.22 },
	{ dx: 10, dy: -7, opacity: 0.4 },
	{ dx: 0, dy: 0, opacity: 0.85 },
] as const;

interface MapCoverProps {
	/** Map or template id; picks the accent. */
	seed: string;
	title: string;
	/** Tighter crop around the letter for small swatches. */
	compact?: boolean;
	className?: string;
}

/**
 * Decorative card cover: the map's first letter as thin outlines that trail
 * off toward the top right, over the app's dot grid and a faint accent tint.
 */
export function MapCover({ seed, title, compact, className }: MapCoverProps) {
	const patternId = useId();
	const { letter, hue } = getMapCoverSpec(seed, title);
	const stroke = `hsl(${hue} 80% 68%)`;

	return (
		<div
			aria-hidden='true'
			className={cn('relative overflow-hidden bg-[#0b0c0f]', className)}
		>
			<svg
				className='absolute inset-0 size-full'
				preserveAspectRatio='xMidYMid slice'
				viewBox={compact ? '100 4 170 112' : '0 0 280 112'}
			>
				<defs>
					<pattern
						height='18'
						id={patternId}
						patternUnits='userSpaceOnUse'
						width='18'
					>
						<circle cx='1' cy='1' fill='#fff' fillOpacity='0.07' r='0.7' />
					</pattern>
				</defs>

				<rect fill={`url(#${patternId})`} height='112' width='280' />

				<rect
					fill={`hsl(${hue} 70% 50%)`}
					fillOpacity='0.05'
					height='112'
					width='280'
				/>

				{ECHOES.map((echo) => (
					<text
						fill='none'
						fontFamily='var(--font-lora), Georgia, serif'
						fontSize='150'
						fontWeight='600'
						key={echo.dx}
						stroke={stroke}
						strokeOpacity={echo.opacity}
						strokeWidth='1.2'
						x={185 + echo.dx}
						y={132 + echo.dy}
					>
						{letter}
					</text>
				))}
			</svg>
		</div>
	);
}
