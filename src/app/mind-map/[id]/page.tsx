'use client';

import { MindMapCanvas } from '@/components/mind-map-canvas';
import { ReactFlowProvider } from '@xyflow/react';

export default function MindMapPage() {
	return (
		<ReactFlowProvider>
			{/* <MindMapProvider> */}
			<MindMapCanvas />

			{/* </MindMapProvider> */}
		</ReactFlowProvider>
	);
}
