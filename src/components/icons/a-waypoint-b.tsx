import { ComponentPropsWithRef, forwardRef } from 'react';

const AWaypointBIcon = forwardRef<SVGSVGElement, ComponentPropsWithRef<'svg'>>(
	({ className, style, ...props }, ref) => {
		return (
			<svg
				ref={ref}
				className={className}
				height='100%'
				version='1.1'
				viewBox='0 0 64 64'
				width='100%'
				xmlns='http://www.w3.org/2000/svg'
				style={{
					fillRule: 'evenodd',
					clipRule: 'evenodd',
					strokeLinecap: 'round',
					strokeLinejoin: 'round',
					...style,
				}}
				{...props}
			>
				{/* Start circle (A) - bottom left */}
				<circle
					cx='10'
					cy='54'
					r='6'
					style={{
						fill: 'none',
						stroke: 'currentColor',
						strokeWidth: '3px',
					}}
				/>

				{/* End circle (B) - top right */}
				<circle
					cx='54'
					cy='10'
					r='6'
					style={{
						fill: 'none',
						stroke: 'currentColor',
						strokeWidth: '3px',
					}}
				/>

				{/* Path with waypoints - zigzag line */}
				<path
					d='M16 48 L26 38 L38 44 L48 16'
					style={{
						fill: 'none',
						stroke: 'currentColor',
						strokeWidth: '3px',
					}}
				/>

				{/* Waypoint 1 - small filled circle */}
				<circle
					cx='26'
					cy='38'
					r='4'
					style={{
						fill: 'currentColor',
						stroke: 'currentColor',
						strokeWidth: '1px',
					}}
				/>

				{/* Waypoint 2 - small filled circle */}
				<circle
					cx='38'
					cy='44'
					r='4'
					style={{
						fill: 'currentColor',
						stroke: 'currentColor',
						strokeWidth: '1px',
					}}
				/>
			</svg>
		);
	}
);

AWaypointBIcon.displayName = 'AWaypointBIcon';

export default AWaypointBIcon;
