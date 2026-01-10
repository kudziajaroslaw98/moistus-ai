'use client';

import { UpgradeAnonymousPrompt } from '@/components/auth/upgrade-anonymous';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/ui/user-avatar';
import { getSharedSupabaseClient } from '@/helpers/supabase/shared-client';
import useAppStore from '@/store/mind-map-store';
import { PublicUserProfile } from '@/types/user-profile-types';
import {
	ChevronDown,
	CreditCard,
	LogOut,
	RefreshCw,
	Settings,
	Sparkles,
	User,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { mutate } from 'swr';
import { useShallow } from 'zustand/react/shallow';

interface UserMenuProps {
	user: (PublicUserProfile & { email?: string; is_anonymous?: boolean }) | null;
	showBackToDashboard?: boolean;
	onOpenSettings?: (tab: 'settings' | 'billing') => void;
}

// Use shared Supabase client
const supabase = getSharedSupabaseClient();

export function UserMenu({
	user,
	showBackToDashboard = false,
	onOpenSettings,
}: UserMenuProps) {
	const router = useRouter();
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [showUpgradeAnonymous, setShowUpgradeAnonymous] = useState(false);

	// Store actions
	const {
		resetOnboarding,
		setOnboardingStep,
		setShowOnboarding,
		isProUser,
		resetStore,
	} = useAppStore(
		useShallow((state) => ({
			resetOnboarding: state.resetOnboarding,
			setOnboardingStep: state.setOnboardingStep,
			setShowOnboarding: state.setShowOnboarding,
			isProUser: state.isProUser,
			resetStore: state.reset,
		}))
	);

	const handleRestartOnboarding = useCallback(() => {
		resetOnboarding();
		setOnboardingStep(0);
		setShowOnboarding(true);
	}, [resetOnboarding, setOnboardingStep, setShowOnboarding]);

	const handleUpgradeToPro = useCallback(() => {
		setOnboardingStep(2); // Pricing step
		setShowOnboarding(true);
	}, [setOnboardingStep, setShowOnboarding]);

	// Handle logout
	const handleLogout = useCallback(async () => {
		if (isLoggingOut) return;

		setIsLoggingOut(true);

		try {
			// Sign out from Supabase
			const { error: signOutError } = await supabase.auth.signOut();

			if (signOutError) {
				console.error('Sign out error:', signOutError);
			}
		} catch (err) {
			console.error('Logout error:', err);
		} finally {
			// Always clear state and redirect
			resetStore();

			// Clear SWR cache
			await mutate(() => true, undefined, { revalidate: false });

			router.push('/');
			setIsLoggingOut(false);
		}
	}, [isLoggingOut, router, resetStore]);

	// Display info
	const name = user?.display_name || user?.full_name || 'User';
	const isAnonymous = user?.is_anonymous;
	const subtitle = isAnonymous
		? 'Anonymous User'
		: user?.email || 'Registered User';

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					className='flex items-center space-x-3 hover:bg-zinc-800 focus:bg-zinc-800'
					disabled={isLoggingOut}
					variant='ghost'
				>
					{/* User Avatar */}
					<UserAvatar className='size-6' size='md' user={user} />

					{/* User Info - Hidden on mobile, visible on larger screens if not in compact mode */}
					<div className='hidden sm:block text-left'>
						<div className='text-sm font-medium text-white'>{name}</div>
					</div>

					{/* Chevron */}
					<ChevronDown className='h-4 w-4 text-zinc-400' />
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent
				align='end'
				className='w-56 bg-zinc-900 border-zinc-700'
			>
				{/* User Info Header */}
				<div className='flex gap-4 items-center px-3 py-2'>
					<UserAvatar className='size-10' size='md' user={user} />

					<div>
						<div className='text-sm font-medium text-white'>{name}</div>

						<div className='text-xs text-zinc-400'>{subtitle}</div>

						{isAnonymous && (
							<div className='mt-1 text-xs text-amber-400'>
								⚠️ Anonymous account
							</div>
						)}
					</div>
				</div>

				<DropdownMenuSeparator className='bg-zinc-700' />

				{/* Menu Items */}
				<DropdownMenuItem
					className='cursor-pointer text-zinc-300 focus:bg-zinc-800 focus:text-white'
					onClick={() => onOpenSettings?.('settings')}
				>
					<Settings className='mr-2 h-4 w-4' />
					Settings
				</DropdownMenuItem>

				<DropdownMenuItem
					className='cursor-pointer text-zinc-300 focus:bg-zinc-800 focus:text-white'
					onClick={() => onOpenSettings?.('billing')}
				>
					<CreditCard className='mr-2 h-4 w-4' />
					Billing
				</DropdownMenuItem>

				{isAnonymous && (
					<>
						<DropdownMenuSeparator className='bg-zinc-700' />

						<DropdownMenuItem
							className='cursor-pointer text-blue-400 focus:bg-zinc-800 focus:text-blue-300'
							onClick={() => setShowUpgradeAnonymous(true)}
						>
							<User className='mr-2 h-4 w-4' />
							Upgrade Account
						</DropdownMenuItem>
					</>
				)}

				{!isProUser() && !isAnonymous && (
					<DropdownMenuItem
						className='cursor-pointer text-amber-400 focus:bg-zinc-800 focus:text-amber-300'
						onClick={handleUpgradeToPro}
					>
						<Sparkles className='mr-2 h-4 w-4' />
						Upgrade to Pro
					</DropdownMenuItem>
				)}

				{!isProUser() && (
					<>
						<DropdownMenuSeparator className='bg-zinc-700' />

						<DropdownMenuItem
							className='cursor-pointer text-zinc-300 focus:bg-zinc-800 focus:text-white'
							onClick={handleRestartOnboarding}
						>
							<RefreshCw className='mr-2 h-4 w-4' />
							Restart Onboarding
						</DropdownMenuItem>
					</>
				)}

				<DropdownMenuSeparator className='bg-zinc-700' />

				{/* Logout */}
				<DropdownMenuItem
					className='cursor-pointer text-red-400 focus:bg-zinc-800 focus:text-red-300'
					disabled={isLoggingOut}
					onClick={handleLogout}
				>
					<LogOut className='mr-2 h-4 w-4' />

					{isLoggingOut ? 'Signing out...' : 'Sign out'}
				</DropdownMenuItem>
			</DropdownMenuContent>

			{/* Upgrade Anonymous Modal */}
			{showUpgradeAnonymous && (
				<UpgradeAnonymousPrompt
					isAnonymous={true}
					userDisplayName={user?.display_name || user?.full_name}
					onDismiss={() => setShowUpgradeAnonymous(false)}
					onUpgradeSuccess={() => {
						// Refresh the page to update user state
						router.refresh();
					}}
					autoShowDelay={0} // Show immediately when triggered from menu
				/>
			)}
		</DropdownMenu>
	);
}
