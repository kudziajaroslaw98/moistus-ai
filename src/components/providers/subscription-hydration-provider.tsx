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

/** Copies a server snapshot into the store once per distinct snapshot; returns its key. */
function useApplySubscriptionSnapshot(
	subscriptionState: SubscriptionHydrationState
): string {
	const hydrateSubscriptionState = useAppStore(
		(state) => state.hydrateSubscriptionState
	);
	const appliedStateKeyRef = useRef<string | null>(null);
	const nextStateKey = useMemo(
		() => JSON.stringify(subscriptionState),
		[subscriptionState]
	);

	useHydrationSyncEffect(() => {
		if (appliedStateKeyRef.current === nextStateKey) {
			return;
		}

		hydrateSubscriptionState(subscriptionState, nextStateKey);
		appliedStateKeyRef.current = nextStateKey;
	}, [hydrateSubscriptionState, subscriptionState, nextStateKey]);

	return nextStateKey;
}

export function SubscriptionHydrationProvider({
	children,
	initialSubscriptionState,
}: {
	children: ReactNode;
	initialSubscriptionState: SubscriptionHydrationState;
}) {
	const nextStateKey = useApplySubscriptionSnapshot(initialSubscriptionState);

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

/**
 * Store-only variant for a snapshot that streams in after the UI has rendered (the
 * dashboard layout renders it inside Suspense). Until it arrives, readers see the
 * store's unresolved state, which every subscription consumer already handles.
 */
export function SubscriptionStateHydrator({
	subscriptionState,
}: {
	subscriptionState: SubscriptionHydrationState;
}) {
	useApplySubscriptionSnapshot(subscriptionState);
	return null;
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
