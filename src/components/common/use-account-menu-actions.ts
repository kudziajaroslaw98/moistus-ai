'use client';

import { useEffectiveSubscriptionState } from '@/components/providers/subscription-hydration-provider';
import { isProSubscription } from '@/helpers/subscription/subscription-hydration';
import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import { runWithViewTransition } from '@/lib/view-transitions';
import useAppStore from '@/store/mind-map-store';
import type { PublicUserProfile } from '@/types/user-profile-types';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { mutate } from 'swr';
import { useShallow } from 'zustand/react/shallow';

export type AccountMenuUser =
	| (PublicUserProfile & { email?: string; is_anonymous?: boolean })
	| null;

const supabase = getSharedSupabaseClient();

export function useAccountMenuActions(user: AccountMenuUser) {
	const router = useRouter();
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [showUpgradeAnonymous, setShowUpgradeAnonymous] = useState(false);
	const { currentSubscription, hasResolvedSubscription } =
		useEffectiveSubscriptionState();
	const { restartOnboarding, setPopoverOpen, resetStore, setLoggingOut } =
		useAppStore(
			useShallow((state) => ({
				restartOnboarding: state.restartOnboarding,
				setPopoverOpen: state.setPopoverOpen,
				resetStore: state.reset,
				setLoggingOut: state.setLoggingOut,
			}))
		);

	const name = user?.display_name || user?.full_name || 'User';
	const isAnonymous = user?.is_anonymous ?? false;
	const subtitle = isAnonymous
		? 'Anonymous User'
		: user?.email || 'Registered User';
	const isPro = isProSubscription(currentSubscription);

	const handleRestartOnboarding = useCallback(() => {
		restartOnboarding();
	}, [restartOnboarding]);

	const handleUpgradeToPro = useCallback(() => {
		setPopoverOpen({ upgradeUser: true });
	}, [setPopoverOpen]);

	const openUpgradeAnonymousPrompt = useCallback(() => {
		setShowUpgradeAnonymous(true);
	}, []);

	const closeUpgradeAnonymousPrompt = useCallback(() => {
		setShowUpgradeAnonymous(false);
	}, []);

	const handleAnonymousUpgradeSuccess = useCallback(() => {
		setShowUpgradeAnonymous(false);
		router.refresh();
	}, [router]);

	const handleLogout = useCallback(async () => {
		if (isLoggingOut) return;

		setIsLoggingOut(true);
		setLoggingOut(true);

		try {
			const { error: signOutError } = await supabase.auth.signOut();
			if (signOutError) {
				console.error('Sign out error:', signOutError);
			}
		} catch (logoutError) {
			console.error('Logout error:', logoutError);
		} finally {
			resetStore();
			setLoggingOut(true);

			await mutate(() => true, undefined, { revalidate: false });

			runWithViewTransition(() => {
				router.push('/');
			});
			setIsLoggingOut(false);
		}
	}, [isLoggingOut, resetStore, router, setLoggingOut]);

	return {
		name,
		subtitle,
		isAnonymous,
		isPro,
		hasResolvedSubscription,
		isLoggingOut,
		showUpgradeAnonymous,
		handleRestartOnboarding,
		handleUpgradeToPro,
		handleLogout,
		openUpgradeAnonymousPrompt,
		closeUpgradeAnonymousPrompt,
		handleAnonymousUpgradeSuccess,
	};
}
