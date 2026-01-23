'use client';

import { CookieNoticeBanner } from '@/components/legal/cookie-notice-banner';
import { OnboardingModal } from '@/components/onboarding/onboarding-modal';
import useAppStore from '@/store/mind-map-store';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

export function ClientProviders({ children }: { children: React.ReactNode }) {
	const {
		fetchUserSubscription,
		fetchAvailablePlans,
		fetchUsageData,
		initializeOnboarding,
	} = useAppStore(
		useShallow((state) => ({
			fetchUserSubscription: state.fetchUserSubscription,
			fetchAvailablePlans: state.fetchAvailablePlans,
			fetchUsageData: state.fetchUsageData,
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
				// Then fetch usage data for limit enforcement
				await fetchUsageData();
				// Finally, check if we should show onboarding
				await initializeOnboarding();
			} catch (error) {
				console.error('Error initializing:', error);
			}
		};

		initialize();
	}, [
		fetchAvailablePlans,
		fetchUserSubscription,
		fetchUsageData,
		initializeOnboarding,
	]);

	// Refetch usage data when window regains focus
	useEffect(() => {
		const handleFocus = () => {
			useAppStore.getState().fetchUsageData();
		};
		window.addEventListener('focus', handleFocus);
		return () => window.removeEventListener('focus', handleFocus);
	}, []);

	return (
		<>
			{children}

			<OnboardingModal />
			<CookieNoticeBanner />
		</>
	);
}
