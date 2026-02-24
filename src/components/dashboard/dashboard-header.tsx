'use client';

import { UserMenu } from '@/components/common/user-menu';
import useAppStore from '@/store/mind-map-store';
import { useEffect } from 'react';
import { useShallow } from 'zustand/shallow';

interface DashboardHeaderProps {
	className?: string;
	onOpenSettings?: (tab: 'account' | 'billing') => void;
}

export function DashboardHeader({
	className = '',
	onOpenSettings,
}: DashboardHeaderProps) {
	const {
		userProfile,
		isLoadingProfile,
		profileError,
		loadUserProfile,
		isLoggingOut,
	} = useAppStore(
		useShallow((state) => ({
			userProfile: state.userProfile,
			isLoadingProfile: state.isLoadingProfile,
			profileError: state.profileError,
			loadUserProfile: state.loadUserProfile,
			isLoggingOut: state.isLoggingOut,
		}))
	);

	// Load user profile on mount if not already loaded
	// Don't retry if there's already an error to prevent infinite loops
	// Don't load during logout to prevent race condition causing toast spam
	useEffect(() => {
		if (!userProfile && !isLoadingProfile && !profileError && !isLoggingOut) {
			loadUserProfile();
		}
	}, [
		userProfile,
		isLoadingProfile,
		profileError,
		loadUserProfile,
		isLoggingOut,
	]);

	// Loading state
	if (isLoadingProfile) {
		return (
			<header
				className={`border-b h-14 border-zinc-800 bg-zinc-900/50 ${className}`}
			>
				<div className='flex h-14 items-center justify-between px-6'>
					<div className='flex items-center space-x-4'>
						<h1 className='text-xl font-semibold text-white'>Dashboard</h1>
					</div>

					<div className='flex items-center space-x-3'>
						<div className='h-8 w-8 animate-pulse rounded-full bg-zinc-700'></div>

						<div className='h-4 w-24 animate-pulse rounded bg-zinc-700'></div>
					</div>
				</div>
			</header>
		);
	}

	// Error state
	if (profileError) {
		return (
			<header
				className={`border-b h-14 border-zinc-800 bg-zinc-900/50 ${className}`}
			>
				<div className='flex h-14 items-center justify-between px-6'>
					<div className='flex items-center space-x-4'>
						<h1 className='text-xl font-semibold text-white'>Dashboard</h1>
					</div>

					<div className='text-sm text-red-400'>Error: {profileError}</div>
				</div>
			</header>
		);
	}

	// Guard: userProfile is null but no error (edge case - show minimal fallback)
	if (!userProfile) {
		return (
			<header
				className={`border-b h-14 border-zinc-800 bg-zinc-900/50 ${className}`}
			>
				<div className='flex h-14 items-center justify-between px-6'>
					<div className='flex items-center space-x-4'>
						<h1 className='text-xl font-semibold text-white'>Dashboard</h1>
					</div>

					<div className='flex items-center space-x-3'>
						<div className='h-8 w-8 rounded-full bg-zinc-700'></div>
					</div>
				</div>
			</header>
		);
	}

	return (
		<header
			className={`border-b h-14 border-zinc-800 bg-zinc-900/50 ${className}`}
		>
			<div className='flex h-14 items-center justify-between px-6'>
				{/* Logo/Title */}
				<div className='flex items-center space-x-4'>
					<h1 className='text-xl font-semibold text-white'>Dashboard</h1>
				</div>

				{/* User Menu */}
				<div className='flex items-center space-x-4'>
					<UserMenu user={userProfile} onOpenSettings={onOpenSettings} />
				</div>
			</div>
		</header>
	);
}
