'use client';

import { Cursor } from '@/components/ui/cursor';
import { useRealtimeCursors } from '@/hooks/realtime/use-realtime-cursor';
import type { ReactFlowInstance } from '@xyflow/react';
import { useViewport } from '@xyflow/react';

const THROTTLE_MS = 50;

export const RealtimeCursors = ({
	roomName,
	reactFlowInstance,
}: {
	roomName: string;
	reactFlowInstance?: ReactFlowInstance;
}) => {
	const { cursors } = useRealtimeCursors({
		roomName,
		throttleMs: THROTTLE_MS,
		reactFlowInstance,
	});

	// Get current viewport for zoom-aware cursor scaling
	const viewport = useViewport();

	return (
		<>
			{Object.keys(cursors).map((id) => {
				// Cap the cursor scale between 0.5x and 2x for readability

				return (
					<Cursor
						key={id}
						className='fixed transition-transform !z-[100] ease-in-out pointer-events-none'
						style={{
							transitionDuration: '20ms',
							transform: `translate(${cursors[id].position.x * viewport.zoom + viewport.x - 32}px, ${cursors[id].position.y * viewport.zoom + viewport.y - 32}px) scale(${viewport.zoom})`,
						}}
						color={cursors[id].color}
						name={cursors[id].user.name}
					/>
				);
			})}
		</>
	);
};
