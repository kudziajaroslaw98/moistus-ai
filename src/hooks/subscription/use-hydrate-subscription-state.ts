'use client';

import type { SubscriptionHydrationState } from '@/helpers/subscription/subscription-hydration';
import useAppStore from '@/store/mind-map-store';
import { useRef } from 'react';

export function useHydrateSubscriptionState(
	initialSubscriptionState: SubscriptionHydrationState
) {
	const appliedStateKeyRef = useRef<string | null>(null);
	const nextStateKey = JSON.stringify(initialSubscriptionState);

	if (appliedStateKeyRef.current !== nextStateKey) {
		useAppStore.getState().hydrateSubscriptionState(initialSubscriptionState);
		appliedStateKeyRef.current = nextStateKey;
	}
}
