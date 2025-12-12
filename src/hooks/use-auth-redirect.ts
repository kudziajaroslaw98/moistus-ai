import useAppStore from '@/store/mind-map-store';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

interface UseAuthRedirectOptions {
	/** Block anonymous users and redirect them to sign-in. Default: false */
	blockAnonymous?: boolean;
	/** Optional message to display on sign-in page */
	redirectMessage?: string;
}

export function useAuthRedirect(options: UseAuthRedirectOptions = {}) {
	const { blockAnonymous = false, redirectMessage } = options;
	const router = useRouter();
	const pathname = usePathname();
	const [isChecking, setIsChecking] = useState(true);

	const { currentUser, userProfile, getCurrentUser } = useAppStore(
		useShallow((state) => ({
			currentUser: state.currentUser,
			userProfile: state.userProfile,
			getCurrentUser: state.getCurrentUser,
		}))
	);

	useEffect(() => {
		const checkAuth = async () => {
			let user = currentUser;

			// If no user in store, try to fetch from Supabase
			if (!user) {
				try {
					user = await getCurrentUser();
				} catch (error) {
					console.error('Auth check failed:', error);
					// On error, redirect to sign-in
					const params = new URLSearchParams();
					params.set('redirectedFrom', pathname);
					router.replace(`/auth/sign-in?${params.toString()}`);
					return;
				}
			}

			// No user at all - redirect to sign-in
			if (!user) {
				const params = new URLSearchParams();
				params.set('redirectedFrom', pathname);
				router.replace(`/auth/sign-in?${params.toString()}`);
				return;
			}

			// User exists - check if anonymous blocking is needed
			if (blockAnonymous) {
				// Get fresh profile from store (generated after getCurrentUser)
				const profile = useAppStore.getState().userProfile;

				if (profile?.isAnonymous) {
					const params = new URLSearchParams();
					params.set('redirectedFrom', pathname);
					if (redirectMessage) {
						params.set('message', redirectMessage);
					}
					router.replace(`/auth/sign-in?${params.toString()}`);
					return;
				}
			}

			// User is authenticated and (if required) not anonymous
			setIsChecking(false);
		};

		checkAuth();
	}, [
		currentUser,
		userProfile,
		getCurrentUser,
		router,
		pathname,
		blockAnonymous,
		redirectMessage,
	]);

	return {
		isChecking,
		isAuthenticated: !!currentUser,
		isAnonymous: userProfile?.isAnonymous ?? false,
	};
}
