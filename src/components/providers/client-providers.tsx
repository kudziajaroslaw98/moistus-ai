'use client';

import { CookieNoticeBanner } from '@/components/legal/cookie-notice-banner';
import { initializeOfflineSync } from '@/lib/offline';
import useAppStore from '@/store/mind-map-store';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

export function ClientProviders({ children }: { children: React.ReactNode }) {
	const { fetchUserSubscription, fetchAvailablePlans, fetchUsageData } =
		useAppStore(
			useShallow((state) => ({
				fetchUserSubscription: state.fetchUserSubscription,
				fetchAvailablePlans: state.fetchAvailablePlans,
				fetchUsageData: state.fetchUsageData,
			}))
		);

	useEffect(() => {
		initializeOfflineSync();
	}, []);

	useEffect(() => {
		const initialize = async () => {
			try {
				await fetchAvailablePlans();
				await fetchUserSubscription();
				await fetchUsageData();
			} catch (error) {
				console.error('Error initializing:', error);
			}
		};

		initialize();
	}, [fetchAvailablePlans, fetchUserSubscription, fetchUsageData]);

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
			<CookieNoticeBanner />
		</>
	);
}
