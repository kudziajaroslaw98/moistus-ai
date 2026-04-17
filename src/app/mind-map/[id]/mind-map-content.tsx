'use client';

import { MindMapCanvas } from '@/components/mind-map-canvas';
import type { SubscriptionHydrationState } from '@/helpers/subscription/subscription-hydration';
import { useHydrateSubscriptionState } from '@/hooks/subscription/use-hydrate-subscription-state';
import { ReactFlowProvider } from '@xyflow/react';

/**
 * Client component that renders the mind map canvas.
 * This is wrapped by a server component that handles access validation.
 */
interface MindMapContentProps {
	initialSubscriptionState: SubscriptionHydrationState;
}

export function MindMapContent({
	initialSubscriptionState,
}: MindMapContentProps) {
	useHydrateSubscriptionState(initialSubscriptionState);

	return (
		<ReactFlowProvider>
			<MindMapCanvas />
		</ReactFlowProvider>
	);
}
