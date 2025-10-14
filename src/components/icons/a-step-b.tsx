import { ComponentPropsWithRef } from 'react';

const AStepBIcon = (props: ComponentPropsWithRef<'svg'>) => {
	return (
		<svg
			className={props.className}
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
			}}
		>
			<g
				id='a-step-b.svg'
				transform='matrix(0.05899,0,0,0.05899,32.086,31.459)'
			>
				<g transform='matrix(1,0,0,1,-540,-540)'>
					<g transform='matrix(47.2735,0,0,-47.2735,-27.2822,1107.28)'>
						<circle
							cx='18'
							cy='18'
							r='3'
							style={{
								fill: 'none',
								stroke: 'currentColor',
								strokeWidth: '2px',
							}}
						/>
					</g>

					<g transform='matrix(47.2735,0,0,-47.2735,-27.2822,1107.28)'>
						<circle
							cx='6'
							cy='6'
							r='3'
							style={{
								fill: 'none',
								stroke: 'currentColor',
								strokeWidth: '2px',
							}}
						/>
					</g>

					<g transform='matrix(-47.2735,0,0,47.2735,1108.75,-44.8118)'>
						<path
							d='M9.516,6L16,6L18,5.996L18,15'
							style={{
								fill: 'none',
								fillRule: 'nonzero',
								stroke: 'currentColor',
								strokeWidth: '2px',
								strokeLinejoin: 'miter',
							}}
						/>
					</g>
				</g>
			</g>
		</svg>
	);
};

AStepBIcon.displayName = 'AStepBIcon';

export default AStepBIcon;
