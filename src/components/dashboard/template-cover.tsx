import { cn } from '@/utils/cn';
import type { LucideIcon } from 'lucide-react';
import { useId } from 'react';

// Same trailing echoes as MapCover, back to front; the last one is the icon.
export const TEMPLATE_COVER_ECHOES = [
	{ dx: 30, dy: -22, opacity: 0.12 },
	{ dx: 20, dy: -14, opacity: 0.22 },
	{ dx: 10, dy: -7, opacity: 0.4 },
	{ dx: 0, dy: 0, opacity: 0.85 },
] as const;

// Icons are 24-unit glyphs drawn at 4.6x, sunk so their bottom is cut off.
const ICON_SCALE = 4.6;
const ICON_TOP = 24;
const STROKE_WIDTH = 1.2;

export function getEchoTransform(
	originX: number,
	echo: { dx: number; dy: number }
) {
	return `translate(${originX + echo.dx} ${ICON_TOP + echo.dy}) scale(${ICON_SCALE})`;
}

interface TemplateCoverProps {
	icon: LucideIcon;
	/** Accent hue (0-360); templates in one category share it. */
	hue: number;
	/** Tighter crop around the icon for small swatches. */
	compact?: boolean;
	className?: string;
}

/**
 * Decorative template cover: the template's icon as thin outlines that trail
 * off toward the top right, over the app's dot grid and a faint accent tint.
 * Sibling of MapCover (which echoes a letter).
 */
export function TemplateCover({
	icon: Icon,
	hue,
	compact,
	className,
}: TemplateCoverProps) {
	const patternId = useId();
	const stroke = `hsl(${hue} 80% 68%)`;
	const originX = compact ? 150 : 185;

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

				{TEMPLATE_COVER_ECHOES.map((echo) => (
					<g key={echo.dx} transform={getEchoTransform(originX, echo)}>
						<Icon
							size={24}
							stroke={stroke}
							strokeLinecap='round'
							strokeLinejoin='round'
							strokeOpacity={echo.opacity}
							// Stroke is set in icon units; the group scales it to 1.2.
							strokeWidth={STROKE_WIDTH / ICON_SCALE}
						/>
					</g>
				))}
			</svg>
		</div>
	);
}
