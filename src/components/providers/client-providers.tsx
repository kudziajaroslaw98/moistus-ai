'use client';

import { OnboardingModal } from '@/components/onboarding/onboarding-modal';
import useAppStore from '@/store/mind-map-store';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

export function ClientProviders({ children }: { children: React.ReactNode }) {
	const {
		fetchUserSubscription,
		fetchAvailablePlans,
		shouldShowOnboarding,
		setShowOnboarding,
	} = useAppStore(
		useShallow((state) => ({
			fetchUserSubscription: state.fetchUserSubscription,
			fetchAvailablePlans: state.fetchAvailablePlans,
			shouldShowOnboarding: state.shouldShowOnboarding,
			setShowOnboarding: state.setShowOnboarding,
		}))
	);

	// Initialize subscription data on mount
	useEffect(() => {
		const initializeSubscriptions = async () => {
			try {
				// Fetch available plans first
				// await fetchAvailablePlans();
				// Then fetch user's current subscription
				// await fetchUserSubscription();
				setShowOnboarding(shouldShowOnboarding());
			} catch (error) {
				console.error('Error initializing subscriptions:', error);
			}
		};

		initializeSubscriptions();
	}, [fetchAvailablePlans, fetchUserSubscription]);

	return (
		<>
			{children}

			<OnboardingModal />
		</>
	);
}
