'use client';

import {
	deserializeUserSubscription,
	type SubscriptionHydrationState,
} from '@/helpers/subscription/subscription-hydration';
import useAppStore from '@/store/mind-map-store';
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
} from 'react';
import { useShallow } from 'zustand/react/shallow';

interface EffectiveSubscriptionState {
	currentSubscription: ReturnType<typeof deserializeUserSubscription>;
	hasResolvedSubscription: boolean;
	isLoadingSubscription: boolean;
}

interface SubscriptionHydrationContextValue {
	hydrationState: SubscriptionHydrationState;
	hydrationStateKey: string;
}

const SubscriptionHydrationContext =
	createContext<SubscriptionHydrationContextValue | null>(null);

const useHydrationSyncEffect =
	typeof globalThis === 'undefined' || !('document' in globalThis)
		? useEffect
		: useLayoutEffect;

export function SubscriptionHydrationProvider({
	children,
	initialSubscriptionState,
}: {
	children: ReactNode;
	initialSubscriptionState: SubscriptionHydrationState;
}) {
	const hydrateSubscriptionState = useAppStore(
		(state) => state.hydrateSubscriptionState
	);
	const appliedStateKeyRef = useRef<string | null>(null);
	const nextStateKey = useMemo(
		() => JSON.stringify(initialSubscriptionState),
		[initialSubscriptionState]
	);

	useHydrationSyncEffect(() => {
		if (appliedStateKeyRef.current === nextStateKey) {
			return;
		}

		hydrateSubscriptionState(initialSubscriptionState, nextStateKey);
		appliedStateKeyRef.current = nextStateKey;
	}, [hydrateSubscriptionState, initialSubscriptionState, nextStateKey]);

	return (
		<SubscriptionHydrationContext.Provider
			value={{
				hydrationState: initialSubscriptionState,
				hydrationStateKey: nextStateKey,
			}}
		>
			{children}
		</SubscriptionHydrationContext.Provider>
	);
}

export function useEffectiveSubscriptionState(): EffectiveSubscriptionState {
	const hydratedState = useContext(SubscriptionHydrationContext);
	const storeState = useAppStore(
		useShallow((state) => ({
			currentSubscription: state.currentSubscription,
			hasResolvedSubscription: state.hasResolvedSubscription,
			subscriptionHydrationStateKey: state.subscriptionHydrationStateKey,
			isLoadingSubscription: state.isLoadingSubscription,
		}))
	);
	const hydratedSubscription = useMemo(
		() =>
			deserializeUserSubscription(
				hydratedState?.hydrationState.currentSubscription ?? null
			),
		[hydratedState]
	);
	const shouldPreferHydratedState =
		hydratedState !== null &&
		storeState.subscriptionHydrationStateKey !==
			hydratedState.hydrationStateKey;

	if (!shouldPreferHydratedState) {
		return storeState;
	}

	return {
		currentSubscription: hydratedSubscription,
		hasResolvedSubscription:
			hydratedState.hydrationState.hasResolvedSubscription,
		isLoadingSubscription: false,
	};
}
