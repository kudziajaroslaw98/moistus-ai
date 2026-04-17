'use client';

import { MindMapCanvas } from '@/components/mind-map-canvas';
import { ReactFlowProvider } from '@xyflow/react';

/**
 * Client component that renders the mind map canvas.
 * This is wrapped by a server component that handles access validation.
 */
export function MindMapContent() {
	return (
		<ReactFlowProvider>
			<MindMapCanvas />
		</ReactFlowProvider>
	);
}
