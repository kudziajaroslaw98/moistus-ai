import type { ReactNode } from 'react';

export const EDGE_GREY = '#6c757d';
export const EDGE_AMBER = '#f59e0b';

interface EdgeLayerProps {
	width: number;
	height: number;
	/** Static ids, one per scene, because several scenes share a page. */
	markerId: string;
	suggestionMarkerId?: string;
	children: ReactNode;
}

function ArrowMarker({ id, color }: { id: string; color: string }) {
	return (
		<marker
			id={id}
			markerHeight={16}
			markerUnits='userSpaceOnUse'
			markerWidth={16}
			orient='auto'
			refX={0}
			refY={0}
			viewBox='-10 -10 20 20'
		>
			<polyline
				fill={color}
				points='-5,-4 0,0 -5,4 -5,-4'
				stroke={color}
				strokeLinejoin='round'
				strokeWidth={2}
			/>
		</marker>
	);
}

/** SVG layer for edges: grey 2px arrowed paths, the app's default edge style. */
export function EdgeLayer({
	width,
	height,
	markerId,
	suggestionMarkerId,
	children,
}: EdgeLayerProps) {
	return (
		<svg
			aria-hidden='true'
			className='absolute inset-0 overflow-visible'
			fill='none'
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			width={width}
		>
			<defs>
				<ArrowMarker color={EDGE_GREY} id={markerId} />

				{suggestionMarkerId ? (
					<ArrowMarker color={EDGE_AMBER} id={suggestionMarkerId} />
				) : null}
			</defs>

			{children}
		</svg>
	);
}
