'use client';

import { OnboardingModal } from '@/components/onboarding/onboarding-modal';
import useAppStore from '@/store/mind-map-store';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

export function ClientProviders({ children }: { children: React.ReactNode }) {
	const { fetchUserSubscription, fetchAvailablePlans, initializeOnboarding } =
		useAppStore(
			useShallow((state) => ({
				fetchUserSubscription: state.fetchUserSubscription,
				fetchAvailablePlans: state.fetchAvailablePlans,
				initializeOnboarding: state.initializeOnboarding,
			}))
		);

	// Initialize subscription data and onboarding on mount
	useEffect(() => {
		const initialize = async () => {
			try {
				// Fetch available plans first
				await fetchAvailablePlans();
				// Then fetch user's current subscription
				await fetchUserSubscription();
				// Finally, check if we should show onboarding
				await initializeOnboarding();
			} catch (error) {
				console.error('Error initializing:', error);
			}
		};

		initialize();
	}, [fetchAvailablePlans, fetchUserSubscription, initializeOnboarding]);

	return (
		<>
			{children}

			<OnboardingModal />
		</>
	);
}
