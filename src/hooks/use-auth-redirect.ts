import useAppStore from '@/store/mind-map-store';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

export function useAuthRedirect() {
    const router = useRouter();
    const pathname = usePathname();
    const [isChecking, setIsChecking] = useState(true);

    const { currentUser, getCurrentUser } = useAppStore(
        useShallow((state) => ({
            currentUser: state.currentUser,
            getCurrentUser: state.getCurrentUser,
        }))
    );

    useEffect(() => {
        const checkAuth = async () => {
            // If we already have a user in the store, we're authenticated
            if (currentUser) {
                setIsChecking(false);
                return;
            }

            // Otherwise, try to fetch the user from Supabase
            try {
                const user = await getCurrentUser();

                if (!user) {
                    // No user found, redirect to sign-in
                    const params = new URLSearchParams();
                    params.set('redirectedFrom', pathname);
                    router.replace(`/auth/sign-in?${params.toString()}`);
                } else {
                    // User found, we're good
                    setIsChecking(false);
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                // On error, safer to redirect
                const params = new URLSearchParams();
                params.set('redirectedFrom', pathname);
                router.replace(`/auth/sign-in?${params.toString()}`);
            }
        };

        checkAuth();
    }, [currentUser, getCurrentUser, router, pathname]);

    return { isChecking, isAuthenticated: !!currentUser };
}
