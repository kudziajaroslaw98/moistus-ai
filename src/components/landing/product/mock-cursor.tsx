import { MousePointer2 } from 'lucide-react';

interface MockCursorProps {
	x: number;
	y: number;
	color: string;
	name: string;
}

/** Collaborator cursor, same markup as the app's realtime Cursor component. */
export function MockCursor({ x, y, color, name }: MockCursorProps) {
	return (
		<div className='absolute' style={{ left: x, top: y }}>
			<MousePointer2 aria-hidden='true' color={color} fill={color} size={30} />

			<div
				className='mt-1 rounded px-2 py-1 text-center text-xs font-bold text-white'
				style={{ backgroundColor: color }}
			>
				{name}
			</div>
		</div>
	);
}
