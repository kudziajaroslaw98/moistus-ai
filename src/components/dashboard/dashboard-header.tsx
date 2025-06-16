'use client';

import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/dashboard/dropdown-menu';
import { UserAvatar } from '@/components/ui/user-avatar';
import { createClient } from '@/helpers/supabase/client';
import { PublicUserProfile } from '@/types/user-profile-types';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface UserProfile extends PublicUserProfile {
	email?: string;
	is_anonymous: boolean;
	last_activity?: string;
	metadata?: any;
}

interface DashboardHeaderProps {
	className?: string;
}

export function DashboardHeader({ className = '' }: DashboardHeaderProps) {
	const [user, setUser] = useState<UserProfile | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();
	const supabase = createClient();

	// Fetch current user and profile
	const fetchUserProfile = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			// Get current auth user
			const { data: authData, error: authError } = await supabase.auth.getUser();
			
			if (authError || !authData.user) {
				throw new Error('No authenticated user found');
			}

			// Get user profile
			const { data: profile, error: profileError } = await supabase
				.from('user_profiles')
				.select('id, user_id, full_name, display_name, email, avatar_url, is_anonymous, created_at')
				.eq('user_id', authData.user.id)
				.single();

			if (profileError) {
				console.error('Failed to fetch user profile:', profileError);
				// Fallback to auth user data
				setUser({
					id: authData.user.id,
					user_id: authData.user.id,
					full_name: authData.user.email || 'User',
					display_name: authData.user.user_metadata?.display_name,
					email: authData.user.email,
					avatar_url: authData.user.user_metadata?.avatar_url,
					is_anonymous: authData.user.is_anonymous || false,
					created_at: authData.user.created_at || new Date().toISOString(),
				});
			} else {
				setUser(profile);
			}
		} catch (err) {
			console.error('Error fetching user profile:', err);
			setError(err instanceof Error ? err.message : 'Failed to load user profile');
		} finally {
			setIsLoading(false);
		}
	}, [supabase]);

	// Handle logout
	const handleLogout = useCallback(async () => {
		if (isLoggingOut) return;

		setIsLoggingOut(true);
		setError(null);

		try {
			// Sign out from Supabase
			const { error: signOutError } = await supabase.auth.signOut();
			
			if (signOutError) {
				throw new Error(signOutError.message);
			}

			// Clear user state
			setUser(null);

			// Redirect to home page
			router.push('/');
		} catch (err) {
			console.error('Logout error:', err);
			setError(err instanceof Error ? err.message : 'Failed to log out');
		} finally {
			setIsLoggingOut(false);
		}
	}, [isLoggingOut, supabase, router]);

	// Load user profile on mount
	useEffect(() => {
		fetchUserProfile();
	}, [fetchUserProfile]);

	// Generate user display info
	const getUserDisplayInfo = useCallback(() => {
		if (!user) return { name: 'Loading...', subtitle: '' };

		const name = user.display_name || user.full_name || 'User';
		const subtitle = user.is_anonymous 
			? 'Anonymous User' 
			: user.email || 'Registered User';

		return { name, subtitle };
	}, [user]);

	const { name, subtitle } = getUserDisplayInfo();

	// Loading state
	if (isLoading) {
		return (
			<header className={`border-b border-zinc-800 bg-zinc-900/50 ${className}`}>
				<div className="flex h-16 items-center justify-between px-6">
					<div className="flex items-center space-x-4">
						<h1 className="text-xl font-semibold text-white">Dashboard</h1>
					</div>
					<div className="flex items-center space-x-3">
						<div className="h-8 w-8 animate-pulse rounded-full bg-zinc-700"></div>
						<div className="h-4 w-24 animate-pulse rounded bg-zinc-700"></div>
					</div>
				</div>
			</header>
		);
	}

	// Error state
	if (error) {
		return (
			<header className={`border-b border-zinc-800 bg-zinc-900/50 ${className}`}>
				<div className="flex h-16 items-center justify-between px-6">
					<div className="flex items-center space-x-4">
						<h1 className="text-xl font-semibold text-white">Dashboard</h1>
					</div>
					<div className="text-sm text-red-400">
						Error: {error}
					</div>
				</div>
			</header>
		);
	}

	return (
		<header className={`border-b border-zinc-800 bg-zinc-900/50 ${className}`}>
			<div className="flex h-16 items-center justify-between px-6">
				{/* Logo/Title */}
				<div className="flex items-center space-x-4">
					<h1 className="text-xl font-semibold text-white">Dashboard</h1>
				</div>

				{/* User Menu */}
				<div className="flex items-center space-x-4">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								className="flex items-center space-x-3 hover:bg-zinc-800 focus:bg-zinc-800"
								disabled={isLoggingOut}
							>
								{/* User Avatar */}
								<UserAvatar 
									user={user}
									size="md"
									className="h-8 w-8"
								/>

								{/* User Info */}
								<div className="hidden sm:block text-left">
									<div className="text-sm font-medium text-white">
										{name}
									</div>
									<div className="text-xs text-zinc-400">
										{subtitle}
									</div>
								</div>

								{/* Chevron */}
								<ChevronDown className="h-4 w-4 text-zinc-400" />
							</Button>
						</DropdownMenuTrigger>

						<DropdownMenuContent 
							align="end" 
							className="w-56 bg-zinc-900 border-zinc-700"
						>
							{/* User Info Header */}
							<div className="px-3 py-2">
								<div className="text-sm font-medium text-white">
									{name}
								</div>
								<div className="text-xs text-zinc-400">
									{subtitle}
								</div>
								{user?.is_anonymous && (
									<div className="mt-1 text-xs text-amber-400">
										⚠️ Anonymous account
									</div>
								)}
							</div>

							<DropdownMenuSeparator className="bg-zinc-700" />

							{/* Menu Items */}
							<DropdownMenuItem 
								className="cursor-pointer text-zinc-300 focus:bg-zinc-800 focus:text-white"
								onClick={() => router.push('/dashboard/profile')}
							>
								<User className="mr-2 h-4 w-4" />
								Profile
							</DropdownMenuItem>

							<DropdownMenuItem 
								className="cursor-pointer text-zinc-300 focus:bg-zinc-800 focus:text-white"
								onClick={() => {/* Add settings navigation */}}
							>
								<Settings className="mr-2 h-4 w-4" />
								Settings
							</DropdownMenuItem>

							{user?.is_anonymous && (
								<>
									<DropdownMenuSeparator className="bg-zinc-700" />
									<DropdownMenuItem 
										className="cursor-pointer text-blue-400 focus:bg-zinc-800 focus:text-blue-300"
										onClick={() => {/* Add upgrade account functionality */}}
									>
										<User className="mr-2 h-4 w-4" />
										Upgrade Account
									</DropdownMenuItem>
								</>
							)}

							<DropdownMenuSeparator className="bg-zinc-700" />

							{/* Logout */}
							<DropdownMenuItem 
								className="cursor-pointer text-red-400 focus:bg-zinc-800 focus:text-red-300"
								onClick={handleLogout}
								disabled={isLoggingOut}
							>
								<LogOut className="mr-2 h-4 w-4" />
								{isLoggingOut ? 'Signing out...' : 'Sign out'}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</header>
	);
}