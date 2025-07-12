'use client';

import useAppStore from '@/store/mind-map-store';
import { useShallow } from 'zustand/shallow';

export function SnapLines() {
	const { snapLines } = useAppStore(
		useShallow((state) => ({
			snapLines: state.snapLines,
		}))
	);

	if (snapLines.length === 0) {
		return null;
	}

	return (
		<div className='absolute top-0 left-0 w-full h-full pointer-events-none z-50'>
			{snapLines.map((line, index) => (
				<div
					key={index}
					className='absolute bg-red-500'
					style={{
						...(line.type === 'vertical'
							? { left: line.x, top: 0, width: '1px', height: '100%' }
							: { top: line.y, left: 0, height: '1px', width: '100%' }),
					}}
				/>
			))}
		</div>
	);
}
